// app/api/containt/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient, DatabaseError } from 'pg'; // DatabaseError hinzugefügt
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

export interface BeschwerdeData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string;
    linie?: string;
    erstelltam: string;
    status?: AllowedStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null; // Ist schon korrekt vorhanden!
    bearbeiter_name?: string | null;
}

type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
const JWT_SECRET = process.env.JWT_SECRET;

// GET Funktion bleibt wie von dir bereitgestellt (ist schon korrekt mit bearbeiter_id)
export async function GET(request: NextRequest) {
    if (!JWT_SECRET) {
        console.error(`FATAL for GET /api/containt: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[GET /api/containt] Token verified for user: ${decoded.username}`);
    } catch (error) {
        console.error(`[GET /api/containt] Invalid token:`, error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    const poolToUse = getDbPool();
    console.log(`API GET /api/containt: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
    b.id, b.name, b.email, b.tel, b.betreff, b.beschreibung,
    b.beschwerdegrund, b.datum, b.uhrzeit, b.haltestelle, b.linie, 
    b.erstelltam, b.status, b.abgeschlossenam, b.bearbeiter_id,
    u.name || ' ' || u.nachname AS bearbeiter_name 
    FROM
    "beschwerde" b
    LEFT JOIN
    "users" u ON b.bearbeiter_id = u.id
    ORDER BY
    b.erstelltam DESC;
        `;
        const result = await client.query<BeschwerdeData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Beschwerden (/api/containt):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}


// --- NEU ÜBERARBEITETE PATCH FUNKTION ---
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API PATCH /api/containt: Verarbeitungsversuch gestartet.`);

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL für PATCH /api/containt: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let decodedTokenInfo: { userId: number; username: string; isAdmin: boolean };
    try {
        decodedTokenInfo = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[${requestTimestamp}] PATCH /api/containt: Token verifiziert für Benutzer: ${decodedTokenInfo.username} (ID: ${decodedTokenInfo.userId})`);
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/containt: Ungültiges Token. Fehler: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatus | undefined;
    let assignMeAsBearbeiter: boolean | undefined;

    try {
        requestBody = await request.json();
        itemId = parseInt(requestBody.id, 10);
        newStatus = requestBody.status; // Kann undefined sein, wenn nur Bearbeiter zugewiesen wird
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true; // Explizit auf true prüfen

        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        if (newStatus && !allowedStatuses.includes(newStatus)) {
            return NextResponse.json({ error: 'Ungültiger oder fehlender Statuswert.' }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/containt: Ungültiger JSON-Body.`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`[${requestTimestamp}] PATCH /api/containt: Verarbeite Item ID ${itemId} - Neuer Status: "${newStatus}", Bearbeiter zuweisen: ${assignMeAsBearbeiter}`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN'); // Transaktion starten

        const currentItemResult = await client.query<BeschwerdeData>(
            'SELECT id, status, bearbeiter_id FROM beschwerde WHERE id = $1 FOR UPDATE', // id auch selektieren
            [itemId]
        );

        if (currentItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 });
        }
        const currentItemDbState = currentItemResult.rows[0];

        const setClauses: string[] = [];
        const updateQueryParams: any[] = [];
        let paramIndex = 1;
        let actionResponsePayload: { action_required?: "relock_ui" } = {};
        let bearbeiterWurdeNeuZugewiesen = false;

        if (assignMeAsBearbeiter && currentItemDbState.bearbeiter_id === null && decodedTokenInfo.userId) {
            setClauses.push(`bearbeiter_id = $${paramIndex++}`);
            updateQueryParams.push(decodedTokenInfo.userId);
            bearbeiterWurdeNeuZugewiesen = true; // Merken, dass hier eine Zuweisung stattgefunden hat
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
                    // Wenn Bearbeiter entfernt wird, wurde er nicht "neu zugewiesen" im Sinne des aktuellen Users
                    bearbeiterWurdeNeuZugewiesen = false;
                }
            }
        }

        let itemToSend = { ...currentItemDbState, ...actionResponsePayload }; // Fallback, falls kein Update

        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE beschwerde SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`; // Nur ID zurückgeben, da wir danach eh neu selektieren

            console.log(`[${requestTimestamp}] PATCH /api/containt (Beschwerde): SQL Update: ${updateQueryText} -- Params: ${JSON.stringify(updateQueryParams)}`);
            const updateResult = await client.query<{ id: number }>(updateQueryText, updateQueryParams);
            if (updateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Beschwerde konnte nicht aktualisiert werden (Reihe nicht gefunden nach Update).' }, { status: 404 });
            }
        }

        // Immer (nach Update oder auch wenn nur Zuweisung versucht wurde aber fehlschlug weil schon einer da war)
        // das Item mit dem potenziell neuen Bearbeiter-Namen holen
        const finalSelectQuery = `
            SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM beschwerde b
            LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `;
        const finalItemResult = await client.query<BeschwerdeData>(finalSelectQuery, [itemId]);

        if (finalItemResult.rows.length === 0) {
            // Sollte nicht passieren, wenn das Item existiert
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nach Update/Selektion nicht gefunden.' }, { status: 404 });
        }
        itemToSend = { ...finalItemResult.rows[0], ...actionResponsePayload };

        await client.query('COMMIT');

        console.log(`[${requestTimestamp}] PATCH /api/containt (Beschwerde): Item ID ${itemId} erfolgreich verarbeitet. Antwort: ${JSON.stringify(itemToSend)}`);
        return NextResponse.json(itemToSend, { status: 200 });

    } catch (error) {
        // ... (bestehende Fehlerbehandlung mit Rollback) ...
        if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error('Fehler beim Rollback (Beschwerde):', rbError); } }
        console.error(`[${requestTimestamp}] PATCH /api/containt (Beschwerde) Fehler für ID ${itemId}:`, error);
        // ... (Rest der Fehlerbehandlung)
        return NextResponse.json({ error: 'Interner Serverfehler', details: (error as Error).message }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}