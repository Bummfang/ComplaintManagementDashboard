import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

// Typdefinitionen für Status
type AllowedStatusAnregung = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatusesAnregung: AllowedStatusAnregung[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];

const JWT_SECRET = process.env.JWT_SECRET;

interface AnregungData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedStatusAnregung;   // Hinzugefügt
    abgeschlossenam?: string | null;  // Hinzugefügt
}

export async function GET(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();
    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for GET /api/feedback: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        // console.log(`[${requestTimestamp}] GET /api/feedback: Token verified for user: ${decoded.username}`);
    } catch (error) {
        console.error(`[${requestTimestamp}] GET /api/feedback: Invalid token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }
    
    const poolToUse = getDbPool();
    // console.log(`[${requestTimestamp}] API GET /api/feedback: Using database connection.`);
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam
            FROM
                "anregung" 
            ORDER BY
                erstelltam DESC;
        `;
        const result = await client.query<AnregungData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error(`[${requestTimestamp}] Fehler beim Abrufen von Anregungen (/api/feedback):`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Anregungen.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API PATCH /api/feedback: Status update attempt.`);

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for PATCH /api/feedback: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[${requestTimestamp}] PATCH /api/feedback: Token verified for user: ${decoded.username}`);
        // Optional: Admin-Check
        // if (!decoded.isAdmin) {
        //     return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
        // }
    } catch (error) {
        console.error(`[${requestTimestamp}] PATCH /api/feedback: Invalid token. Error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatusAnregung;

    try {
        requestBody = await request.json();
        const idFromBody = requestBody.id;
        newStatus = requestBody.status;

        if (typeof idFromBody !== 'number' || isNaN(idFromBody)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        itemId = idFromBody;

        if (!newStatus || !allowedStatusesAnregung.includes(newStatus)) {
            return NextResponse.json({ error: 'Ungültiger oder fehlender Statuswert.' }, { status: 400 });
        }
    } catch (e) {
        console.error(`[${requestTimestamp}] PATCH /api/feedback: Invalid JSON body:`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`[${requestTimestamp}] API PATCH /api/feedback: Attempting to change status for ID ${itemId} to "${newStatus}"`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        let queryText: string;
        let queryParams: (string | number | null)[];

        if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
            queryText = `
                UPDATE "anregung"
                SET status = $1, abgeschlossenam = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam;
            `;
            queryParams = [newStatus, itemId];
        } else { 
            queryText = `
                UPDATE "anregung"
                SET status = $1, abgeschlossenam = NULL
                WHERE id = $2
                RETURNING id, name, email, tel, betreff, beschreibung, erstelltam, status, abgeschlossenam;
            `;
            queryParams = [newStatus, itemId];
        }
        
        const result = await client.query<AnregungData>(queryText, queryParams);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Anregung nicht gefunden.' }, { status: 404 });
        }
        console.log(`[${requestTimestamp}] API PATCH /api/feedback: Status for Anregung ID ${itemId} successfully changed to "${newStatus}".`);
        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error(`[${requestTimestamp}] API PATCH /api/feedback: Error updating status for Anregung ID ${itemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren.';
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Anregung-Status.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}