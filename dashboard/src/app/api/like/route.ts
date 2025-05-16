// app/api/lob/route.ts
import { NextResponse } from 'next/server';
import { Pool, type QueryResultRow, type PoolClient } from 'pg'; // QueryResultRow und PoolClient importieren

// Datenbank-Verbindungspool erstellen (Singleton-Muster)
// Die Konfiguration wird aus Umgebungsvariablen geladen (DATABASE_URL)
const globalForLobPool = globalThis as unknown as {
  pool: Pool | undefined;
};


// Hilfsfunktion, um den Pool zu holen oder zu initialisieren
function getDbPool(): Pool {
    // Prüfen, ob der Pool bereits für diesen Kontext initialisiert wurde
    if (globalForLobPool.pool) {
        return globalForLobPool.pool;
    }

    // Überprüfen, ob DATABASE_URL gesetzt ist, bevor der Pool erstellt wird
    if (!process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL environment variable is not set for /api/lob.");
        throw new Error('Database connection string (DATABASE_URL) is not configured.');
    }

    console.log("Initializing new database pool for /api/lob...");
    const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false, // Für viele gehostete DBs notwendig
        } : undefined, // Lokal kein SSL, es sei denn explizit konfiguriert
    });

    newPool.on('error', (err: Error | undefined) => {
        console.error('Unerwarteter Fehler im PostgreSQL-Client-Pool (/api/lob)', err);
    });

    // Den Pool nur im Entwicklungsmodus global speichern
    if (process.env.NODE_ENV !== 'production') {
        globalForLobPool.pool = newPool;
    }
    console.log("Database pool for /api/lob initialized.");
    return newPool;
}

// Interface für die Datenstruktur, die von dieser API zurückgegeben wird
// (alle Feldnamen kleingeschrieben, passend zu deinen Frontend-Interfaces)
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
    const poolToUse = getDbPool(); // Pool bei Bedarf holen/initialisieren
    console.log(`API GET /api/lob: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);

    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        // Stelle sicher, dass alle Spaltennamen hier exakt denen in deiner Datenbanktabelle "lob" entsprechen
        // und dass sie kleingeschrieben sind, passend zum Interface LobData.
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung, erstelltam
            FROM
                "lob" -- Sicherstellen, dass der Tabellenname korrekt ist (wahrscheinlich klein)
            ORDER BY
                erstelltam DESC;
        `;
        const result = await client.query<LobData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Lob (/api/lob):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Lob.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
