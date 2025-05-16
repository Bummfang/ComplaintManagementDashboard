// app/api/beschwerden/route.ts
import { NextResponse } from 'next/server';
import { Pool, type QueryResultRow, type PoolClient } from 'pg'; // QueryResultRow und PoolClient importieren

// Datenbank-Verbindungspool erstellen (Singleton-Muster wie in submit-feedback)
// Die Konfiguration wird aus Umgebungsvariablen geladen (DATABASE_URL)
const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
};

// Hilfsfunktion, um den Pool zu holen oder zu initialisieren
function getDbPool(): Pool {
    if (globalForPool.pool) {
        return globalForPool.pool;
    }

    // Überprüfen, ob DATABASE_URL gesetzt ist, bevor der Pool erstellt wird
    if (!process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL environment variable is not set.");
        // Im Build-Kontext sollte dieser Fehler idealerweise nicht mehr auftreten,
        // da wir die Initialisierung verzögern. Zur Laufzeit ist er aber wichtig.
        throw new Error('Database connection string (DATABASE_URL) is not configured.');
    }

    console.log("Initializing new database pool for /api/beschwerden...");
    const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false,
        } : undefined,
    });

    newPool.on('error', (err: Error, _client: PoolClient | undefined) => {
        console.error('Unerwarteter Fehler im PostgreSQL-Client-Pool (/api/beschwerden)', err);
    });

    // Den Pool nur im Entwicklungsmodus global speichern, um Hot-Reloading-Probleme zu vermeiden
    if (process.env.NODE_ENV !== 'production') {
        globalForPool.pool = newPool;
    }
    console.log("Database pool for /api/beschwerden initialized.");
    return newPool;
}


// Interface für die Datenstruktur, die von dieser API zurückgegeben wird
// (angenommen, alle Feldnamen sind jetzt kleingeschrieben, passend zu deinen Frontend-Interfaces)
interface BeschwerdeData extends QueryResultRow { // Erbt von QueryResultRow für Kompatibilität mit pg
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
    status?: string; // Status aus der Datenbank
}


export async function GET() {
    const poolToUse = getDbPool(); // Pool bei Bedarf holen/initialisieren
    // Logge eine generische Nachricht oder nur nicht-sensitive Teile
    console.log(`API GET /api/beschwerden: Using database connection (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'N/A'})`);

    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        // Stelle sicher, dass alle Spaltennamen hier exakt denen in deiner Datenbanktabelle "beschwerde" entsprechen
        // und dass sie kleingeschrieben sind, passend zum Interface BeschwerdeData.
        const query = `
            SELECT
                id, name, email, tel, betreff, beschreibung,
                beschwerdegrund, datum, uhrzeit, haltestelle, linie, erstelltam, status
            FROM
                "beschwerde" -- Sicherstellen, dass der Tabellenname korrekt ist (wahrscheinlich klein)
            ORDER BY
                erstelltam DESC;
        `;
        const result = await client.query<BeschwerdeData>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Beschwerden (/api/beschwerden):', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Optional: POST-Handler, falls diese Route auch zum Erstellen von Beschwerden dient
// Wenn nicht, kann dieser Teil entfernt werden oder du hast ihn bereits in submit-feedback.
// export async function POST(request: Request) {
//   const poolToUse = getDbPool();
//   // ... deine POST-Logik hier, ähnlich wie in submit-feedback/route.ts ...
// }
