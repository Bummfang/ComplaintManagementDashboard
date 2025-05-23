// src/app/api/auth/verify-password/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad anpassen, falls nötig
import jwt, { type JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken extends JwtPayload {
    userId: number;
    username: string;
    
}

interface RequestBody {
    password?: string;
}

interface UserRecord {
    password?: string; // Spaltenname aus deiner DB (vermutlich 'password')
}

export async function POST(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] FATAL /api/auth/verify-password: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ success: false, error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let decodedTokenInfo: DecodedToken;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Überprüfe, ob das dekodierte Token die erwartete Struktur hat
        if (typeof decoded !== 'object' || decoded === null || typeof decoded.userId !== 'number') {
            throw new Error('Ungültige Token-Payload-Struktur');
        }
        decodedTokenInfo = decoded as DecodedToken;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Token-Verifizierungsfehler';
        console.error(`[${requestTimestamp}] /api/auth/verify-password: Ungültiges oder abgelaufenes Token.`, errorMsg);
        return NextResponse.json({ success: false, error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let requestBody: RequestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error(`[${requestTimestamp}] /api/auth/verify-password: Fehler beim Parsen des JSON-Body.`, e);
        return NextResponse.json({ success: false, error: 'Ungültiger JSON-Body.' }, { status: 400 });
    }

    const { password: plainPasswordFromRequest } = requestBody;

    if (!plainPasswordFromRequest) {
        return NextResponse.json({ success: false, error: 'Passwort fehlt im Request-Body.' }, { status: 400 });
    }

    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        
        // Hole den gehashten Passwort-String des Benutzers aus der Datenbank
        // Annahme: Deine Passwortspalte in der 'users'-Tabelle heißt 'password'
        const userQuery = 'SELECT password FROM users WHERE id = $1';
        const userResult = await client.query<UserRecord>(userQuery, [decodedTokenInfo.userId]);

        if (userResult.rows.length === 0) {
            console.error(`[${requestTimestamp}] /api/auth/verify-password: Benutzer mit ID ${decodedTokenInfo.userId} nicht in DB gefunden (trotz gültigem Token).`);
            // Dieser Fall sollte eigentlich nicht eintreten, wenn das Token gültig ist und der User existiert.
            return NextResponse.json({ success: false, error: 'Benutzer nicht gefunden.' }, { status: 404 });
        }

        const userRecord = userResult.rows[0];
        if (!userRecord.password) { // Oder wie auch immer deine Spalte heißt
             console.error(`[${requestTimestamp}] /api/auth/verify-password: Kein Passwort-Hash für User ID ${decodedTokenInfo.userId} in DB gefunden.`);
             return NextResponse.json({ success: false, error: 'Serverfehler bei Benutzerdaten.' }, { status: 500 });
        }

        // Vergleiche das eingegebene Passwort mit dem gehashten Passwort aus der DB
        const isPasswordValid = await bcrypt.compare(plainPasswordFromRequest, userRecord.password);

        if (isPasswordValid) {
            // console.log(`[${requestTimestamp}] /api/auth/verify-password: Passwort für User ID ${decodedTokenInfo.userId} erfolgreich verifiziert.`);
            return NextResponse.json({ success: true, message: 'Passwort korrekt.' }, { status: 200 });
        } else {
            // console.warn(`[${requestTimestamp}] /api/auth/verify-password: Falsches Passwort für User ID ${decodedTokenInfo.userId}.`);
            return NextResponse.json({ success: false, error: 'Ungültiges Passwort.' }, { status: 401 });
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler.';
        console.error(`[${requestTimestamp}] /api/auth/verify-password: Fehler bei der Passwortverifizierung für User ID ${decodedTokenInfo.userId}.`, errorMsg, error);
        return NextResponse.json({ success: false, error: 'Fehler bei der Passwortverifizierung.', details: errorMsg }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}