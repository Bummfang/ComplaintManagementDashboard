// app/api/admin/create-user/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient, DatabaseError } from 'pg';
import { getDbPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface CreateUserRequestBody {
  name?: string;
  nachname?: string;
  password_hash?: string; // Frontend sendet hier das Klartext-Passwort
  isAdmin?: boolean;
}

interface UserRecord {
  id: number;
  username: string;
  name: string;
  nachname: string;
  ist_admin: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  console.log(`[${requestTimestamp}] API POST /api/admin/create-user: Attempt to create new user.`);

  if (!JWT_SECRET) {
    console.error(`[${new Date().toISOString()}] FATAL for /api/admin/create-user: JWT_SECRET is not defined.`);
    return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
    if (!decodedToken.isAdmin) {
      return NextResponse.json({ error: 'Zugriff verweigert.', details: 'Nur Administratoren können Benutzer anlegen.' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.', details: error instanceof Error ? error.message : 'JWT error' }, { status: 401 });
  }

  let body: CreateUserRequestBody;
  try {
    body = await request.json();
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Failed to parse JSON body for create user:`, e);
    return NextResponse.json({ error: 'Ungültiger JSON-Body.' }, { status: 400 });
  }

  const { name, nachname, password_hash: plainPassword, isAdmin } = body;

  if (!name || !nachname || !plainPassword) {
    return NextResponse.json({ error: 'Vorname, Nachname und Passwort sind erforderlich.' }, { status: 400 });
  }
  if (plainPassword.length < 6) {
    return NextResponse.json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' }, { status: 400 });
  }
  if (typeof isAdmin !== 'boolean') {
    return NextResponse.json({ error: "Das Feld 'isAdmin' muss ein Boolean sein." }, { status: 400 });
  }

  const pool = getDbPool();
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();

    // NEU: Prüfen, ob ein Benutzer mit demselben Vor- und Nachnamen bereits existiert
    // Wir verwenden LOWER() für einen case-insensitiven Vergleich der Namen.
    const checkNameQuery = 'SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND LOWER(nachname) = LOWER($2)';
    const trimmedName = name.trim();
    const trimmedNachname = nachname.trim();
    const nameCheckResult = await client.query(checkNameQuery, [trimmedName, trimmedNachname]);

    if (nameCheckResult.rows.length > 0) {
      console.warn(`[${requestTimestamp}] Attempt to create user with existing name combination: "${trimmedName} ${trimmedNachname}".`);
      return NextResponse.json(
        {
          error: 'Benutzer existiert bereits.',
          details: `Eine Person mit dem Namen "${trimmedName} ${trimmedNachname}" ist bereits im System vorhanden.`
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Passwort hashen
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // `username` wird von der DB generiert (Annahme basierend auf vorherigem DB-Fehler)
    const insertUserQuery = `
      INSERT INTO users (name, nachname, password, ist_admin)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, name, nachname, ist_admin;
    `;
    const result = await client.query<UserRecord>(insertUserQuery, [
      trimmedName,
      trimmedNachname,
      hashedPassword,
      isAdmin,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Benutzer konnte nicht in der Datenbank erstellt werden (keine Zeile zurückgegeben).');
    }

    const newUser = result.rows[0];
    console.log(`[${new Date().toISOString()}] User "${newUser.username}" (ID: ${newUser.id}, Name: ${newUser.name} ${newUser.nachname}, Admin: ${newUser.ist_admin}) successfully created by database generation.`);

    return NextResponse.json(
      {
        userId: newUser.id,
        username: newUser.username,
        name: newUser.name,
        nachname: newUser.nachname,
        isAdmin: newUser.ist_admin,
        message: 'Benutzer erfolgreich angelegt.',
      },
      { status: 201 }
    );

  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    let errorMessage = 'Ein interner Serverfehler ist aufgetreten.';
    let errorDetails = 'Unbekannter Fehler';
    let statusCode = 500;

    if (error instanceof DatabaseError) {
      errorDetails = error.message;
      // Diese Prüfung ist immer noch sinnvoll, falls die DB-interne Generierung des `username`
      // auf ein Duplikat stößt, das nicht durch die Vor-/Nachnamen-Prüfung abgedeckt wurde
      // (z.B. wenn die Generierungslogik komplexer ist oder Normalisierungen durchführt).
      if (error.code === '23505' && error.constraint && error.constraint.includes('username')) {
        errorMessage = 'Benutzername (automatisch generiert) existiert bereits oder ist nicht eindeutig.';
        errorDetails = error.detail || `Der von der Datenbank generierte Benutzername für "${name} ${nachname}" ist bereits vergeben oder konnte nicht eindeutig erstellt werden.`;
        statusCode = 409; // Conflict
        console.warn(`[${errorTimestamp}] Failed to create user due to duplicate DB-generated username. Original name: "${name} ${nachname}". DB Error: ${error.detail || error.message}`);
      } else {
        // Für andere Datenbankfehler
        console.error(`[${errorTimestamp}] DatabaseError during user creation for (Name: ${name} ${nachname}):`, error);
      }
    } else if (error instanceof Error) {
      errorDetails = error.message;
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Datenbankverbindung fehlgeschlagen.';
      }
      console.error(`[${errorTimestamp}] Generic Error during user creation for (Name: ${name} ${nachname}):`, error);
    } else if (typeof error === 'string') {
      errorDetails = error;
      console.error(`[${errorTimestamp}] String Error during user creation for (Name: ${name} ${nachname}):`, error);
    } else {
      console.error(`[${errorTimestamp}] Unknown error object during user creation for (Name: ${name} ${nachname}):`, error);
    }

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: statusCode });
  } finally {
    if (client) {
      client.release();
    }
  }
}