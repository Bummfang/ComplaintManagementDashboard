import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

interface TokenPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
    name: string;      // Vorname aus dem Token erwartet
    nachname: string;  // Nachname aus dem Token erwartet
    iat?: number;      // Optional, wird von jwt hinzugefügt
    exp?: number;      // Optional, wird von jwt hinzugefügt
}

export async function POST(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();
    // console.log(`[${requestTimestamp}] API POST /api/verify-token: Verification attempt received.`);

    if (!JWT_SECRET) {
        console.error(`[${new Date().toISOString()}] FATAL for /api/verify-token: JWT_SECRET is not defined.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.', isValid: false }, { status: 500 });
    }

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // console.warn(`[${new Date().toISOString()}] Token verification failed for /api/verify-token: Missing or malformed Authorization header.`);
            return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.', isValid: false }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

        // Überprüfen, ob die erwarteten Felder im dekodierten Token vorhanden sind
        if (typeof decoded.name === 'undefined' || typeof decoded.nachname === 'undefined') {
             console.warn(`[${new Date().toISOString()}] Token verification for /api/verify-token: Token for user ${decoded.username} (ID: ${decoded.userId}) is missing name or nachname.`);
             // Optional: Hier könnte man einen Fehler zurückgeben oder den User ohne Namen/Nachnamen als gültig betrachten,
             // aber für die Begrüßung ist es besser, wenn sie da sind.
             // Für jetzt geben wir den User trotzdem zurück, aber loggen den Warnhinweis.
        }

        // console.log(`[${new Date().toISOString()}] Token verified successfully for /api/verify-token. User: ${decoded.username}, Admin: ${decoded.isAdmin}`);
        return NextResponse.json({
            isValid: true,
            user: { // Diese Struktur muss mit dem User-Typ im AuthContext übereinstimmen
                userId: decoded.userId,
                username: decoded.username,
                isAdmin: decoded.isAdmin,
                name: decoded.name,          // Vorname aus dem Token zurückgeben
                nachname: decoded.nachname,  // Nachname aus dem Token zurückgeben
            },
        }, { status: 200 });

    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        if (error instanceof jwt.JsonWebTokenError) {
            // console.warn(`[${errorTimestamp}] Token verification failed for /api/verify-token (JsonWebTokenError): ${error.message}`);
            return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.', details: error.message, isValid: false }, { status: 401 });
        }
        console.error(`[${errorTimestamp}] Unexpected error during token verification (/api/verify-token):`, error);
        return NextResponse.json({ error: 'Interner Serverfehler bei der Token-Verifizierung.', details: (error instanceof Error ? error.message : 'Unbekannter Fehler'), isValid: false }, { status: 500 });
    }
}