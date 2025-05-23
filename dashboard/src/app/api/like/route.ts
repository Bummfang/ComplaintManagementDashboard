// app/api/like/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

type AllowedStatusLob = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt"; // Beibehaltung deines Typs
const allowedStatusesLob: AllowedStatusLob[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];

const JWT_SECRET = process.env.JWT_SECRET;

// Interface für Datenbankzeilen der 'lob'-Tabelle
interface LobDbData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string | null; // In deiner Datei war es optional, hier auch
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedStatusLob | null; // Kann null sein in DB
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null; // Wird durch JOIN gefüllt
}

// Typ für die API-Antwort (frontend-freundlich)
interface LobApiResponse extends Omit<LobDbData, 'status'> {
    status: AllowedStatusLob; // Stellt sicher, dass Status immer gesetzt ist
}

// Mapping-Funktion
function mapLobDbRowToLobApiResponse(row: LobDbData): LobApiResponse {
    return {
        ...row,
        status: row.status || "Offen", // Default zu "Offen", falls DB-Status null/undefined
    };
}

export async function GET(request: NextRequest) {
    const initialRequestTimestamp = new Date().toISOString();

    if (!JWT_SECRET) {
        console.error(`[${initialRequestTimestamp}] FATAL for GET /api/like: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        // console.log(`[${initialRequestTimestamp}] GET /api/like: Token verifiziert für Benutzer: ${decoded.username} (ID: ${decoded.userId})`);
    } catch (error) {
        console.error(`[${initialRequestTimestamp}] GET /api/like: Ungültiges Token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const operationTimestamp = new Date().toISOString();

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('searchTerm');
    const emailSearchTerm = searchParams.get('emailSearchTerm');
    const idSearchTerm = searchParams.get('idSearchTerm');
    const assigneeSearchTerm = searchParams.get('assigneeSearchTerm');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // dateFilterTarget ist für Lob immer 'erstelltam'.

    let client: PoolClient | undefined;

    try {
        client = await getDbPool().connect();

        const conditions: string[] = [];
        const queryParams: (string | number | boolean | null)[] = []; 
        let paramIdx = 1;

        if (statusFilter && statusFilter.toLowerCase() !== 'alle') {
            conditions.push(`l.status = $${paramIdx++}`);
            queryParams.push(statusFilter);
        }

        if (searchTerm) {
            const searchTermPattern = `%${searchTerm}%`;
            const searchFields = ['l.name', 'l.email', 'l.betreff', 'l.beschreibung'];
            if (!isNaN(parseInt(searchTerm, 10))) {
                 searchFields.push(`l.id::text`);
            }
            const generalSearchClauses = searchFields.map(field => `${field} ILIKE $${paramIdx}`);
            conditions.push(`(${generalSearchClauses.join(' OR ')})`);
            queryParams.push(searchTermPattern);
            paramIdx++;
        }
        
        if (emailSearchTerm) {
            conditions.push(`l.email ILIKE $${paramIdx++}`);
            queryParams.push(`%${emailSearchTerm}%`);
        }

        if (idSearchTerm) {
            const idNum = parseInt(idSearchTerm, 10);
            if (!isNaN(idNum)) {
                conditions.push(`l.id = $${paramIdx++}`);
                queryParams.push(idNum);
            } else {
                conditions.push(`1 = 0`);
            }
        }

        if (assigneeSearchTerm) {
            conditions.push(`(u.name || ' ' || u.nachname) ILIKE $${paramIdx++}`);
            queryParams.push(`%${assigneeSearchTerm}%`);
        }
        
        if (startDate) {
            conditions.push(`l.erstelltam >= $${paramIdx++}`);
            queryParams.push(startDate);
        }
        if (endDate) {
            conditions.push(`l.erstelltam < ($${paramIdx++}::date + interval '1 day')`);
            queryParams.push(endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const totalCountQuery = `SELECT COUNT(DISTINCT l.id) AS total_items FROM "lob" l LEFT JOIN "users" u ON l.bearbeiter_id = u.id ${whereClause}`;
        const totalResult = await client.query(totalCountQuery, queryParams);
        const totalItems = parseInt(totalResult.rows[0].total_items, 10);

        const dataQueryParams = [...queryParams];
        dataQueryParams.push(limit);
        dataQueryParams.push(offset);
        
        const fieldsToSelect = `
            l.id, l.name, l.email, l.tel, l.betreff, l.beschreibung, 
            l.erstelltam, l.status, l.abgeschlossenam, l.bearbeiter_id,
            u.name || ' ' || u.nachname AS bearbeiter_name 
        `;

        const dataQuery = `
            SELECT ${fieldsToSelect}
            FROM "lob" l
            LEFT JOIN "users" u ON l.bearbeiter_id = u.id
            ${whereClause}
            ORDER BY l.erstelltam DESC
            LIMIT $${paramIdx++} OFFSET $${paramIdx++};
        `;

        const result = await client.query<LobDbData>(dataQuery, dataQueryParams);
        const responseData = result.rows.map(mapLobDbRowToLobApiResponse);

        console.log(`[${operationTimestamp}] GET /api/like - Seite: ${page}, Limit: ${limit}, Filter aktiv: ${conditions.length > 0}, Gefundene Items: ${result.rowCount}, Total Items (gefiltert): ${totalItems}`);

        return NextResponse.json({
            data: responseData,
            totalItems: totalItems,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            limit: limit,
        }, { status: 200 });

    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler im GET /api/like.';
        console.error(`[${errorTimestamp}] Fehler beim Abrufen von Lob (/api/like):`, errorMessage, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen von Lob.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

// Der PATCH-Handler bleibt wie in deiner Datei, ggf. mit Anpassung des zurückgegebenen Typs
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    // Dein bestehender PATCH-Code für /api/like
    // ... (kompletten PATCH-Handler hier einfügen) ...
    // Stelle sicher, dass die Typen `LobData` hier zu `LobDbData` passen,
    // und die zurückgegebene `itemToSend` (z.B. aus `finalItemResult.rows[0]`)
    // durch `mapLobDbRowToLobApiResponse` gemappt wird, bevor es gesendet wird.
    const requestTimestamp = new Date().toISOString();
    // console.log(`[${requestTimestamp}] API PATCH /api/like: Verarbeitungsversuch gestartet.`);

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL für PATCH /api/like: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    let decodedTokenInfo: { userId: number; username: string; isAdmin: boolean };

    try {
        decodedTokenInfo = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        // console.log(`[${requestTimestamp}] PATCH /api/like: Token verifiziert für Benutzer: ${decodedTokenInfo.username} (ID: ${decodedTokenInfo.userId})`);
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Ungültiges Token. Fehler: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatusFromClient: AllowedStatusLob | undefined; // Expliziter Typ
    let assignMeAsBearbeiter: boolean | undefined;

    try {
        requestBody = await request.json();
        itemId = parseInt(requestBody.id, 10);
        newStatusFromClient = requestBody.status;
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true;

        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        if (newStatusFromClient && !allowedStatusesLob.includes(newStatusFromClient)) {
            return NextResponse.json({ error: `Ungültiger Statuswert: ${newStatusFromClient}` }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Ungültiger JSON-Body.`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    // console.log(`[${requestTimestamp}] PATCH /api/like: Verarbeite Lob ID ${itemId} - Neuer Status: "${newStatusFromClient}", Bearbeiter zuweisen: ${assignMeAsBearbeiter}`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const currentItemResult = await client.query<LobDbData>( // Verwende LobDbData
            'SELECT id, status, bearbeiter_id, FROM lob WHERE id = $1 FOR UPDATE', // bearbeiter_name mitladen
            [itemId]
        );

        if (currentItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Lob-Eintrag nicht gefunden.' }, { status: 404 });
        }
        const currentItemDbState = currentItemResult.rows[0];

        const setClauses: string[] = [];
        const updateQueryParams: (string | number | boolean | null)[] = [];
        let paramIndex = 1;
        const actionResponsePayload: { action_required?: "relock_ui" } = {};
        
        if (assignMeAsBearbeiter && currentItemDbState.bearbeiter_id === null && decodedTokenInfo.userId) {
            setClauses.push(`bearbeiter_id = $${paramIndex++}`);
            updateQueryParams.push(decodedTokenInfo.userId);
             if (!newStatusFromClient && currentItemDbState.status !== "In Bearbeitung") {
                 if (!setClauses.some(c => c.startsWith('status'))) {
                    setClauses.push(`status = $${paramIndex++}`);
                    updateQueryParams.push('In Bearbeitung' as AllowedStatusLob);
                 }
            }
        }

        if (newStatusFromClient) {
            if (!setClauses.some(c => c.startsWith('status'))) {
                setClauses.push(`status = $${paramIndex++}`);
                updateQueryParams.push(newStatusFromClient);
            }
            if (newStatusFromClient === 'Gelöst' || newStatusFromClient === 'Abgelehnt') {
                if (!setClauses.some(c => c.startsWith('abgeschlossenam'))) {
                    setClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
                }
            } else if (newStatusFromClient === 'Offen') {
                setClauses.push(`abgeschlossenam = NULL`);
                if (currentItemDbState.status === 'Gelöst' || currentItemDbState.status === 'Abgelehnt') {
                     if (!assignMeAsBearbeiter && !setClauses.some(c => c.startsWith('bearbeiter_id = $'))) {
                         setClauses.push(`bearbeiter_id = NULL`);
                    }
                    actionResponsePayload.action_required = "relock_ui";
                }
            }
        }
        
        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE lob SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
            // console.log(`[${requestTimestamp}] PATCH /api/like (Lob): SQL Update: ${updateQueryText} -- Params: ${JSON.stringify(updateQueryParams)}`);
            const updateResult = await client.query<{id: number}>(updateQueryText, updateQueryParams);
            if (updateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Lob konnte nicht aktualisiert werden.' }, { status: 404 });
            }
        }
        
        const finalSelectQuery = `
            SELECT l.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM lob l
            LEFT JOIN users u ON l.bearbeiter_id = u.id
            WHERE l.id = $1;
        `;
        const finalItemResult = await client.query<LobDbData>(finalSelectQuery, [itemId]);

        if (finalItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Lob nach Update/Selektion nicht gefunden.' }, { status: 404 });
        }
        
        const rawItemFromDb = finalItemResult.rows[0];
        const mappedItem = mapLobDbRowToLobApiResponse(rawItemFromDb);
        const itemToSend = { ...mappedItem, ...actionResponsePayload };
        
        await client.query('COMMIT');
        
        // console.log(`[${requestTimestamp}] PATCH /api/like (Lob): Lob ID ${itemId} erfolgreich verarbeitet. Antwort: ${JSON.stringify(itemToSend)}`);
        return NextResponse.json(itemToSend, { status: 200 });

    } catch (error) {
        if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error(`[${requestTimestamp}] Fehler beim Rollback (Lob PATCH für ID ${itemId}):`, rbError); } }
        const errorMsg = error instanceof Error ? error.message : 'Interner Serverfehler.';
        console.error(`[${requestTimestamp}] PATCH /api/like (Lob) Fehler für ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}