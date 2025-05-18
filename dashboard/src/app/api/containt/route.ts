// app/api/containt/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
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
}

type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
const JWT_SECRET = process.env.JWT_SECRET;

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
        // Die Variable 'decoded' wird jetzt für Logging verwendet oder kann mit '_' versehen werden, wenn nicht benötigt.
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[GET /api/containt] Token verified for user: ${decoded.username}`);
    } catch (error) { // 'error' wird im Log verwendet
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
                id, name, email, tel, betreff, beschreibung,
                beschwerdegrund, datum, uhrzeit, haltestelle, linie, 
                erstelltam, status, abgeschlossenam
            FROM
                "beschwerde"
            ORDER BY
                erstelltam DESC;
        `;
        const result = await client.query<BeschwerdeData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) { // 'error' wird im Log verwendet
        console.error('Fehler beim Abrufen von Beschwerden (/api/containt):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API PATCH /api/containt: Status update attempt. URL: ${request.url}`);

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL for PATCH /api/containt: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
        console.log(`[PATCH /api/containt] Token verified for user: ${decoded.username}`);
        // if (!decoded.isAdmin) {
        //     return NextResponse.json({ error: 'Zugriff verweigert.', details: 'Nur Administratoren dürfen den Status ändern.' }, { status: 403 });
        // }
    } catch (error) { // 'error' wird im Log verwendet
        console.error(`[PATCH /api/containt] Invalid token:`, error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatus;

    try {
        requestBody = await request.json();
        const idFromBody = requestBody.id;
        newStatus = requestBody.status;

        if (typeof idFromBody !== 'number' || isNaN(idFromBody)) {
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.' }, { status: 400 });
        }
        itemId = idFromBody;

        if (!newStatus || !allowedStatuses.includes(newStatus)) {
            return NextResponse.json({ error: 'Ungültiger oder fehlender Statuswert.' }, { status: 400 });
        }
    } catch (e) { // 'e' wird im Log verwendet
        console.error(`[PATCH /api/containt] Invalid JSON body:`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`[${requestTimestamp}] API PATCH /api/containt: Attempting to change status for ID ${itemId} to "${newStatus}"`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        let queryText: string;
        let queryParams: (string | number | null)[];

        if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
            queryText = `
                UPDATE "beschwerde"
                SET status = $1, abgeschlossenam = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `;
            queryParams = [newStatus, itemId];
        } else if (newStatus === 'Offen' || newStatus === 'In Bearbeitung') {
            queryText = `
                UPDATE "beschwerde"
                SET status = $1, abgeschlossenam = NULL
                WHERE id = $2
                RETURNING *;
            `;
            queryParams = [newStatus, itemId];
        } else {
            queryText = `
                UPDATE "beschwerde"
                SET status = $1
                WHERE id = $2
                RETURNING *;
            `;
            queryParams = [newStatus, itemId];
        }
        const result = await client.query<BeschwerdeData>(queryText, queryParams);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 });
        }
        console.log(`[${requestTimestamp}] API PATCH /api/containt: Status for ID ${itemId} successfully changed to "${newStatus}". abgeschlossenam updated accordingly.`);
        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) { // 'error' wird im Log verwendet
        console.error(`[${requestTimestamp}] API PATCH /api/containt: Error updating status for ID ${itemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren.';
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}