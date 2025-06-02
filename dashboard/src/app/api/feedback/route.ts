// app/api/feedback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

type AllowedStatusAnregung = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatusesAnregung: AllowedStatusAnregung[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
const JWT_SECRET = process.env.JWT_SECRET;











interface AnregungDbData extends QueryResultRow { // Umbenannt zu AnregungDbData für Klarheit
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedStatusAnregung | null; // Status kann null sein in der DB
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null; // Wird durch JOIN gefüllt
}











// Typ für die API-Antwort (frontend-freundlich)
interface AnregungApiResponse extends Omit<AnregungDbData, 'status'> {
    status: AllowedStatusAnregung; // Stellt sicher, dass Status immer gesetzt ist
}









function mapAnregungDbRowToAnregungApiResponse(row: AnregungDbData): AnregungApiResponse {
    return {
        ...row,
        status: row.status || "Offen", // Default zu "Offen", falls DB-Status null/undefined
    };
}











export async function GET(request: NextRequest) {
    const initialRequestTimestamp = new Date().toISOString();

    if (!JWT_SECRET) {
        console.error(`[${initialRequestTimestamp}] FATAL for GET /api/feedback: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        // console.log(`[${initialRequestTimestamp}] GET /api/feedback: Token verifiziert für Benutzer: ${decoded.username} (ID: ${decoded.userId})`);
    } catch (error) {
        console.error(`[${initialRequestTimestamp}] GET /api/feedback: Ungültiges Token. Error: ${error instanceof Error ? error.message : String(error)}`);
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
    // dateFilterTarget ist für Anregungen immer 'erstelltam', da es kein 'v_datum' gibt.
    let client: PoolClient | undefined;









    try {
        client = await getDbPool().connect();

        const conditions: string[] = [];
        const queryParams: (string | number | boolean | null)[] = []; 
        let paramIdx = 1;

        if (statusFilter && statusFilter.toLowerCase() !== 'alle') {
            conditions.push(`a.status = $${paramIdx++}`);
            queryParams.push(statusFilter);
        }

        if (searchTerm) {
            const searchTermPattern = `%${searchTerm}%`;
            // Für Anregungen: name, email, betreff, beschreibung, id
            const searchFields = ['a.name', 'a.email', 'a.betreff', 'a.beschreibung'];
             if (!isNaN(parseInt(searchTerm, 10))) {
                 searchFields.push(`a.id::text`);
             }
            const generalSearchClauses = searchFields.map(field => `${field} ILIKE $${paramIdx}`);
            conditions.push(`(${generalSearchClauses.join(' OR ')})`);
            queryParams.push(searchTermPattern); // Einmal den Parameter für alle ILIKEs
            paramIdx++;
        }
        
        if (emailSearchTerm) {
            conditions.push(`a.email ILIKE $${paramIdx++}`);
            queryParams.push(`%${emailSearchTerm}%`);
        }

        if (idSearchTerm) {
            const idNum = parseInt(idSearchTerm, 10);
            if (!isNaN(idNum)) {
                conditions.push(`a.id = $${paramIdx++}`);
                queryParams.push(idNum);
            } else {
                conditions.push(`1 = 0`); // Ungültige ID, keine Ergebnisse
            }
        }

        if (assigneeSearchTerm) {
            conditions.push(`(u.name || ' ' || u.nachname) ILIKE $${paramIdx++}`);
            queryParams.push(`%${assigneeSearchTerm}%`);
        }
        
        // Datumsfilter (gilt immer für a.erstelltam bei Anregungen)
        if (startDate) {
            conditions.push(`a.erstelltam >= $${paramIdx++}`);
            queryParams.push(startDate);
        }
        if (endDate) {
            // Um das gesamte Enddatum einzuschließen (bis Ende des Tages)
            conditions.push(`a.erstelltam < ($${paramIdx++}::date + interval '1 day')`);
            queryParams.push(endDate);
        }









        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const totalCountQuery = `SELECT COUNT(DISTINCT a.id) AS total_items FROM "anregung" a LEFT JOIN "users" u ON a.bearbeiter_id = u.id ${whereClause}`;
        const totalResult = await client.query(totalCountQuery, queryParams);
        const totalItems = parseInt(totalResult.rows[0].total_items, 10);
        const dataQueryParams = [...queryParams]; // Kopiere Filter-Parameter
        dataQueryParams.push(limit);      // Parameter für LIMIT
        dataQueryParams.push(offset);     // Parameter für OFFSET
        const fieldsToSelect = `
            a.id, a.name, a.email, a.tel, a.betreff, a.beschreibung, 
            a.erstelltam, a.status, a.abgeschlossenam, a.bearbeiter_id,
            u.name || ' ' || u.nachname AS bearbeiter_name 
        `;






        const dataQuery = `
            SELECT ${fieldsToSelect}
            FROM "anregung" a
            LEFT JOIN "users" u ON a.bearbeiter_id = u.id
            ${whereClause}
            ORDER BY a.erstelltam DESC
            LIMIT $${paramIdx++} OFFSET $${paramIdx++};
        `;










        const result = await client.query<AnregungDbData>(dataQuery, dataQueryParams);
        const responseData = result.rows.map(mapAnregungDbRowToAnregungApiResponse);
        console.log(`[${operationTimestamp}] GET /api/feedback - Seite: ${page}, Limit: ${limit}, Filter aktiv: ${conditions.length > 0}, Gefundene Items: ${result.rowCount}, Total Items (gefiltert): ${totalItems}`);







        return NextResponse.json({
            data: responseData,
            totalItems: totalItems,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            limit: limit,
        }, { status: 200 });

    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler im GET /api/feedback.';
        console.error(`[${errorTimestamp}] Fehler beim Abrufen von Anregungen (/api/feedback):`, errorMessage, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen von Anregungen.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}











// Der PATCH-Handler bleibt wie in deiner Datei
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    // Dein bestehender PATCH-Code für /api/feedback
    // ... (kompletten PATCH-Handler hier einfügen) ...
    // Stelle sicher, dass die Typen `AnregungData` hier zu `AnregungDbData` passen,
    // und die zurückgegebene `itemToSend` (z.B. aus `finalItemResult.rows[0]`)
    // durch `mapAnregungDbRowToAnregungApiResponse` gemappt wird, bevor es gesendet wird,
    // wenn das Frontend immer die gemappte Struktur erwartet.
    // Für den Moment belassen wir den PATCH wie er war, der Fokus liegt auf GET.
    // Die Hauptsache ist, dass dein PATCH schon die Updates korrekt durchführt und das Item zurückgibt.
    // Du hattest schon: itemToSend = { ...finalItemResult.rows[0], ...actionResponsePayload };
    // Das ist gut. Ein Mapping wäre nur für Status-Defaulting relevant, wenn dein Frontend das braucht.
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API PATCH /api/feedback: Verarbeitungsversuch gestartet.`);









    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL für PATCH /api/feedback: JWT_SECRET nicht definiert.`);
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
        // console.log(`[${requestTimestamp}] PATCH /api/feedback: Token verifiziert für Benutzer: ${decodedTokenInfo.username} (ID: ${decodedTokenInfo.userId})`);
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/feedback: Ungültiges Token. Fehler: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }










    let requestBody;
    let itemId: number;
    let newStatusFromClient: AllowedStatusAnregung | undefined; // Expliziter Typ
    let assignMeAsBearbeiter: boolean | undefined;








    


    try {
        requestBody = await request.json();
        itemId = parseInt(requestBody.id, 10); // requestBody.id ist string oder number
        newStatusFromClient = requestBody.status;
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true;

        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        if (newStatusFromClient && !allowedStatusesAnregung.includes(newStatusFromClient)) {
            return NextResponse.json({ error: `Ungültiger Statuswert: ${newStatusFromClient}` }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/feedback: Ungültiger JSON-Body.`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }












    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const currentItemResult = await client.query<AnregungDbData>( // Verwende AnregungDbData
            'SELECT id, status, bearbeiter_id FROM anregung WHERE id = $1 FOR UPDATE', // bearbeiter_name ggf. mitladen
            [itemId]
        );

        if (currentItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Anregung nicht gefunden.' }, { status: 404 });
        }
        const currentItemDbState = currentItemResult.rows[0];

        const setClauses: string[] = [];
        const updateQueryParams: (string | number | boolean | null)[] = [];
        let paramIndex = 1;
        const actionResponsePayload: { action_required?: "relock_ui" } = {};
        
        if (assignMeAsBearbeiter && currentItemDbState.bearbeiter_id === null && decodedTokenInfo.userId) {
            setClauses.push(`bearbeiter_id = $${paramIndex++}`);
            updateQueryParams.push(decodedTokenInfo.userId);
            // Automatisch Status auf "In Bearbeitung" setzen, wenn nicht explizit anders vom Client gewünscht
            if (!newStatusFromClient && currentItemDbState.status !== "In Bearbeitung") {
                 if (!setClauses.some(c => c.startsWith('status'))) {
                    setClauses.push(`status = $${paramIndex++}`);
                    updateQueryParams.push('In Bearbeitung' as AllowedStatusAnregung);
                 }
            }
        }










        if (newStatusFromClient) {


            if (!setClauses.some(c => c.startsWith('status'))) { // Verhindere doppeltes Setzen des Status
                setClauses.push(`status = $${paramIndex++}`);
                updateQueryParams.push(newStatusFromClient);
            }


            if (newStatusFromClient === 'Gelöst' || newStatusFromClient === 'Abgelehnt') {


                 if (!setClauses.some(c => c.startsWith('abgeschlossenam'))) {
                    setClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
                 }


            } else if (newStatusFromClient === 'Offen') {


                setClauses.push(`abgeschlossenam = NULL`); // Sicherstellen, dass es entfernt wird


                if (currentItemDbState.status === 'Gelöst' || currentItemDbState.status === 'Abgelehnt') {
                    // Nur bearbeiter_id entfernen, wenn assign_me_as_bearbeiter nicht gleichzeitig true ist
                    if (!assignMeAsBearbeiter && !setClauses.some(c => c.startsWith('bearbeiter_id = $'))) {
                         setClauses.push(`bearbeiter_id = NULL`);
                    }
                    actionResponsePayload.action_required = "relock_ui";
                }
            }
        }
        










        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE anregung SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
            // console.log(`[${requestTimestamp}] PATCH /api/feedback (Anregung): SQL Update: ${updateQueryText} -- Params: ${JSON.stringify(updateQueryParams)}`);
            const updateResult = await client.query<{id: number}>(updateQueryText, updateQueryParams);
            if (updateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Anregung konnte nicht aktualisiert werden.' }, { status: 404 });
            }
        }
        









        const finalSelectQuery = `
            SELECT a.id, a.name, a.email, a.tel, a.betreff, a.beschreibung, 
                   a.erstelltam, a.status, a.abgeschlossenam, a.bearbeiter_id,
                   u.name || ' ' || u.nachname AS bearbeiter_name
            FROM anregung a
            LEFT JOIN users u ON a.bearbeiter_id = u.id
            WHERE a.id = $1;
        `;
        const finalItemResult = await client.query<AnregungDbData>(finalSelectQuery, [itemId]);












        if (finalItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Anregung nach Update/Selektion nicht gefunden.' }, { status: 404 });
        }










        const rawItemFromDb = finalItemResult.rows[0];
        const mappedItem = mapAnregungDbRowToAnregungApiResponse(rawItemFromDb); // Mappen für konsistente API-Antwort
        const itemToSend = { ...mappedItem, ...actionResponsePayload };
        await client.query('COMMIT');
        
        
        return NextResponse.json(itemToSend, { status: 200 });
      
        




        
        
    } catch (error) {
        if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error(`[${requestTimestamp}] Fehler beim Rollback (Anregung PATCH für ID ${itemId}):`, rbError); } }
        const errorMsg = error instanceof Error ? error.message : 'Interner Serverfehler.';
        console.error(`[${requestTimestamp}] PATCH /api/feedback (Anregung) Fehler für ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage.", details: errorMsg }, { status: 500 });




    } finally {
        if (client) client.release();
    }
}