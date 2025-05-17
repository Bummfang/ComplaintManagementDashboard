// app/api/verify-token/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Lade das JWT_SECRET aus den Umgebungsvariablen
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Interface für den erwarteten Payload im JWT.
 * Stelle sicher, dass dies den Daten entspricht, die du beim Login
 * in das Token packst (siehe /api/login/route.ts -> tokenPayload).
 */
interface TokenPayload {
    userId: number;
    username: string;
    isAdmin: boolean; // Dieses Feld muss im Token vorhanden sein
    // iat (issued at) und exp (expires at) werden automatisch von jwt hinzugefügt
}

export async function POST(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] API POST /api/verify-token: Verification attempt received.`);

    // Sicherheitsüberprüfung: Ist das JWT_SECRET vorhanden?
    if (!JWT_SECRET) {
        console.error(`[${new Date().toISOString()}] FATAL for /api/verify-token: JWT_SECRET is not defined in environment variables.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.', details: 'JWT Secret nicht konfiguriert.', isValid: false }, { status: 500 });
    }

    try {
        // Extrahiere das Token aus dem Authorization-Header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`[${new Date().toISOString()}] Token verification failed for /api/verify-token: Missing or malformed Authorization header.`);
            return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.', isValid: false }, { status: 401 });
        }

        const token = authHeader.split(' ')[1]; // Extrahiere das Token nach "Bearer "

        // Verifiziere das Token
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

        // Token ist gültig, Benutzerdaten zurückgeben.
        // Diese Struktur sollte mit dem 'User' Interface im AuthContext übereinstimmen.
        console.log(`[${new Date().toISOString()}] Token verified successfully for /api/verify-token. User: ${decoded.username}, Admin: ${decoded.isAdmin}`);
        return NextResponse.json({
            isValid: true,
            user: {
                userId: decoded.userId,
                username: decoded.username,
                isAdmin: decoded.isAdmin,
                // Falls du 'name' und 'nachname' auch im AuthContext initial haben möchtest
                // und sie nicht im Token sind, müsstest du sie hier ggf. aus der Datenbank nachladen.
                // Für dieses Beispiel nehmen wir an, die im Token enthaltenen Daten reichen für den initialen User-State.
            },
        }, { status: 200 });

    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        // Spezifische Fehlerbehandlung für JWT-Fehler (abgelaufen, ungültige Signatur etc.)
        if (error instanceof jwt.JsonWebTokenError) {
            console.warn(`[${errorTimestamp}] Token verification failed for /api/verify-token (JsonWebTokenError): ${error.message}`);
            return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.', details: error.message, isValid: false }, { status: 401 });
        }
        // Fallback für andere, unerwartete Fehler
        console.error(`[${errorTimestamp}] Unexpected error during token verification (/api/verify-token):`, error);
        return NextResponse.json({ error: 'Interner Serverfehler bei der Token-Verifizierung.', details: (error instanceof Error ? error.message : 'Unbekannter Fehler'), isValid: false }, { status: 500 });
    }
}
