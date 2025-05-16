// app/api/anregungen/route.ts
import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const connectionString = process.env.NODE_ENV === 'production'
    ? process.env.POSTGRES_URL_INTERNAL
    : process.env.POSTGRES_URL_EXTERNAL;

if (!connectionString) {
    throw new Error('POSTGRES_URL_INTERNAL or POSTGRES_URL_EXTERNAL environment variable is not set');
}

const pool = new Pool({ connectionString });
pool.on('error', (err,) => console.error('Unerwarteter Fehler im PostgreSQL-Client für Anregungen', err));

interface Anregung {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
}

export async function GET() {
    console.log(`Using database URL for Anregungen: ${connectionString ? connectionString.split('@')[1] : 'NOT SET'}`);
    let client;
    try {
        client = await pool.connect();
        const query = 'SELECT id, "name", email, tel, betreff, "beschreibung", "erstelltam" FROM "anregung" ORDER BY "erstelltam" DESC';
        const result = await client.query<Anregung>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Anregungen:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Anregungen.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}