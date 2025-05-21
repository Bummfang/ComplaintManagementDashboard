// pages/api/beschwerden/[id]/attachment.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { parseForm, FormidableFile } from '@/app/utils/parseForm'; 
import { getDbPool } from '@/lib/db'; 
import { verifyTokenAndGetUser, AuthenticatedUser } from '@/app/utils/authUtils';

export const config = {
    api: {
        bodyParser: false, // Für POST (formidable) - für DELETE und GET nicht unbedingt nötig, aber schadet nicht, es einheitlich zu lassen
    },
};

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIMETYPE = 'application/pdf';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Authentifizierung für alle Methoden (POST, GET, DELETE)
    const user: AuthenticatedUser | null = await verifyTokenAndGetUser(req);
    if (!user) {
        return res.status(401).json({ error: "Nicht autorisiert oder Serverkonfigurationsfehler." });
    }

    const { id: complaintId } = req.query;
    if (!complaintId || typeof complaintId !== 'string' || isNaN(parseInt(complaintId))) {
        return res.status(400).json({ error: 'Beschwerde-ID fehlt oder ist ungültig.' });
    }
    const complaintIdNum = parseInt(complaintId);

    // POST-Anfrage für den Upload
    if (req.method === 'POST') {
        try {
            const { fields, files } = await parseForm(req);
            const uploadedFile = files.attachmentFile;

            if (!uploadedFile || (Array.isArray(uploadedFile) && uploadedFile.length === 0)) {
                return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
            }

            const file = (Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile) as FormidableFile;

            if (file.mimetype !== ALLOWED_MIMETYPE) {
                return res.status(400).json({ error: 'Ungültiger Dateityp. Nur PDFs sind erlaubt.' });
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                return res.status(400).json({ error: `Datei ist zu groß. Maximum ${MAX_FILE_SIZE_MB}MB.` });
            }

            const fs = require('fs').promises;
            const fileData = await fs.readFile(file.filepath);

            const pool = getDbPool(); 
            const client = await pool.connect(); 

            try {
                const queryText = `
                    UPDATE beschwerde
                    SET 
                        attachment_filename = $1,
                        attachment_mimetype = $2,
                        attachment_data = $3
                    WHERE id = $4
                    RETURNING id, attachment_filename, attachment_mimetype;
                `;
                // Wichtig: file.originalFilename könnte unsicher sein, ggf. sanitisieren oder einen eigenen Namen generieren.
                const originalFilename = file.originalFilename || 'attachment.pdf';


                const result = await client.query(queryText, [originalFilename, file.mimetype, fileData, complaintIdNum]);

                if (result.rowCount === 0) {
                    await fs.unlink(file.filepath); 
                    return res.status(404).json({ error: 'Beschwerde nicht gefunden oder Update fehlgeschlagen.' });
                }
                await fs.unlink(file.filepath); 
                return res.status(200).json({ 
                    message: 'Datei erfolgreich hochgeladen.', 
                    fileInfo: {
                        filename: result.rows[0].attachment_filename,
                        mimetype: result.rows[0].attachment_mimetype,
                    }
                });
            } finally {
                client.release(); 
            }
        } catch (error: any) {
            console.error('Fehler beim Dateiupload:', error);
            if (error.message && error.message.includes('maxFileSize exceeded')) {
                 return res.status(413).json({ error: `Datei ist zu groß. Maximum ${MAX_FILE_SIZE_MB}MB.`});
            }
            return res.status(500).json({ error: 'Serverfehler beim Hochladen der Datei.' });
        }
    } 
    // GET-Anfrage für den Download
    else if (req.method === 'GET') {
        try {
            const pool = getDbPool();
            const client = await pool.connect();
            try {
                const queryText = `
                    SELECT attachment_filename, attachment_mimetype, attachment_data 
                    FROM beschwerde 
                    WHERE id = $1;
                `;
                const result = await client.query(queryText, [complaintIdNum]);

                if (result.rowCount === 0 || !result.rows[0].attachment_data) {
                    return res.status(404).json({ error: 'Kein Anhang für diese Beschwerde gefunden.' });
                }

                const { attachment_filename, attachment_mimetype, attachment_data } = result.rows[0];

                res.setHeader('Content-Type', attachment_mimetype || 'application/octet-stream');
                // Sicherstellen, dass der Dateiname für den Header korrekt kodiert ist, falls er Sonderzeichen enthält.
                const encodedFilename = encodeURIComponent(attachment_filename || 'download.pdf');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
                res.send(attachment_data); 

            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error('Fehler beim Abrufen des Anhangs:', error);
            return res.status(500).json({ error: 'Serverfehler beim Abrufen des Anhangs.' });
        }
    }
    // DELETE-Anfrage zum Entfernen des Anhangs
    else if (req.method === 'DELETE') {
        try {
            const pool = getDbPool();
            const client = await pool.connect();
            try {
                const queryText = `
                    UPDATE beschwerde
                    SET 
                        attachment_filename = NULL,
                        attachment_mimetype = NULL,
                        attachment_data = NULL
                    WHERE id = $1
                    RETURNING id; -- Optional: um zu bestätigen, dass der Datensatz existiert und aktualisiert wurde
                `;
                const result = await client.query(queryText, [complaintIdNum]);

                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Beschwerde nicht gefunden, Anhang konnte nicht entfernt werden.' });
                }

                return res.status(200).json({ message: 'Anhang erfolgreich entfernt.' });

            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error('Fehler beim Entfernen des Anhangs:', error);
            return res.status(500).json({ error: 'Serverfehler beim Entfernen des Anhangs.' });
        }
    }
    else {
        res.setHeader('Allow', ['POST', 'GET', 'DELETE']); 
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
