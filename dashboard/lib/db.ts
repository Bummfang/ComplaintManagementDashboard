// lib/db.ts
import { Pool } from 'pg';

// Globale Variable für den Pool, um ihn zwischen Funktionsaufrufen im selben Kontext (z.B. warme Lambda-Instanz) zu cachen.
const globalForPool = globalThis as unknown as { pool: Pool | undefined };

export function getDbPool(): Pool {
    // Wenn der Pool bereits existiert und initialisiert wurde, gib ihn zurück.
    if (globalForPool.pool) {
        return globalForPool.pool;
    }

    // Überprüfe, ob die DATABASE_URL Umgebungsvariable gesetzt ist.
    if (!process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL environment variable is not set.");
        throw new Error('Database connection string (DATABASE_URL) is not configured.');
    }

    console.log("Initializing new database pool...");
    const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // SSL-Konfiguration für Produktionsumgebungen (z.B. Railway, Vercel Postgres)
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    // Event-Listener für Fehler im Pool
    newPool.on('error', (err) => {
        console.error('Unerwarteter Fehler im PostgreSQL-Client-Pool:', err);
    });

    // Speichere den neu erstellten Pool global, damit er wiederverwendet werden kann.
    globalForPool.pool = newPool;
    console.log("Database pool initialized and cached globally.");
    return newPool;
}