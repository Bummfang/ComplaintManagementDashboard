import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

// Typdefinitionen für Status (können bei Bedarf angepasst werden)
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
    status?: AllowedStatusLob;       // Hinzugefügt
    abgeschlossenam?: string | null; // Hinzugefügt
}

export async function GET(request: NextRequest) { // NextRequest für Header-Zugriff
    const requestTimestamp = new Date().toISOString();
    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for GET /api/like: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        // console.log(`[${requestTimestamp}] GET /api/like: Token verified for user: ${decoded.username}`);
    } catch (error) {
        console.error(`[${requestTimestamp}] GET /api/like: Invalid token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    const poolToUse = getDbPool();
    // console.log(`[${requestTimestamp}] API GET /api/like: Using database connection.`);
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam
            FROM
                "lob" 
            ORDER BY
                erstelltam DESC;
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
    console.log(`[${requestTimestamp}] API PATCH /api/like: Status update attempt.`);

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for PATCH /api/like: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[${requestTimestamp}] PATCH /api/like: Token verified for user: ${decoded.username}`);
        // Optional: Admin-Check, falls nur Admins den Status ändern dürfen
        // if (!decoded.isAdmin) {
        //     return NextResponse.json({ error: 'Zugriff verweigert.', details: 'Nur Administratoren dürfen den Status ändern.' }, { status: 403 });
        // }
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Invalid token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatusLob;

    try {
        requestBody = await request.json();
        const idFromBody = requestBody.id;
        newStatus = requestBody.status;

        if (typeof idFromBody !== 'number' || isNaN(idFromBody)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        itemId = idFromBody;

        if (!newStatus || !allowedStatusesLob.includes(newStatus)) {
            return NextResponse.json({ error: 'Ungültiger oder fehlender Statuswert.' }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/like: Invalid JSON body:`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`[${requestTimestamp}] API PATCH /api/like: Attempting to change status for ID ${itemId} to "${newStatus}"`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        let queryText: string;
        let queryParams: (string | number | null)[];

        if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
            queryText = `
                UPDATE "lob"
                SET status = $1, abgeschlossenam = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam;
            `;
            queryParams = [newStatus, itemId];
        } else { // Für "Offen", "In Bearbeitung" oder andere nicht-terminale Status
            queryText = `
                UPDATE "lob"
                SET status = $1, abgeschlossenam = NULL
                WHERE id = $2
                RETURNING id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam;
            `;
            queryParams = [newStatus, itemId];
        }
        
        const result = await client.query<LobData>(queryText, queryParams);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Lob-Eintrag nicht gefunden.' }, { status: 404 });
        }
        console.log(`[${requestTimestamp}] API PATCH /api/like: Status for Lob ID ${itemId} successfully changed to "${newStatus}".`);
        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error(`[${requestTimestamp}] API PATCH /api/like: Error updating status for Lob ID ${itemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren.';
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Lob-Status.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}