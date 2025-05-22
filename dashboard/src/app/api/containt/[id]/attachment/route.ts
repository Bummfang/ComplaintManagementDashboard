// app/api/containt/[id]/attachment/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { BeschwerdeDbRow,mapDbRowToApiResponse,allowedStatusesList } from '../../_sharedApi'; 
import {InternalCardData as FrontendInternalCardData,AllowedBeschwerdeStatus } from '@/app/types';




const JWT_SECRET = process.env.JWT_SECRET;






interface ResolvedParamsType {
    id: string;
}

interface ExpectedRouteContext {
    params: Promise<ResolvedParamsType>;
}




async function preProcessRequest(
    request: NextRequest,
    resolvedParams: ResolvedParamsType,
    needsFormData: boolean = false
): Promise<{
    errorResponse?: NextResponse,
    itemId?: number,
    token?: string,
    requestTimestamp?: string,
    formData?: FormData
}> {
    const requestTimestamp = new Date().toISOString();
    let formDataToReturn: FormData | undefined;

    if (needsFormData && request.method === 'POST') {
        try {
            formDataToReturn = await request.formData();
        } catch (e) {
            console.error(`[${requestTimestamp}] Fehler beim Verarbeiten von FormData:`, e);
            return { errorResponse: NextResponse.json({ error: 'Fehler beim Verarbeiten der Anfrage-Daten.' }, { status: 400 }) };
        }
    } else if (request.method !== 'POST' && needsFormData) { 
        // Mache nichts hier, wenn keine FormData benötigt oder falsche Methode
    }


    const itemIdStr = resolvedParams.id;
    const itemId = parseInt(itemIdStr, 10);



    if (isNaN(itemId)) {
        return { errorResponse: NextResponse.json({ error: 'Ungültige Beschwerde-ID im Pfad.' }, { status: 400 }) };
    }



    if (!JWT_SECRET) {
        console.error(`[${requestTimestamp}] JWT_SECRET nicht konfiguriert.`);
        return { errorResponse: NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }) };
    }



    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { errorResponse: NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }) };
    }
    const token = authHeader.split(' ')[1];




    try {
        jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error(`[${requestTimestamp}] Token Verifizierungsfehler (${request.method}):`, error instanceof Error ? error.message : String(error));
        return { errorResponse: NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }) };
    }
    return { itemId, token, requestTimestamp, formData: formDataToReturn };
}



















