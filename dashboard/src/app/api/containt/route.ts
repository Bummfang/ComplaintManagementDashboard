// app/api/beschwerden/route.ts
import { Pool } from 'pg';
import { NextResponse } from 'next/server';

// Wähle die Verbindungs-URL basierend auf der Umgebung
// Im Produktivbetrieb (auf Railway) sollte die interne URL verwendet werden.
// process.env.NODE_ENV wird von Next.js automatisch gesetzt.
const connectionString = process.env.NODE_ENV === 'production'
    ? process.env.POSTGRES_URL_INTERNAL
    : process.env.POSTGRES_URL_EXTERNAL;

if (!connectionString) {
    throw new Error('POSTGRES_URL_INTERNAL or POSTGRES_URL_EXTERNAL environment variable is not set');
}

const pool = new Pool({
    connectionString: connectionString,
    // Railway handhabt SSL in der Regel automatisch für seine Proxy-Verbindungen.
    // Falls du direkt ohne Proxy verbindest und SSL benötigst:
    // ssl: {
    //   rejectUnauthorized: false, // Nur für Entwicklung, wenn du selbstsignierte Zertifikate verwendest
    // },
});

pool.on('error', (err,) => {
    console.error('Unerwarteter Fehler im PostgreSQL-Client', err);
});

// Interface für TypeScript Typisierung (optional, aber empfohlen)
interface Beschwerde {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string; // Kommt als string aus der DB, kann im Frontend zu Date-Objekt werden
    uhrzeit: string; // dito
    haltestelle?: string;
    linie?: string;
    erstelltam: string; // Kommt als ISO-String
    // Füge hier 'status' und 'zugewiesen_an' hinzu, falls du sie später zur DB hinzufügst
}


export async function GET() {
    console.log(`Using database URL: ${connectionString ? connectionString.split('@')[1] : 'NOT SET'}`); // Logge nur den Host-Teil
    let client;
    try {
        client = await pool.connect();
        // Stelle sicher, dass Spaltennamen, die Großbuchstaben enthalten (wie ErstelltAm),
        // in doppelte Anführungszeichen gesetzt werden, wenn sie so in der DB erstellt wurden.
        // PostgreSQL konvertiert Namen ohne Anführungszeichen standardmäßig in Kleinbuchstaben.
        const query = 'SELECT id, "name", email, tel, betreff, "beschreibung", "beschwerdegrund", "datum", "uhrzeit", "haltestelle", "linie", "erstelltam" FROM "beschwerde" ORDER BY "erstelltam" DESC';
        const result = await client.query<Beschwerde>(query);
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('Fehler beim Abrufen von Beschwerden:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            client.release(); // Wichtig: Client nach Gebrauch wieder freigeben!
        }
    }
}