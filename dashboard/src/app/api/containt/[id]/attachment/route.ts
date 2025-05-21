// app/api/containt/[id]/attachment/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad zu deiner DB-Verbindung anpassen
import jwt, { JwtPayload } from 'jsonwebtoken';
// KORRIGIERTER IMPORT: Geht zwei Ebenen hoch zu 'app/api/containt/' und dann zu '_sharedApi.ts'
import { 
    BeschwerdeDbRow, 
    mapDbRowToApiResponse 
} from '../../_sharedApi'; // Pfad angepasst

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken extends JwtPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
}

// POST-Handler für den Datei-Upload
export async function POST(
    request: NextRequest, 
    { params }: { params: { id: string } } // Die ID kommt aus dem Pfadsegment [id]
) {
    const requestTimestamp = new Date().toISOString();
    const itemId = parseInt(params.id, 10);

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Ungültige Beschwerde-ID im Pfad.' }, { status: 400 });
    }

    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] JWT_SECRET nicht konfiguriert für Attachment-Upload.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        jwt.verify(token, JWT_SECRET);
        // Hier könntest du noch spezifischere Berechtigungsprüfungen durchführen, falls nötig
    } catch (error) {
        console.error(`[${requestTimestamp}] Token Verifizierungsfehler (Attachment POST):`, error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
    }

    let client: PoolClient | undefined;
    try {
        const formData = await request.formData();
        const file = formData.get('attachment') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Keine Datei im Upload gefunden. Das Feld muss "attachment" heißen.' }, { status: 400 });
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Ungültiger Dateityp. Nur PDF-Dateien sind erlaubt.' }, { status: 400 });
        }

        const MAX_FILE_SIZE_MB = 5;
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            return NextResponse.json({ error: `Datei ist zu groß. Maximale Größe: ${MAX_FILE_SIZE_MB}MB.` }, { status: 413 });
        }

        const fileName = file.name;
        const mimeType = file.type;
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        client = await getDbPool().connect();
        await client.query('BEGIN');

        const itemCheck = await client.query('SELECT id FROM beschwerde WHERE id = $1 FOR UPDATE', [itemId]);
        if (itemCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 });
        }

        const updateQuery = `
            UPDATE beschwerde 
            SET 
                attachment_filename = $1, 
                attachment_mimetype = $2, 
                attachment_data = $3
            WHERE id = $4;
        `;
        await client.query(updateQuery, [fileName, mimeType, fileBuffer, itemId]);
        
        const updatedItemResult = await client.query<BeschwerdeDbRow>(`
            SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM beschwerde b
            LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `, [itemId]);
        
        if (updatedItemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Fehler beim Abrufen des aktualisierten Items.' }, { status: 500 });
        }

        await client.query('COMMIT');
        
        const apiResponseData = mapDbRowToApiResponse(updatedItemResult.rows[0]);
        
        console.log(`[${requestTimestamp}] Datei erfolgreich für Beschwerde ID ${itemId} hochgeladen: ${fileName}`);
        return NextResponse.json(apiResponseData, { status: 200 });

    } catch (error) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (rbError) { console.error(`[${requestTimestamp}] Fehler beim Rollback (Attachment POST für ID ${itemId}):`, rbError); }
        }
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Datei-Upload.';
        console.error(`[${requestTimestamp}] Fehler beim Datei-Upload für Beschwerde ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Verarbeiten der Datei.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

// Zukünftige GET-Handler für Download
export async function GET(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    const requestTimestamp = new Date().toISOString();
    const itemId = parseInt(params.id, 10);

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Ungültige Beschwerde-ID im Pfad.' }, { status: 400 });
    }
     if (!JWT_SECRET) { /* ... JWT Secret Check ... */ return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { /* ... Auth Check ... */ return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); }
    const token = authHeader.split(' ')[1];
    try { jwt.verify(token, JWT_SECRET); } catch (error) { /* ... Token Verify Error ... */ return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });  }

    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        const result = await client.query<Pick<BeschwerdeDbRow, 'attachment_filename' | 'attachment_mimetype' | 'attachment_data'>>(
            'SELECT attachment_filename, attachment_mimetype, attachment_data FROM beschwerde WHERE id = $1',
            [itemId]
        );

        if (result.rows.length === 0 || !result.rows[0].attachment_data || !result.rows[0].attachment_filename) {
            return NextResponse.json({ error: 'Anhang nicht gefunden oder leer.' }, { status: 404 });
        }

        const { attachment_data, attachment_filename, attachment_mimetype } = result.rows[0];
        
        // Stelle sicher, dass attachment_data ein Buffer ist
        const buffer = Buffer.isBuffer(attachment_data) ? attachment_data : Buffer.from(attachment_data);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': attachment_mimetype || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment_filename)}"`,
            },
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler.';
        console.error(`[${requestTimestamp}] Fehler beim Abrufen des Anhangs für ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen des Anhangs.', details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}


// Zukünftiger DELETE-Handler für das Löschen von Anhängen
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const requestTimestamp = new Date().toISOString();
    const itemId = parseInt(params.id, 10);

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Ungültige Beschwerde-ID.' }, { status: 400 });
    }
    if (!JWT_SECRET) { /* ... */ return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { /* ... */ return NextResponse.json({ error: 'Authentifizierung erforderlich.' }, { status: 401 }); }
    const token = authHeader.split(' ')[1];
    try { jwt.verify(token, JWT_SECRET); } catch (e) { /* ... */ return NextResponse.json({ error: 'Ungültiges Token.' }, { status: 401 }); }

    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE beschwerde 
             SET attachment_filename = NULL, attachment_mimetype = NULL, attachment_data = NULL 
             WHERE id = $1 RETURNING id`,
            [itemId]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nicht gefunden oder Anhang konnte nicht entfernt werden.' }, { status: 404 });
        }

        // Hole das aktualisierte Item, um es zurückzugeben
        const finalItemResult = await client.query<BeschwerdeDbRow>(`
            SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM beschwerde b
            LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `, [itemId]);

        await client.query('COMMIT');

        if (finalItemResult.rows.length === 0) {
             return NextResponse.json({ error: 'Aktualisiertes Item nicht gefunden nach Löschen des Anhangs.' }, { status: 500 });
        }
        const apiResponseData = mapDbRowToApiResponse(finalItemResult.rows[0]);
        return NextResponse.json(apiResponseData, { status: 200 });

    } catch (error) {
        if (client) { try { await client.query('ROLLBACK'); } catch (rbErr) { console.error("Rollback Fehler (DELETE Attachment):", rbErr); } }
        const errorMsg = error instanceof Error ? error.message : 'Fehler beim Löschen des Anhangs.';
        console.error(`[${requestTimestamp}] Fehler beim Löschen des Anhangs für ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Löschen des Anhangs.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