// POST-Handler für den Datei-Upload
export async function POST(
    request: NextRequest,
    context: ExpectedRouteContext
) {
    const resolvedParams = await context.params;
    const processed = await preProcessRequest(request, resolvedParams, true); // needsFormData = true
    if (processed.errorResponse) return processed.errorResponse;

    const { itemId, token, requestTimestamp, formData } = processed;

    if (itemId === undefined || !token || !requestTimestamp || !formData) {
        return NextResponse.json({ error: 'Interne Fehler bei der Vorverarbeitung der Anfrage für POST.' }, { status: 500 });
    }

    let client: PoolClient | undefined;
    try {
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

        const statusFromFormData = formData.get('status') as string | null;
        const internalDetailsJson = formData.get('internal_details_json') as string | null;
        let internalDetailsFromFormData: FrontendInternalCardData | undefined;
        if (internalDetailsJson) {
            try {
                internalDetailsFromFormData = JSON.parse(internalDetailsJson);
            } catch (e) {
                console.warn(`[${requestTimestamp}] Konnte internal_details_json nicht parsen (ID: ${itemId}):`, e);
            }
        }

        client = await getDbPool().connect();
        await client.query('BEGIN');

        const itemCheck = await client.query('SELECT id, status FROM beschwerde WHERE id = $1 FOR UPDATE', [itemId]);
        if (itemCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 });
        }
        // const currentItemStatus = itemCheck.rows[0].status; // Aktuellen Status für evtl. Logik speichern

        const updateClauses = [
            'attachment_filename = $1',
            'attachment_mimetype = $2',
            'attachment_data = $3'
        ];
        const queryParams: (string | number | boolean | Buffer | null)[] = [fileName, mimeType, fileBuffer];
        let paramIdx = 4;

        // Status nur aktualisieren, wenn ein gültiger Wert vom Client kommt
        if (statusFromFormData) {
            if (allowedStatusesList.includes(statusFromFormData as AllowedBeschwerdeStatus)) {
                updateClauses.push(`status = $${paramIdx++}`);
                queryParams.push(statusFromFormData);
                if (statusFromFormData === 'Gelöst' || statusFromFormData === 'Abgelehnt') {
                    updateClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
                } else if (statusFromFormData === 'Offen') {
                    updateClauses.push(`abgeschlossenam = NULL`);
                }
            } else {
                console.warn(`[${requestTimestamp}] Ungültiger Statuswert '${statusFromFormData}' in FormData beim Datei-Upload für ID ${itemId} ignoriert.`);
                // Optional: Fehler zurückgeben, statt zu ignorieren
                // await client.query('ROLLBACK');
                // return NextResponse.json({ error: `Ungültiger Statuswert in FormData: ${statusFromFormData}` }, { status: 400 });
            }
        }

        if (internalDetailsFromFormData) {
            // (Logik für internalDetailsFromFormData bleibt wie in deiner Originaldatei)
            if (internalDetailsFromFormData.generalNotes !== undefined) { updateClauses.push(`interne_notizen = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.generalNotes); }
            if (internalDetailsFromFormData.clarificationType !== undefined) { updateClauses.push(`interne_klaerungsart = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.clarificationType); }
            if (internalDetailsFromFormData.teamLeadInformed !== undefined) { updateClauses.push(`interne_teamleiter_informiert = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.teamLeadInformed); }
            if (internalDetailsFromFormData.departmentHeadInformed !== undefined) { updateClauses.push(`interne_bereichsleiter_informiert = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.departmentHeadInformed); }
            if (internalDetailsFromFormData.forwardedToSubcontractor !== undefined) { updateClauses.push(`interne_an_subunternehmer_weitergeleitet = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.forwardedToSubcontractor); }
            if (internalDetailsFromFormData.forwardedToInsurance !== undefined) { updateClauses.push(`interne_an_versicherung_weitergeleitet = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.forwardedToInsurance); }
            if (internalDetailsFromFormData.moneyRefunded !== undefined) { updateClauses.push(`interne_geld_erstattet = $${paramIdx++}`); queryParams.push(internalDetailsFromFormData.moneyRefunded); }
            if (internalDetailsFromFormData.refundAmount !== undefined) {
                if (internalDetailsFromFormData.moneyRefunded && typeof internalDetailsFromFormData.refundAmount === 'string' && internalDetailsFromFormData.refundAmount.trim() !== "") {
                    const amountStr = internalDetailsFromFormData.refundAmount.replace(',', '.');
                    const amount = parseFloat(amountStr);
                    updateClauses.push(`interne_erstattungsbetrag = $${paramIdx++}`);
                    queryParams.push(isNaN(amount) ? null : String(amount));
                } else if (!internalDetailsFromFormData.moneyRefunded || (typeof internalDetailsFromFormData.refundAmount === 'string' && internalDetailsFromFormData.refundAmount.trim() === "")) {
                    updateClauses.push(`interne_erstattungsbetrag = $${paramIdx++}`);
                    queryParams.push(null);
                }
            } else if (internalDetailsFromFormData.moneyRefunded === false) {
                updateClauses.push(`interne_erstattungsbetrag = $${paramIdx++}`);
                queryParams.push(null);
            }
        }

        queryParams.push(itemId); // itemId für die WHERE-Klausel

        // Nur updaten, wenn es tatsächlich etwas zu updaten gibt (mindestens Anhang)
        // Die Klauseln für den Anhang sind immer dabei, also ist updateClauses.length immer > 0
        const updateQueryText = `UPDATE beschwerde SET ${updateClauses.join(', ')} WHERE id = $${paramIdx};`;
        await client.query(updateQueryText, queryParams);

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

        // mapDbRowToApiResponse wird den Status validieren/defaulten
        const apiResponseData = mapDbRowToApiResponse(updatedItemResult.rows[0]);
        console.log(`[${requestTimestamp}] POST /api/containt/[id]/attachment - Status für ID ${itemId} nach mapDbRowToApiResponse: ${apiResponseData.status}`);
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






















