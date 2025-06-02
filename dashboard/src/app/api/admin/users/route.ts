// src/app/api/admin/users/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad anpassen, falls nötig
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;







// Typ für die Benutzerdaten, die wir senden (ohne Passwort)
interface UserListData {
    id: number;
    name: string;
    nachname: string;
    username: string;
    ist_admin: boolean;
}







interface DecodedToken extends JwtPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
    name?: string;     
    nachname?: string;
}







export async function GET(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();



    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] GET /api/admin/users: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }



    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }




    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        if (!decoded.isAdmin) {
            console.warn(`[${requestTimestamp}] GET /api/admin/users: Zugriff verweigert. User ist kein Admin.`);
            return NextResponse.json({ error: 'Zugriff verweigert. Nur für Administratoren.' }, { status: 403 });
        }
    } catch (error) {
        console.error(`[${requestTimestamp}] GET /api/admin/users: Ungültiges Token.`, error);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }


    
    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        // Wähle alle relevanten Spalten außer dem Passwort-Hash
        const result = await client.query<UserListData>(
            'SELECT id, name, nachname, username, ist_admin FROM users ORDER BY id ASC'
        );
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler.';
        console.error(`[${requestTimestamp}] GET /api/admin/users: Fehler beim Abrufen der Benutzerliste.`, errorMsg, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen der Benutzerliste.', details: errorMsg }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}