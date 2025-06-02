// app/utils/parseForm.ts
import 'server-only';
import { NextApiRequest } from 'next';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';

// Definition für das, was parseForm zurückgibt
export interface ParsedForm {
    fields: formidable.Fields;
    files: formidable.Files;
}



// Damit FormidableFile direkt genutzt werden kann, falls Ihre Typen es nicht kennen
export type { FormidableFile };





export const parseForm = (req: NextApiRequest): Promise<ParsedForm> => {
    const form = formidable({
        maxFileSize: 5 * 1024 * 1024, // Gleiches Limit wie im Handler
        // uploadDir: '/tmp', // Ggf. anpassen oder formidable die OS-Defaults nutzen lassen
    });
    return new Promise((resolve, reject) => {
        // KORREKTUR: 'err: any' ersetzt durch 'err: Error | null'
        form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
            if (err) {
                return reject(err);
            }
            resolve({ fields, files });
        });
    });
};