// GET Handler (unverändert von deiner Datei)
export async function GET(
    request: NextRequest,
    context: ExpectedRouteContext // Stelle sicher, dass ExpectedRouteContext definiert ist
) {
    const resolvedParams = await context.params; // Stelle sicher, dass context.params korrekt aufgelöst wird
    const { errorResponse, itemId, token, requestTimestamp } = await preProcessRequest(request, resolvedParams);
    if (errorResponse) return errorResponse;

    if (itemId === undefined || !token || !requestTimestamp) {
        return NextResponse.json({ error: 'Interne Fehler bei der Vorverarbeitung der Anfrage für GET.' }, { status: 500 });
    }

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

        // Nach der obigen Prüfung ist sicher, dass attachment_data ein Buffer ist.
        const attachment_data: Buffer = result.rows[0].attachment_data;
        const attachment_filename: string = result.rows[0].attachment_filename; // Annahme: filename ist immer string
        const attachment_mimetype: string | null | undefined = result.rows[0].attachment_mimetype;

        // KORRIGIERTE ZEILE: Da attachment_data hier garantiert ein Buffer ist,
        // ist die Überprüfung und der Cast nicht mehr nötig.
        const buffer: Buffer = attachment_data;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': attachment_mimetype || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment_filename)}"`,
            },
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Datenbankfehler.';
        // requestTimestamp ist hier definiert
        console.error(`[${requestTimestamp}] Fehler beim Abrufen des Anhangs (ID ${itemId}):`, errorMsg, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen des Anhangs.', details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}























// DELETE Handler (unverändert von deiner Datei, profitiert von mapDbRowToApiResponse Korrektur)
export async function DELETE(
    request: NextRequest,
    context: ExpectedRouteContext
) {
    const resolvedParams = await context.params;
    const { errorResponse, itemId, token, requestTimestamp } = await preProcessRequest(request, resolvedParams);
    if (errorResponse) return errorResponse;

    if (itemId === undefined || !token || !requestTimestamp) return NextResponse.json({ error: 'Interne Fehler bei der Vorverarbeitung der Anfrage für DELETE.' }, { status: 500 });

    let client: PoolClient | undefined;
    try {
        client = await getDbPool().connect();
        await client.query('BEGIN');
        const updateResult = await client.query(
            `UPDATE beschwerde SET attachment_filename = NULL, attachment_mimetype = NULL, attachment_data = NULL WHERE id = $1 RETURNING id`,
            [itemId]
        );
        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Beschwerde nicht gefunden oder Anhang konnte nicht entfernt werden.' }, { status: 404 });
        }
        const finalItemResult = await client.query<BeschwerdeDbRow>(`
            SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM beschwerde b LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `, [itemId]);
        await client.query('COMMIT');
        if (finalItemResult.rows.length === 0) {
            return NextResponse.json({ error: 'Aktualisiertes Item nicht gefunden nach Löschen des Anhangs.' }, { status: 500 });
        }
        // mapDbRowToApiResponse wird den Status validieren/defaulten
        const apiResponseData = mapDbRowToApiResponse(finalItemResult.rows[0]);
        console.log(`[${requestTimestamp}] DELETE /api/containt/[id]/attachment - Status für ID ${itemId} nach mapDbRowToApiResponse: ${apiResponseData.status}`);
        return NextResponse.json(apiResponseData, { status: 200 });
    } catch (error) {
        const ts = requestTimestamp || new Date().toISOString();
        if (client) { try { await client.query('ROLLBACK'); } catch (rbErr) { console.error(`[${ts}] Rollback Fehler (DELETE Attachment ID ${itemId}):`, rbErr); } }
        const errorMsg = error instanceof Error ? error.message : 'Fehler beim Löschen des Anhangs.';
        console.error(`[${ts}] Fehler beim Löschen des Anhangs für ID ${itemId}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Löschen des Anhangs.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}