// app/api/containt/route.ts
import { NextResponse } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; 
// Die lokale Definition von 'globalForPool' und 'getDbPool' wird hier entfernt,
// da sie jetzt aus lib/db.ts importiert wird.

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
    datum: string;            // Spezifisch für Beschwerden
    uhrzeit: string;          // Spezifisch für Beschwerden
    haltestelle?: string;     // Spezifisch für Beschwerden
    linie?: string;           // Spezifisch für Beschwerden
    erstelltam: string;
    status?: string;          // Status aus der Datenbank
}


export async function GET() {
    // Ruft jetzt die importierte Funktion aus lib/db.ts auf
    const poolToUse = getDbPool(); 
    
    // Log-Nachricht angepasst an den korrekten Pfad
    console.log(`API GET /api/containt: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);

    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        // Die Query basiert auf deinem bereitgestellten Code für /api/containt/route.ts
        // Stellt sicher, dass die Tabelle "beschwerde" und alle Spaltennamen korrekt sind.
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
        // Fehlermeldung angepasst an den korrekten Pfad
        console.error('Fehler beim Abrufen von Beschwerden (/api/containt):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Optional: POST-Handler, falls diese Route auch zum Erstellen von Beschwerden dient.
// Wenn nicht, kann dieser Teil entfernt werden.
// export async function POST(request: Request) {
//   const poolToUse = getDbPool(); // Würde ebenfalls die importierte Funktion nutzen
//   // ... deine POST-Logik hier ...
// }
