// lib/db.ts
import { Pool } from 'pg';

// Globale Variable für den Pool, um ihn zwischen Funktionsaufrufen im selben Kontext zu cachen.
const globalForPool = globalThis as unknown as { pool: Pool | undefined };

export function getDbPool(): Pool {
    if (globalForPool.pool) {
        // console.log("Using existing database pool (from lib/db.ts).");
        return globalForPool.pool;
    }

    if (!process.env.DATABASE_URL) {
        console.error("FATAL: DATABASE_URL environment variable is not set.");
        throw new Error('Database connection string (DATABASE_URL) is not configured.');
    }

    console.log("Initializing new database pool (from lib/db.ts)...");
    const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    newPool.on('error', (err) => {
        console.error('Unerwarteter Fehler im PostgreSQL-Client-Pool (from lib/db.ts):', err);
    });

    globalForPool.pool = newPool;
    console.log("Database pool (from lib/db.ts) initialized and cached globally.");
    return newPool;
}
