// app/api/containt/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg'; 
import { getDbPool } from '@/lib/db'; 
import jwt, { JwtPayload } from 'jsonwebtoken'; 


import { 
    BeschwerdeDbRow, 
    BeschwerdeApiResponse, 
    mapDbRowToApiResponse,
    allowedStatusesList 
} from './_sharedApi'; 

import { InternalCardData as FrontendInternalCardData, AllowedBeschwerdeStatus } from '@/app/types'; 

interface DecodedToken extends JwtPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
}

interface PatchRequestBody {
    id: string | number; 
    status?: AllowedBeschwerdeStatus; 
    assign_me_as_bearbeiter?: boolean;
    internal_details?: FrontendInternalCardData; 
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
    const requestTimestamp = new Date().toISOString();
    if (!JWT_SECRET) { 
        console.error(`[${requestTimestamp}] JWT_SECRET nicht konfiguriert.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); 
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { 
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); 
    }
    const token = authHeader.split(' ')[1];

    try { 
        jwt.verify(token, JWT_SECRET); 
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Token Fehler';
        console.error(`[${requestTimestamp}] Token Verifizierungsfehler:`, errorMessage);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); 
    }

    const poolToUse = getDbPool();
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        const query = `
            SELECT
                b.id, b.name, b.email, b.tel, b.betreff, b.beschreibung,
                b.beschwerdegrund, b.datum, b.uhrzeit, b.haltestelle, b.linie, 
                b.erstelltam, b.status, b.abgeschlossenam, b.bearbeiter_id,
                u.name || ' ' || u.nachname AS bearbeiter_name,
                b.interne_notizen, 
                b.interne_klaerungsart, 
                b.interne_teamleiter_informiert,
                b.interne_bereichsleiter_informiert, 
                b.interne_an_subunternehmer_weitergeleitet,
                b.interne_an_versicherung_weitergeleitet, 
                b.interne_geld_erstattet, 
                b.interne_erstattungsbetrag,
                b.attachment_filename,
                b.attachment_mimetype
            FROM "beschwerde" b
            LEFT JOIN "users" u ON b.bearbeiter_id = u.id
            ORDER BY b.erstelltam DESC;
        `;
        const result = await client.query<BeschwerdeDbRow>(query);
        const responseData = result.rows.map(mapDbRowToApiResponse);
        return NextResponse.json(responseData, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
        console.error(`[${requestTimestamp}] Fehler beim Abrufen von Beschwerden (/api/containt):`, errorMessage, error);
        return NextResponse.json({ error: 'Fehler beim Abrufen von Beschwerden.', details: errorMessage }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestTimestamp = new Date().toISOString();
    if (!JWT_SECRET) { return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); }
    const token = authHeader.split(' ')[1];
    
    let decodedTokenInfo: DecodedToken;
    try { 
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded !== 'object' || decoded === null ||
            typeof decoded.userId !== 'number' ||
            typeof decoded.username !== 'string' ||
            typeof decoded.isAdmin !== 'boolean') {
            throw new Error('Ungültige Token-Payload-Struktur');
        }
        decodedTokenInfo = decoded as DecodedToken;
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Token Fehler';
        console.error(`[${requestTimestamp}] Token Verifizierungsfehler (PATCH):`, errorMessage);
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); 
    }

    let requestBody: PatchRequestBody;
    let itemId: number;
    try {
        requestBody = await request.json();
        if (requestBody.id === undefined || requestBody.id === null) {
            return NextResponse.json({ error: 'ID fehlt im Request Body.' }, { status: 400 });
        }
        itemId = parseInt(String(requestBody.id), 10); 
        if (isNaN(itemId)) { return NextResponse.json({ error: 'Ungültige ID: Muss eine Zahl sein.' }, { status: 400 }); }
        
        const { status: newStatus, internal_details: internalDetailsFromClient, assign_me_as_bearbeiter } = requestBody;

        if (newStatus && !allowedStatusesList.includes(newStatus)) { 
            return NextResponse.json({ error: 'Ungültiger Statuswert.' }, { status: 400 }); 
        }
    
        let client: PoolClient | undefined;
        const actionResponsePayload: { action_required?: "relock_ui" } = {}; 

        try {
            client = await getDbPool().connect();
            await client.query('BEGIN');

            const currentItemResult = await client.query<Pick<BeschwerdeDbRow, 'status' | 'bearbeiter_id'>>(
                'SELECT status, bearbeiter_id FROM beschwerde WHERE id = $1 FOR UPDATE', [itemId]
            );
            if (currentItemResult.rows.length === 0) { 
                await client.query('ROLLBACK'); 
                return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 }); 
            }
            const currentItem = currentItemResult.rows[0];

            const setClauses: string[] = [];
            const updateQueryParams: (string | number | boolean | null | undefined)[] = [];
            let paramIndex = 1;

            if (assign_me_as_bearbeiter && currentItem.bearbeiter_id === null && decodedTokenInfo.userId) {
                setClauses.push(`bearbeiter_id = $${paramIndex++}`);
                updateQueryParams.push(decodedTokenInfo.userId);
                if (currentItem.status === 'Offen' && (!newStatus || newStatus === 'Offen')) {
                     if (!setClauses.some(c => c.startsWith('status'))) {
                        setClauses.push(`status = $${paramIndex++}`);
                        updateQueryParams.push('In Bearbeitung' as AllowedBeschwerdeStatus);
                     }
                }
            }
            
            if (newStatus) {
                 if (!setClauses.some(c => c.startsWith('status'))) { 
                    setClauses.push(`status = $${paramIndex++}`);
                    updateQueryParams.push(newStatus);
                 }
                if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
                    setClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
                } else if (newStatus === 'Offen') {
                    setClauses.push(`abgeschlossenam = NULL`);
                    if (currentItem.status === 'Gelöst' || currentItem.status === 'Abgelehnt') {
                        if (!setClauses.some(c => c.startsWith('bearbeiter_id'))) {
                            setClauses.push(`bearbeiter_id = NULL`);
                        }
                        actionResponsePayload.action_required = "relock_ui";
                    }
                }
            }

            if (internalDetailsFromClient) {
                if (internalDetailsFromClient.generalNotes !== undefined) { setClauses.push(`interne_notizen = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.generalNotes); }
                if (internalDetailsFromClient.clarificationType !== undefined) { 
                    let dbClarificationType: 'written' | 'phone' | null = null;
                    if (internalDetailsFromClient.clarificationType === 'schriftlich') dbClarificationType = 'written';
                    else if (internalDetailsFromClient.clarificationType === 'telefonisch') dbClarificationType = 'phone';
                    setClauses.push(`interne_klaerungsart = $${paramIndex++}`); 
                    updateQueryParams.push(dbClarificationType); 
                }
                if (internalDetailsFromClient.teamLeadInformed !== undefined) { setClauses.push(`interne_teamleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.teamLeadInformed); }
                if (internalDetailsFromClient.departmentHeadInformed !== undefined) { setClauses.push(`interne_bereichsleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.departmentHeadInformed); }
                if (internalDetailsFromClient.forwardedToSubcontractor !== undefined) { setClauses.push(`interne_an_subunternehmer_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToSubcontractor); }
                if (internalDetailsFromClient.forwardedToInsurance !== undefined) { setClauses.push(`interne_an_versicherung_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToInsurance); }
                if (internalDetailsFromClient.moneyRefunded !== undefined) { setClauses.push(`interne_geld_erstattet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.moneyRefunded); }
                
                if (internalDetailsFromClient.refundAmount !== undefined) {
                    if (internalDetailsFromClient.moneyRefunded && typeof internalDetailsFromClient.refundAmount === 'string' && internalDetailsFromClient.refundAmount.trim() !== "") {
                        const amountStr = internalDetailsFromClient.refundAmount.replace(',', '.'); 
                        const amount = parseFloat(amountStr);
                        setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`);
                        updateQueryParams.push(isNaN(amount) ? null : String(amount)); 
                    } else if (!internalDetailsFromClient.moneyRefunded || (typeof internalDetailsFromClient.refundAmount === 'string' && internalDetailsFromClient.refundAmount.trim() === "")) {
                        setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`);
                        updateQueryParams.push(null);
                    }
                } else if (internalDetailsFromClient.moneyRefunded === false) {
                     setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`);
                     updateQueryParams.push(null);
                }
            }

            if (setClauses.length > 0) {
                updateQueryParams.push(itemId);
                const updateQueryText = `UPDATE beschwerde SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
                const updateResult = await client.query<{ id: number }>(updateQueryText, updateQueryParams);
                if (updateResult.rowCount === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Beschwerde konnte nicht aktualisiert werden.' }, { status: 404 });  }
            }

            const finalSelectQuery = `
                SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
                FROM beschwerde b
                LEFT JOIN users u ON b.bearbeiter_id = u.id
                WHERE b.id = $1;
            `;
            const finalItemResult = await client.query<BeschwerdeDbRow>(finalSelectQuery, [itemId]);
            if (finalItemResult.rows.length === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Beschwerde nach Update nicht gefunden.' }, { status: 404 }); }

            const responseRow = mapDbRowToApiResponse(finalItemResult.rows[0]);
            const itemToSend = { ...responseRow, ...actionResponsePayload };

            await client.query('COMMIT');
            return NextResponse.json(itemToSend, { status: 200 });

        } catch (error) {
            if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error(`[${requestTimestamp}] Fehler beim Rollback (Beschwerde PATCH für ID ${itemId}):`, rbError); } }
            const errorMsg = error instanceof Error ? error.message : 'Interner Serverfehler.';
            console.error(`[${requestTimestamp}] PATCH /api/containt (Beschwerde) Fehler für ID ${itemId}:`, errorMsg, error);
            return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage.", details: errorMsg }, { status: 500 });
        } finally {
            if (client) client.release();
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unbekannter Fehler beim Parsen des JSON-Body.';
        console.error(`[${requestTimestamp}] Fehler beim Parsen des JSON-Body (PATCH):`, errorMsg, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body.', details: errorMsg }, { status: 400 });
    }
}
