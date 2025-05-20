import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad anpassen
import jwt, { JwtPayload } from 'jsonwebtoken'; // JwtPayload importiert

// Dieses Interface spiegelt die Spaltennamen wider, wie sie in deiner DB-Tabelle 'beschwerde' sind
export interface BeschwerdeDbRow extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string;
    linie?: string;
    erstelltam: string;
    status?: AllowedStatus; // Wird später definiert
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null; // Wird durch JOIN erzeugt

    interne_notizen?: string;
    interne_klaerungsart?: 'written' | 'phone' | null;
    interne_teamleiter_informiert?: boolean;
    interne_bereichsleiter_informiert?: boolean;
    interne_an_subunternehmer_weitergeleitet?: boolean;
    interne_an_versicherung_weitergeleitet?: boolean;
    interne_geld_erstattet?: boolean;
    interne_erstattungsbetrag?: string; // Oder number
}

// Dieses Interface spiegelt die Struktur wider, wie das Frontend internal_details erwartet (camelCase)
export interface InternalCardData {
    generalNotes?: string;
    clarificationType?: 'written' | 'phone' | null; 
    teamLeadInformed?: boolean;
    departmentHeadInformed?: boolean;
    forwardedToSubcontractor?: boolean;
    forwardedToInsurance?: boolean;
    moneyRefunded?: boolean;
    refundAmount?: string; // Kann undefined, null oder ein String sein
}

// Das finale Objekt, das an das Frontend gesendet wird
export interface BeschwerdeApiResponse extends Omit<BeschwerdeDbRow,
    'interne_notizen' | 'interne_klaerungsart' | 'interne_teamleiter_informiert' |
    'interne_bereichsleiter_informiert' | 'interne_an_subunternehmer_weitergeleitet' |
    'interne_an_versicherung_weitergeleitet' | 'interne_geld_erstattet' | 'interne_erstattungsbetrag'
> {
    internal_details?: InternalCardData;
    action_required?: "relock_ui";
}

// Typ für den dekodierten JWT-Payload
interface DecodedToken extends JwtPayload {
    userId: number;
    username: string;
    isAdmin: boolean;
}

// Typ für den erwarteten Body der PATCH-Anfrage
interface PatchRequestBody {
    id: string | number; // ID kann als String oder Zahl ankommen
    status?: AllowedStatus;
    assign_me_as_bearbeiter?: boolean;
    internal_details?: InternalCardData; // internal_details ist optional
}

type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
const JWT_SECRET = process.env.JWT_SECRET;

