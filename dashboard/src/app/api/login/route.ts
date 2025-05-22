import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient, type QueryResultRow, DatabaseError } from 'pg';
import { getDbPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface LoginRequestBody {
    username?: string;
    password?: string;
}












// Dieses Interface sollte die Spalten deiner 'users'-Tabelle widerspiegeln
interface UserRecord extends QueryResultRow {
    id: number;
    name: string;       // Vorname
    nachname: string;   // Nachname
    username: string;
    password: string; // Annahme: Spalte heißt 'password' und enthält den Hash
    ist_admin: boolean;
}







interface LoginSuccessResponse {
    userId: number;
    username: string;
    name: string;       // Vorname
    nachname: string;   // Nachname
    isAdmin: boolean;
    message: string;
    token: string;
}









const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
    const pool = getDbPool();
    let client: PoolClient | undefined;
    const requestTimestamp = new Date().toISOString();

    console.log(`[${requestTimestamp}] API POST /api/login: Login attempt received.`);

    if (!JWT_SECRET) {
        console.error(`[${new Date().toISOString()}] FATAL for /api/login: JWT_SECRET is not defined.`);
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
        // console.log(`[${new Date().toISOString()}] Successfully connected to database for user login: ${username}`);

        const query = `
            SELECT id, name, nachname, username, password, ist_admin
            FROM users
            WHERE username = $1;
        `;
        const result = await client.query<UserRecord>(query, [username.trim()]);

        if (result.rows.length === 0) {
            console.warn(`[${new Date().toISOString()}] Login attempt failed for /api/login: User "${username}" not found.`);
            return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 });
        }

        const user = result.rows[0];

        if (typeof user.ist_admin === 'undefined' || typeof user.name === 'undefined' || typeof user.nachname === 'undefined') {
            console.error(`[${new Date().toISOString()}] Error for /api/login: User data incomplete for "${username}". Check SQL query and DB columns (ist_admin, name, nachname).`);
            return NextResponse.json({ error: 'Fehler bei der Benutzerverarbeitung.' }, { status: 500 });
        }

        const isPasswordValid = await bcrypt.compare(plainPassword, user.password); // user.password statt user.password_hash, an deine Spalte anpassen

        if (!isPasswordValid) {
            console.warn(`[${new Date().toISOString()}] Login attempt failed for /api/login: Invalid password for user "${username}".`);
            return NextResponse.json({ error: 'Ungültiger Benutzername oder Passwort.' }, { status: 401 });
        }

        console.log(`[${new Date().toISOString()}] User "${username}" (ID: ${user.id}, Admin: ${user.ist_admin}) logged in successfully via /api/login.`);

        // JWT Payload erstellen - JETZT MIT name UND nachname
        const tokenPayload = {
            userId: user.id,
            username: user.username,
            isAdmin: user.ist_admin,
            name: user.name,          // Vorname hinzufügen
            nachname: user.nachname,  // Nachname hinzufügen
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: '1h', // oder deine bevorzugte Gültigkeitsdauer
        });

        const responsePayload: LoginSuccessResponse = {
            userId: user.id,
            username: user.username,
            name: user.name,
            nachname: user.nachname,
            isAdmin: user.ist_admin,
            message: 'Login erfolgreich.',
            token: token,
        };

        return NextResponse.json(responsePayload, { status: 200 });

   
   



   
   
    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        let errorMessage = 'Ein interner Serverfehler ist aufgetreten.';
        let errorDetails = 'Unbekannter Fehler';
        const statusCode = 500;

        if (error instanceof DatabaseError) {
            errorDetails = error.message;
             console.error(`[${errorTimestamp}] DatabaseError during login:`, error);
        } else if (error instanceof Error) {
            errorDetails = error.message;
            if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Datenbankverbindung fehlgeschlagen.';
            }
            console.error(`[${errorTimestamp}] Generic Error during login:`, error);
        } else {
            console.error(`[${errorTimestamp}] Unknown error object during login:`, error);
        }
        return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: statusCode });
   
   
   




   
   
    } finally {
        if (client) {
            client.release();
            // console.log(`[${new Date().toISOString()}] Database client released for /api/login.`);
        }
    }
}