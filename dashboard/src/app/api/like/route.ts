// src/app/api/like/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient} from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

type AllowedStatusLob = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatusesLob: AllowedStatusLob[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];

const JWT_SECRET = process.env.JWT_SECRET;

interface LobData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedStatusLob;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;
}

export async function GET(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();
    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for GET /api/like: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[${requestTimestamp}] GET /api/like: Token verifiziert für Benutzer: ${decoded.username} (ID: ${decoded.userId})`);
    } catch (error) {
        console.error(`[${requestTimestamp}] GET /api/like: Ungültiges Token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    const poolToUse = getDbPool();
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
                l.id, l.name, l.email, l.tel, l.betreff, l.beschreibung, 
                l.erstelltam, l.status, l.abgeschlossenam, l.bearbeiter_id,
                u.name || ' ' || u.nachname AS bearbeiter_name 
            FROM
                "lob" l
            LEFT JOIN
                "users" u ON l.bearbeiter_id = u.id
            ORDER BY
                l.erstelltam DESC;
        `;
        const result = await client.query<LobData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error(`[${requestTimestamp}] Fehler beim Abrufen von Lob (/api/like):`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Lob.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API PATCH /api/like: Verarbeitungsversuch gestartet.`);

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
        console.log(`[${requestTimestamp}] PATCH /api/like: Token verifiziert für Benutzer: ${decodedTokenInfo.username} (ID: ${decodedTokenInfo.userId})`);
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Ungültiges Token. Fehler: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatusLob | undefined;
    let assignMeAsBearbeiter: boolean | undefined;

    try {
        requestBody = await request.json();
        itemId = parseInt(requestBody.id, 10);
        newStatus = requestBody.status;
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true;

        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        if (newStatus && !allowedStatusesLob.includes(newStatus)) {
            return NextResponse.json({ error: 'Ungültiger oder fehlender Statuswert.' }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Ungültiger JSON-Body.`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`[${requestTimestamp}] PATCH /api/like: Verarbeite Lob ID ${itemId} - Neuer Status: "${newStatus}", Bearbeiter zuweisen: ${assignMeAsBearbeiter}`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const currentItemResult = await client.query<LobData>(
            'SELECT id, status, bearbeiter_id FROM lob WHERE id = $1 FOR UPDATE',
            [itemId]
        );

        if (currentItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Lob-Eintrag nicht gefunden.' }, { status: 404 });
        }
        const currentItemDbState = currentItemResult.rows[0];

        const setClauses: string[] = [];
        const updateQueryParams: (string | number | boolean | null)[] = []; // Specific type
        let paramIndex = 1;
        const actionResponsePayload: { action_required?: "relock_ui" } = {}; // Declared with const
        
        if (assignMeAsBearbeiter && currentItemDbState.bearbeiter_id === null && decodedTokenInfo.userId) {
            setClauses.push(`bearbeiter_id = $${paramIndex++}`);
            updateQueryParams.push(decodedTokenInfo.userId);
        }

        if (newStatus) {
            setClauses.push(`status = $${paramIndex++}`);
            updateQueryParams.push(newStatus);
            if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
                setClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
            } else if (newStatus === 'Offen') {
                setClauses.push(`abgeschlossenam = NULL`);
                if (currentItemDbState.status === 'Gelöst' || currentItemDbState.status === 'Abgelehnt') {
                    setClauses.push(`bearbeiter_id = NULL`);
                    actionResponsePayload.action_required = "relock_ui";
                }
            }
        }
        
        // itemToSend is declared with let because it's reassigned later
        let itemToSend: LobData & { action_required?: "relock_ui" } = {
            ...currentItemDbState,
            bearbeiter_name: currentItemDbState.bearbeiter_name || null, // Preserve existing name or set null
            ...actionResponsePayload
        };

        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE lob SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
            console.log(`[${requestTimestamp}] PATCH /api/like (Lob): SQL Update: ${updateQueryText} -- Params: ${JSON.stringify(updateQueryParams)}`);
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
        const finalItemResult = await client.query<LobData>(finalSelectQuery, [itemId]);

        if (finalItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Lob nach Update/Selektion nicht gefunden.' }, { status: 404 });
        }
        // Reassignment of itemToSend
        itemToSend = { ...finalItemResult.rows[0], ...actionResponsePayload };
        
        await client.query('COMMIT');
        
        console.log(`[${requestTimestamp}] PATCH /api/like (Lob): Lob ID ${itemId} erfolgreich verarbeitet. Antwort: ${JSON.stringify(itemToSend)}`);
        return NextResponse.json(itemToSend, { status: 200 });

    } catch (error) {
        if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error('Fehler beim Rollback (Lob):', rbError); } }
        console.error(`[${requestTimestamp}] PATCH /api/like (Lob) Fehler für ID ${itemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Interner Serverfehler';
        const errorDetails = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}