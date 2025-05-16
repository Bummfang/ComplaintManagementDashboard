// app/api/containt/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';

// Interface für die Datenstruktur, die von dieser API zurückgegeben wird
// (Namen und Struktur basieren auf deinem bereitgestellten Code für /api/containt/route.ts)
export interface BeschwerdeData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string; // Spezifisch für Beschwerden
    datum: string;           // Spezifisch für Beschwerden
    uhrzeit: string;         // Spezifisch für Beschwerden
    haltestelle?: string;    // Spezifisch für Beschwerden
    linie?: string;          // Spezifisch für Beschwerden
    erstelltam: string;
    status?: AllowedStatus;  // Status aus der Datenbank, jetzt mit dem spezifischen Typ
}

// Erlaubte Statuswerte (vorher in update-containt-status/route.ts)
type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];


export async function GET() {
    const poolToUse = getDbPool();
    console.log(`API GET /api/containt: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung,
                beschwerdegrund, datum, uhrzeit, haltestelle, linie, erstelltam, status
            FROM
                "beschwerde"
            ORDER BY
                erstelltam DESC;
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

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatus;

    console.log(`[PATCH /api/containt] Funktion aufgerufen. Request-URL: ${request.url}`);

    try {
        requestBody = await request.json();
        const idFromBody = requestBody.id;
        newStatus = requestBody.status;

        if (typeof idFromBody !== 'number' || isNaN(idFromBody)) {
            console.error(`API PATCH /api/containt: Ungültige oder fehlende ID im Body: ${idFromBody}`);
            return NextResponse.json({ error: 'Ungültige oder fehlende ID im Request-Body.', details: `ID muss eine Zahl sein.` }, { status: 400 });
        }
        itemId = idFromBody;

        if (!newStatus) {
            return NextResponse.json({ error: 'Der neue Status fehlt im Request-Body.' }, { status: 400 });
        }

        if (!allowedStatuses.includes(newStatus)) {
            return NextResponse.json(
                {
                    error: 'Ungültiger Statuswert.',
                    details: `Der Status "${newStatus}" ist nicht erlaubt. Erlaubte Werte sind: ${allowedStatuses.join(', ')}.`
                },
                { status: 400 }
            );
        }
    } catch (e) {
        console.error(`API PATCH /api/containt: Fehler beim Parsen des JSON-Bodys oder Validierung.`, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body oder fehlerhafte Datenstruktur.' }, { status: 400 });
    }

    console.log(`API PATCH /api/containt: Versuche Status für ID ${itemId} zu ändern auf "${newStatus}"`);

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();

        const queryText = `
            UPDATE "beschwerde"
            SET status = $1
            WHERE id = $2
            RETURNING *;
        `;

        const result = await client.query<BeschwerdeData>(queryText, [newStatus, itemId]);

        if (result.rowCount === 0) {
            console.warn(`API PATCH /api/containt: Keine Beschwerde mit ID ${itemId} gefunden.`);
            return NextResponse.json({ error: 'Beschwerde nicht gefunden.', details: `Es wurde keine Beschwerde mit der ID ${itemId} gefunden.` }, { status: 404 });
        }

        console.log(`API PATCH /api/containt: Status für ID ${itemId} erfolgreich auf "${newStatus}" geändert.`);
        return NextResponse.json(result.rows[0], { status: 200 });

    } catch (error) {
        console.error(`API PATCH /api/containt: Fehler beim Aktualisieren des Status für ID ${itemId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren des Status.';
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status in der Datenbank.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
            console.log(`API PATCH /api/containt: Datenbank-Client für ID ${itemId} freigegeben.`);
        }
    }
}