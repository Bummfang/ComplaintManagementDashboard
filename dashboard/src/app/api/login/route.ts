// app/api/login/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient, type QueryResultRow } from 'pg';
import { getDbPool } from '@/lib/db'; // Deine zentrale Pool-Funktion
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // Importiert für JWT-Erstellung

// Interface für die erwarteten Daten im Request-Body (bleibt gleich)
interface LoginRequestBody {
  username?: string;
  password?: string;
}

// Interface für die Benutzerdaten aus der Datenbank
// Deine DB-Spalte heißt 'ist_admin'
interface UserRecord extends QueryResultRow {
  id: number;
  name: string;
  nachname: string;
  username: string;
  password_hash: string; // Dein Passwort-Hash aus der DB
  ist_admin: boolean;   // Admin-Status des Benutzers, passend zur DB-Spalte 'ist_admin'
}

// Interface für die erfolgreiche Login-Antwort (jetzt mit Token und isAdmin)
interface LoginSuccessResponse {
  userId: number;
  username: string;
  name: string;
  nachname: string;
  isAdmin: boolean; // Information, ob der Benutzer Admin ist (camelCase für JS-Konvention)
  message: string;
  token: string;    // Das generierte JWT
}

// Lade das JWT_SECRET aus den Umgebungsvariablen
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  const pool = getDbPool();
  let client: PoolClient | undefined;

  const requestTimestamp = new Date().toISOString();
  console.log(`[${requestTimestamp}] API POST /api/login: Login attempt received.`);

  if (!JWT_SECRET) {
    console.error(`[${new Date().toISOString()}] FATAL: JWT_SECRET is not defined in environment variables.`);
    return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.' }, { status: 500 });
  }

  try {
    const body = await request.json() as LoginRequestBody;
    const { username, password: plainPassword } = body;

    if (!username || !plainPassword) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed for /api/login: Missing username or password.`);
      return NextResponse.json({ error: 'Benutzername und Passwort sind erforderlich.' }, { status: 400 });
    }

    client = await pool.connect();
    console.log(`[${new Date().toISOString()}] Successfully connected to database for user login: ${username} (via /api/login)`);

    // Benutzer in der Datenbank suchen und ist_admin abrufen.
    // Die Query verwendet jetzt 'ist_admin' für die Spalte.
    const query = `
      SELECT id, name, nachname, username, password AS password_hash, ist_admin
      FROM users
      WHERE username = $1;
    `;
    const result = await client.query<UserRecord>(query, [username.trim()]);

    if (result.rows.length === 0) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed for /api/login: User "${username}" not found.`);
      return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 });
    }

    const user = result.rows[0]; // user ist jetzt vom Typ UserRecord mit user.ist_admin

    // Prüfen, ob user.ist_admin definiert ist (wichtig bei Tippfehlern im Spaltennamen in der Query)
    if (typeof user.ist_admin === 'undefined') {
        console.error(`[${new Date().toISOString()}] Error for /api/login: 'ist_admin' field is undefined for user "${username}". Check SQL query and DB column name.`);
        // Gib einen generischen Fehler zurück, um keine Interna preiszugeben
        return NextResponse.json({ error: 'Fehler bei der Benutzerverarbeitung.' }, { status: 500 });
    }


    const isPasswordValid = await bcrypt.compare(plainPassword, user.password_hash);

    if (!isPasswordValid) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed for /api/login: Invalid password for user "${username}".`);
      return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 });
    }

    // Erfolgreicher Login - Log verwendet jetzt user.ist_admin
    console.log(`[${new Date().toISOString()}] User "${username}" (ID: ${user.id}, Admin: ${user.ist_admin}) logged in successfully via /api/login.`);

    // JWT Payload erstellen
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      isAdmin: user.ist_admin, // Wert aus user.ist_admin, Eigenschaft im Token heißt isAdmin
    };

    // JWT generieren
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1h', // Token-Gültigkeit
    });

    // Antwort-Payload erstellen
    const responsePayload: LoginSuccessResponse = {
      userId: user.id,
      username: user.username,
      name: user.name,
      nachname: user.nachname,
      isAdmin: user.ist_admin, // Wert aus user.ist_admin, Eigenschaft in Antwort heißt isAdmin
      message: 'Login erfolgreich.',
      token: token,
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] Fehler bei der Login-Verarbeitung (/api/login):`, error);

    let errorMessage = 'Ein interner Serverfehler ist aufgetreten.';
    let errorDetails = 'Unbekannter Fehler';

    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Datenbankverbindung fehlgeschlagen.';
      }
      // Wenn der Fehler spezifisch auf eine nicht gefundene Spalte hindeutet (PostgreSQL wirft oft einen Fehler mit Spaltennamen)
      // könntest du hier spezifischer loggen, aber sei vorsichtig, was du an den Client zurückgibst.
      if (error.message.toLowerCase().includes("column") && error.message.toLowerCase().includes("does not exist")) {
        console.error(`[${errorTimestamp}] Detailed error for /api/login: Possible missing column or typo in query. Original error: ${errorDetails}`);
        errorMessage = "Fehler bei der Datenverarbeitung."; // Generische Meldung für Client
      }
    }
    console.error(`[${errorTimestamp}] Detailed error for /api/login: ${errorDetails}`);

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  } finally {
    if (client) {
      client.release();
      console.log(`[${new Date().toISOString()}] Database client released for /api/login.`);
    }
  }
}
