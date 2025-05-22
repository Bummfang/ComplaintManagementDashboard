// app/utils/authUtils.ts
import { NextApiRequest } from 'next'; // Für Pages API Routes
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedUser { // Struktur an Ihren AuthContext und TokenPayload anpassen
    userId: number;
    username: string;
    isAdmin: boolean;
    name: string;
    nachname: string;
}

interface TokenPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
    name: string;
    nachname: string;
    iat?: number;
    exp?: number;
}




/**
 * Verifiziert den JWT aus dem Authorization Header einer NextApiRequest (Pages Router)
 * und gibt die Benutzerdaten zurück oder null bei Fehlern.
 */
export async function verifyTokenAndGetUser(req: NextApiRequest): Promise<AuthenticatedUser | null> {
    if (!JWT_SECRET) {
        console.error(`[${new Date().toISOString()}] FATAL (authUtils): JWT_SECRET is not defined.`);
        // In einer Utility-Funktion werfen wir besser einen Fehler oder geben null zurück,
        // anstatt direkt eine HTTP-Antwort zu senden.
        return null; 
    }




    try {
        const authHeader = req.headers.authorization; // Kleingeschrieben für NextApiRequest
        if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
            // console.warn(`[${new Date().toISOString()}] (authUtils) Token verification failed: Missing or malformed Authorization header.`);
            return null;
        }




        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;




        if (typeof decoded.name === 'undefined' || 
            typeof decoded.nachname === 'undefined' ||
            typeof decoded.userId === 'undefined' ||
            typeof decoded.username === 'undefined' ||
            typeof decoded.isAdmin === 'undefined') {
            console.warn(`[${new Date().toISOString()}] (authUtils) Token verification: Token for user ${decoded.username} (ID: ${decoded.userId}) is missing essential fields.`);
            return null; // Token ist nicht valide genug
        }
        



        return {
            userId: decoded.userId,
            username: decoded.username,
            isAdmin: decoded.isAdmin,
            name: decoded.name,
            nachname: decoded.nachname,
        };



        
    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        if (error instanceof jwt.JsonWebTokenError) {
            // console.warn(`[${errorTimestamp}] (authUtils) Token verification failed (JsonWebTokenError): ${error.message}`);
        } else {
            console.error(`[${errorTimestamp}] (authUtils) Unexpected error during token verification:`, error);
        }
        return null;
    }
}