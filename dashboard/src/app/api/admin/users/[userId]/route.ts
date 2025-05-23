// src/app/api/admin/users/[userId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad anpassen, falls nötig
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken extends JwtPayload {
    userId: number; // Die ID des Admins, der die Aktion ausführt
    isAdmin: boolean;
}



export async function DELETE(request: NextRequest,  context: { params: { userId: string }}) {
    const requestTimestamp = new Date().toISOString();

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: JWT_SECRET nicht definiert.`);
        return NextResponse.json({ success: false, error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    let performingAdmin: DecodedToken;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        if (!decoded.isAdmin) {
            console.warn(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: Zugriff verweigert. User ist kein Admin.`);
            return NextResponse.json({ success: false, error: 'Zugriff verweigert. Nur für Administratoren.' }, { status: 403 });
        }
        performingAdmin = decoded;
    } catch (error) {
        console.error(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: Ungültiges Token.`, error);
        return NextResponse.json({ success: false, error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    const userIdToDeleteStr = context.params.userId;
    const userIdToDelete = parseInt(userIdToDeleteStr, 10);

    if (isNaN(userIdToDelete)) {
        return NextResponse.json({ success: false, error: 'Ungültige Benutzer-ID zum Löschen.' }, { status: 400 });
    }

    // Sicherheitscheck: Admin kann sich nicht selbst löschen
    if (performingAdmin.userId === userIdToDelete) {
        console.warn(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: Admin (ID: ${performingAdmin.userId}) versuchter Selbstlöschung (ID: ${userIdToDelete}).`);
        return NextResponse.json({ success: false, error: 'Administratoren können sich nicht selbst löschen.' }, { status: 403 });
    }

    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        await client.query('BEGIN');

        // Optional: Prüfen, ob es der letzte Admin ist (falls du diese Logik möchtest)
        const adminCheckQuery = 'SELECT COUNT(*) AS admin_count FROM users WHERE ist_admin = TRUE AND id != $1';
        const adminCheckResult = await client.query(adminCheckQuery, [userIdToDelete]);
        const remainingAdmins = parseInt(adminCheckResult.rows[0].admin_count, 10);

        const targetUserIsAdminQuery = 'SELECT ist_admin FROM users WHERE id = $1';
        const targetUserResult = await client.query(targetUserIsAdminQuery, [userIdToDelete]);

        if (targetUserResult.rows.length === 0) {
             await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'Zu löschender Benutzer nicht gefunden.' }, { status: 404 });
        }

        const targetUserIsAdmin = targetUserResult.rows[0].ist_admin;

        if (targetUserIsAdmin && remainingAdmins === 0) {
            await client.query('ROLLBACK');
            console.warn(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: Versuch, den letzten Admin (ID: ${userIdToDelete}) zu löschen.`);
            return NextResponse.json({ success: false, error: 'Der letzte Administrator kann nicht gelöscht werden.' }, { status: 403 });
        }

        // WICHTIG: Umgang mit referenzieller Integrität
        // Wenn `bearbeiter_id` in `beschwerde`, `lob`, `anregung` auf `users.id` verweist
        // und `ON DELETE SET NULL` im Datenbankschema definiert ist,
        // dann werden diese Felder automatisch auf NULL gesetzt.
        // Andernfalls musst du das hier manuell tun oder es gibt einen Fehler.
        // Beispiel (falls nicht durch DB-Constraints abgedeckt):
        // await client.query('UPDATE beschwerde SET bearbeiter_id = NULL WHERE bearbeiter_id = $1', [userIdToDelete]);
        // await client.query('UPDATE lob SET bearbeiter_id = NULL WHERE bearbeiter_id = $1', [userIdToDelete]);
        // await client.query('UPDATE anregung SET bearbeiter_id = NULL WHERE bearbeiter_id = $1', [userIdToDelete]);

        const deleteUserQuery = 'DELETE FROM users WHERE id = $1 RETURNING username';
        const deleteResult = await client.query(deleteUserQuery, [userIdToDelete]);

        if (deleteResult.rowCount === 0) {
            // Sollte durch die Prüfung oben eigentlich nicht passieren, aber als Fallback
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'Benutzer konnte nicht gelöscht werden (nicht gefunden).' }, { status: 404 });
        }

        await client.query('COMMIT');
        const deletedUsername = deleteResult.rows[0].username;
        console.log(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: User ID ${userIdToDelete} (Username: ${deletedUsername}) erfolgreich gelöscht von Admin ID ${performingAdmin.userId}.`);
        return NextResponse.json({ success: true, message: `Benutzer "${deletedUsername}" erfolgreich gelöscht.` }, { status: 200 });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler.';
        console.error(`[${requestTimestamp}] DELETE /api/admin/users/[userId]: Fehler beim Löschen von User ID ${userIdToDelete}.`, errorMsg, error);
        return NextResponse.json({ success: false, error: 'Fehler beim Löschen des Benutzers.', details: errorMsg }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}