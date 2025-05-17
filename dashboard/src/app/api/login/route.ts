// app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient, type QueryResultRow } from 'pg';
import { getDbPool } from '@/lib/db'; // Deine zentrale Pool-Funktion
import bcrypt from 'bcryptjs'; // Importiere bcryptjs für Passwort-Hashing

// Interface für die erwarteten Daten im Request-Body
interface LoginRequestBody {
  username?: string;
  password?: string;
}

// Interface für die Benutzerdaten aus der Datenbank
// Das 'password' Feld enthält den gespeicherten Hash.
interface UserRecord extends QueryResultRow {
  id: number;
  name: string;
  nachname: string;
  username: string;
  password_hash: string; // Umbenannt, um klarzustellen, dass es der Hash ist
}

// Interface für die erfolgreiche Login-Antwort (ohne Passwort-Hash)
interface LoginSuccessResponse {
  userId: number;
  username: string;
  name: string;
  nachname: string;
  message: string;
  // In einer echten Anwendung würde hier ein JWT (JSON Web Token) oder eine Session-ID zurückgegeben
  // token?: string;
}

export async function POST(request: NextRequest) {
  const pool = getDbPool();
  let client: PoolClient | undefined;

  const requestTimestamp = new Date().toISOString();
  console.log(`[${requestTimestamp}] API POST /api/auth/login: Login attempt received.`);

  try {
    const body = await request.json() as LoginRequestBody;
    const { username, password: plainPassword } = body; // Eingegebenes Passwort umbenannt zu plainPassword

    // Validierung der Eingabedaten
    if (!username || !plainPassword) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed: Missing username or password.`);
      return NextResponse.json({ error: 'Benutzername und Passwort sind erforderlich.' }, { status: 400 });
    }

    client = await pool.connect();
    console.log(`[${new Date().toISOString()}] Successfully connected to database for user: ${username}`);

    // Benutzer in der Datenbank suchen.
    // Stelle sicher, dass die Spalte in deiner DB, die den Hash enthält, hier korrekt adressiert wird.
    // Ich nehme an, sie heißt 'password', basierend auf deinem Schema, sollte aber 'password_hash' o.ä. heißen.
    // Für dieses Beispiel verwende ich 'password' als Spaltennamen für den Hash.
    // ACHTUNG: Stelle sicher, dass deine 'users' Tabelle eine Spalte für Passwort-Hashes hat (z.B. VARCHAR(72)).
    const query = `
      SELECT id, name, nachname, username, password AS password_hash
      FROM users 
      WHERE username = $1;
    `;
    const result = await client.query<UserRecord>(query, [username.trim()]);

    if (result.rows.length === 0) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed: User "${username}" not found.`);
      return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 }); // Status 401 für unautorisiert
    }

    const user = result.rows[0];

    // Vergleiche das eingegebene Passwort mit dem gespeicherten Hash
    // user.password_hash ist der Hash aus der Datenbank
    const isPasswordValid = await bcrypt.compare(plainPassword, user.password_hash);

    if (!isPasswordValid) {
      console.warn(`[${new Date().toISOString()}] Login attempt failed: Invalid password for user "${username}".`);
      return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 });
    }

    // Erfolgreicher Login
    console.log(`[${new Date().toISOString()}] User "${username}" (ID: ${user.id}) logged in successfully.`);
    
    const responsePayload: LoginSuccessResponse = {
      userId: user.id,
      username: user.username,
      name: user.name,
      nachname: user.nachname,
      message: 'Login erfolgreich.',
      // Hier würde man typischerweise ein JWT erstellen und zurückgeben:
      // token: generateJwtToken(user), 
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] Fehler bei der Login-Verarbeitung (/api/auth/login):`, error);
    
    let errorMessage = 'Ein interner Serverfehler ist aufgetreten.';
    let errorDetails = 'Unbekannter Fehler';

    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Datenbankverbindung fehlgeschlagen.';
      }
    }
    // Logge detailliertere Fehlerinformationen serverseitig
    console.error(`[${errorTimestamp}] Detailed error for /api/auth/login: ${errorDetails}`);

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  } finally {
    if (client) {
      client.release();
      console.log(`[${new Date().toISOString()}] Database client released for /api/auth/login.`);
    }
  }
}

// Beispielhafte Funktion zum Hashen eines Passworts (z.B. bei der Benutzerregistrierung)
// Diese Funktion gehört nicht direkt in die Login-Route, sondern dorthin, wo Benutzer erstellt werden.
// async function hashPassword(password: string): Promise<string> {
//   const saltRounds = 10; // Je höher, desto sicherer, aber auch langsamer
//   const hashedPassword = await bcrypt.hash(password, saltRounds);
//   return hashedPassword;
// }
