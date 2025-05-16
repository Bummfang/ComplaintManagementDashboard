// app/api/like/route.ts
import { NextResponse } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg'; // PoolClient für Typsicherheit
import { getDbPool } from '@/lib/db'; // Importiere die zentrale Pool-Funktion

// Die lokalen Definitionen von 'globalForLobPool' und 'getDbPool' werden entfernt.

// Interface für die Datenstruktur, die von dieser API zurückgegeben wird
interface LobData extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
}

export async function GET() {
    // Rufe die zentrale getDbPool-Funktion auf
    const poolToUse = getDbPool(); 
    console.log(`API GET /api/like: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);

    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        // Stelle sicher, dass der Tabellenname "lob" korrekt ist
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung, erstelltam
            FROM
                "lob" 
            ORDER BY
                erstelltam DESC;
        `;
        const result = await client.query<LobData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Lob (/api/like):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Lob.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