function mapDbRowToApiResponse(row: BeschwerdeDbRow): BeschwerdeApiResponse {
    const {
        interne_notizen,
        interne_klaerungsart,
        interne_teamleiter_informiert,
        interne_bereichsleiter_informiert,
        interne_an_subunternehmer_weitergeleitet,
        interne_an_versicherung_weitergeleitet,
        interne_geld_erstattet,
        interne_erstattungsbetrag,
        ...restOfRow
    } = row;

    const apiResponse: BeschwerdeApiResponse = { ...restOfRow };

    if (
        interne_notizen !== undefined || interne_klaerungsart !== undefined ||
        interne_teamleiter_informiert !== undefined || interne_bereichsleiter_informiert !== undefined ||
        interne_an_subunternehmer_weitergeleitet !== undefined || interne_an_versicherung_weitergeleitet !== undefined ||
        interne_geld_erstattet !== undefined || interne_erstattungsbetrag !== undefined
    ) {
        apiResponse.internal_details = {
            generalNotes: interne_notizen,
            clarificationType: interne_klaerungsart,
            teamLeadInformed: interne_teamleiter_informiert,
            departmentHeadInformed: interne_bereichsleiter_informiert,
            forwardedToSubcontractor: interne_an_subunternehmer_weitergeleitet,
            forwardedToInsurance: interne_an_versicherung_weitergeleitet,
            moneyRefunded: interne_geld_erstattet,
            refundAmount: interne_erstattungsbetrag,
        };
    }
    return apiResponse;
}

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
        if (error instanceof Error) {
            console.error(`[${requestTimestamp}] Token Verifizierungsfehler:`, error.message);
        } else {
            console.error(`[${requestTimestamp}] Unbekannter Token Verifizierungsfehler:`, error);
        }
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
                b.interne_erstattungsbetrag
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
    if (!JWT_SECRET) { 
        console.error(`[${requestTimestamp}] JWT_SECRET nicht konfiguriert für PATCH.`);
        return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); 
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { 
        return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); 
    }
    const token = authHeader.split(' ')[1];
    
    let decodedTokenInfo: DecodedToken;
    try { 
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'string' || !decoded || 
            typeof (decoded as DecodedToken).userId !== 'number' ||
            typeof (decoded as DecodedToken).username !== 'string' ||
            typeof (decoded as DecodedToken).isAdmin !== 'boolean') {
            throw new Error('Ungültige Token-Payload-Struktur');
        }
        decodedTokenInfo = decoded as DecodedToken;
    } catch (error) {
        if (error instanceof Error) {
            console.error(`[${requestTimestamp}] Token Verifizierungsfehler (PATCH):`, error.message);
        } else {
            console.error(`[${requestTimestamp}] Unbekannter Token Verifizierungsfehler (PATCH):`, error);
        }
        return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); 
    }

    let requestBody: PatchRequestBody;
    let itemId: number;
    let newStatus: AllowedStatus | undefined;
    let assignMeAsBearbeiter: boolean | undefined;
    let internalDetailsFromClient: InternalCardData | undefined;

    try {
        requestBody = await request.json();

        if (requestBody.id === undefined || requestBody.id === null) {
             return NextResponse.json({ error: 'ID fehlt im Request Body.' }, { status: 400 });
        }
        itemId = parseInt(String(requestBody.id), 10); 
        
        newStatus = requestBody.status;
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true;
        internalDetailsFromClient = requestBody.internal_details;

        if (isNaN(itemId)) { return NextResponse.json({ error: 'Ungültige ID: Muss eine Zahl sein.' }, { status: 400 }); }
        if (newStatus && !allowedStatuses.includes(newStatus)) { return NextResponse.json({ error: 'Ungültiger Statuswert.' }, { status: 400 }); }
    
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unbekannter Fehler';
        console.error(`[${requestTimestamp}] Fehler beim Parsen des JSON-Body (PATCH):`, errorMsg, e);
        return NextResponse.json({ error: 'Ungültiger JSON-Body.', details: errorMsg }, { status: 400 });
    }

    let client: PoolClient | undefined;
    const actionResponsePayload: { action_required?: "relock_ui" } = {}; 

    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const currentItemResult = await client.query<BeschwerdeDbRow>(
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

        if (assignMeAsBearbeiter && currentItem.bearbeiter_id === null && decodedTokenInfo.userId) {
            setClauses.push(`bearbeiter_id = $${paramIndex++}`);
            updateQueryParams.push(decodedTokenInfo.userId);
        }
        if (newStatus) {
            setClauses.push(`status = $${paramIndex++}`);
            updateQueryParams.push(newStatus);
            if (newStatus === 'Gelöst' || newStatus === 'Abgelehnt') {
                setClauses.push(`abgeschlossenam = CURRENT_TIMESTAMP`);
            } else if (newStatus === 'Offen') {
                setClauses.push(`abgeschlossenam = NULL`);
                if (currentItem.status === 'Gelöst' || currentItem.status === 'Abgelehnt') {
                    setClauses.push(`bearbeiter_id = NULL`);
                    actionResponsePayload.action_required = "relock_ui";
                }
            }
        }

        if (internalDetailsFromClient) {
            if (internalDetailsFromClient.generalNotes !== undefined) { setClauses.push(`interne_notizen = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.generalNotes); }
            if (internalDetailsFromClient.clarificationType !== undefined) { setClauses.push(`interne_klaerungsart = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.clarificationType); }
            if (internalDetailsFromClient.teamLeadInformed !== undefined) { setClauses.push(`interne_teamleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.teamLeadInformed); }
            if (internalDetailsFromClient.departmentHeadInformed !== undefined) { setClauses.push(`interne_bereichsleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.departmentHeadInformed); }
            if (internalDetailsFromClient.forwardedToSubcontractor !== undefined) { setClauses.push(`interne_an_subunternehmer_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToSubcontractor); }
            if (internalDetailsFromClient.forwardedToInsurance !== undefined) { setClauses.push(`interne_an_versicherung_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToInsurance); }
            if (internalDetailsFromClient.moneyRefunded !== undefined) { setClauses.push(`interne_geld_erstattet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.moneyRefunded); }
            
            // *** HIER IST DIE KORRIGIERTE LOGIK für refundAmount ***
            if (internalDetailsFromClient.refundAmount !== undefined) {
                if (typeof internalDetailsFromClient.refundAmount === 'string' && internalDetailsFromClient.refundAmount.trim() !== "") {
                    // Nur ausführen, wenn refundAmount ein nicht-leerer String ist
                    const amountStr = internalDetailsFromClient.refundAmount.replace(',', '.'); 
                    const amount = parseFloat(amountStr);
                    setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`);
                    // Wenn Ihre DB-Spalte NUMERIC ist, verwenden Sie 'amount'. 
                    // Wenn TEXT, dann String(amount) oder amountStr (nach Validierung).
                    // Annahme: Ihre DB erwartet einen String oder NULL für 'interne_erstattungsbetrag'
                    updateQueryParams.push(isNaN(amount) ? null : String(amount)); 
                } else if (internalDetailsFromClient.refundAmount === null || 
                           (typeof internalDetailsFromClient.refundAmount === 'string' && internalDetailsFromClient.refundAmount.trim() === "")) {
                    // Wenn der Client explizit null sendet oder einen leeren String (nach Trimmen),
                    // und Sie dies als NULL in der DB speichern wollen:
                    setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`);
                    updateQueryParams.push(null);
                }
                // Wenn refundAmount ein anderer Typ ist oder undefined (was die äußere if-Bedingung abfängt), 
                // wird dieser Block nicht für die String-Operation ausgeführt, und interne_erstattungsbetrag wird nicht geändert.
            }
            // *** ENDE DER KORRIGIERTEN LOGIK für refundAmount ***
        }

        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE beschwerde SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
            const updateResult = await client.query<{ id: number }>(updateQueryText, updateQueryParams);
            if (updateResult.rowCount === 0) { 
                await client.query('ROLLBACK'); 
                return NextResponse.json({ error: 'Beschwerde konnte nicht aktualisiert werden.' }, { status: 404 }); 
            }
        }

        const finalSelectQuery = `
            SELECT b.id, b.name, b.email, b.tel, b.betreff, b.beschreibung,
                   b.beschwerdegrund, b.datum, b.uhrzeit, b.haltestelle, b.linie, 
                   b.erstelltam, b.status, b.abgeschlossenam, b.bearbeiter_id,
                   u.name || ' ' || u.nachname AS bearbeiter_name,
                   b.interne_notizen, b.interne_klaerungsart, b.interne_teamleiter_informiert,
                   b.interne_bereichsleiter_informiert, b.interne_an_subunternehmer_weitergeleitet,
                   b.interne_an_versicherung_weitergeleitet, b.interne_geld_erstattet, 
                   b.interne_erstattungsbetrag
            FROM beschwerde b
            LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `;
        const finalItemResult = await client.query<BeschwerdeDbRow>(finalSelectQuery, [itemId]);
        if (finalItemResult.rows.length === 0) { 
            await client.query('ROLLBACK'); 
            return NextResponse.json({ error: 'Beschwerde nach Update nicht gefunden.' }, { status: 404 }); 
        }

        const responseRow = mapDbRowToApiResponse(finalItemResult.rows[0]);
        const itemToSend = { ...responseRow, ...actionResponsePayload };

        await client.query('COMMIT');
        return NextResponse.json(itemToSend, { status: 200 });

    } catch (error) {
        if (client) { 
            try { await client.query('ROLLBACK'); } 
            catch (rbError) { console.error(`[${requestTimestamp}] Fehler beim Rollback (Beschwerde PATCH):`, rbError); } 
        }
        const errorMsg = error instanceof Error ? error.message : 'Interner Serverfehler.';
        const idForError = typeof itemId === 'number' && !isNaN(itemId) ? itemId : 'unbekannt';
        console.error(`[${requestTimestamp}] PATCH /api/containt (Beschwerde) Fehler für ID ${idForError}:`, errorMsg, error);
        return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}