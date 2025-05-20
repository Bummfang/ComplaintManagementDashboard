// src/app/api/containt/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type QueryResultRow, type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db'; // Pfad anpassen
import jwt from 'jsonwebtoken';

// Dieses Interface spiegelt die Spaltennamen wider, wie sie in deiner DB-Tabelle 'beschwerde' sind
// (basierend auf deinem letzten Screenshot)
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
    status?: AllowedStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null; // Wird durch JOIN erzeugt

    // Deine spezifischen Spaltennamen aus dem Screenshot
    interne_notizen?: string;
    interne_klaerungsart?: 'written' | 'phone' | null; // Angenommen, dies sind die möglichen Werte
    interne_teamleiter_informiert?: boolean;
    interne_bereichsleiter_informiert?: boolean;
    interne_an_subunternehmer_weitergeleitet?: boolean;
    interne_an_versicherung_weitergeleitet?: boolean;
    interne_geld_erstattet?: boolean;
    interne_erstattungsbetrag?: string; // Oder number, falls du es direkt als Zahl aus der DB holst
}

// Dieses Interface spiegelt die Struktur wider, wie das Frontend internal_details erwartet (camelCase)
// und wie es auch von CardSpecificDataItem verwendet wird.
export interface InternalCardData {
    generalNotes?: string;
    clarificationType?: 'written' | 'phone' | null;
    teamLeadInformed?: boolean;
    departmentHeadInformed?: boolean;
    forwardedToSubcontractor?: boolean;
    forwardedToInsurance?: boolean;
    moneyRefunded?: boolean;
    refundAmount?: string;
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
        ...restOfRow // Alle anderen Spalten der BeschwerdeDbRow
    } = row;

    const apiResponse: BeschwerdeApiResponse = { ...restOfRow };

    // Nur ein internal_details Objekt erstellen, wenn mindestens ein Feld dafür vorhanden ist
    // Dies ist optional, je nachdem, ob das Frontend immer ein leeres Objekt erwartet oder nicht
    if (interne_notizen !== undefined || interne_klaerungsart !== undefined /* ... etc. ... */) {
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
    if (!JWT_SECRET) { return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) { return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 }); }
    const token = authHeader.split(' ')[1];
    try { jwt.verify(token, JWT_SECRET); } catch (error) { return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); }

    const poolToUse = getDbPool();
    let client: PoolClient | undefined;
    try {
        client = await poolToUse.connect();
        // SQL Query verwendet jetzt DEINE Spaltennamen
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
        console.error(`[${requestTimestamp}] Fehler beim Abrufen von Beschwerden (/api/containt):`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
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
    let decodedTokenInfo: { userId: number; username: string; isAdmin: boolean };
    try { decodedTokenInfo = jwt.verify(token, JWT_SECRET) as any; } catch (error) { return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); }

    let requestBody;
    let itemId: number;
    let newStatus: AllowedStatus | undefined;
    let assignMeAsBearbeiter: boolean | undefined;
    let internalDetailsFromClient: InternalCardData | undefined; // Erwartet camelCase vom Client

    try {
        requestBody = await request.json();
        itemId = parseInt(requestBody.id, 10);
        newStatus = requestBody.status;
        assignMeAsBearbeiter = requestBody.assign_me_as_bearbeiter === true;
        internalDetailsFromClient = requestBody.internal_details;

        if (isNaN(itemId)) { return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 }); }
        if (newStatus && !allowedStatuses.includes(newStatus)) { return NextResponse.json({ error: 'Ungültiger Status.' }, { status: 400 }); }
    } catch (e) { return NextResponse.json({ error: 'Ungültiger JSON-Body.' }, { status: 400 }); }

    let client: PoolClient | undefined;
    try {
        const pool = getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const currentItemResult = await client.query<BeschwerdeDbRow>(
            'SELECT * FROM beschwerde WHERE id = $1 FOR UPDATE', [itemId]
        );
        if (currentItemResult.rows.length === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Beschwerde nicht gefunden.' }, { status: 404 }); }
        
        const setClauses: string[] = [];
        const updateQueryParams: (string | number | boolean | null | undefined)[] = [];
        let paramIndex = 1;
        const actionResponsePayload: { action_required?: "relock_ui" } = {};

        // Status- und Bearbeiterlogik (wie gehabt)
        if (assignMeAsBearbeiter && currentItemResult.rows[0].bearbeiter_id === null && decodedTokenInfo.userId) {
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
                if (currentItemResult.rows[0].status === 'Gelöst' || currentItemResult.rows[0].status === 'Abgelehnt') {
                    setClauses.push(`bearbeiter_id = NULL`);
                    actionResponsePayload.action_required = "relock_ui";
                }
            }
        }

        // SET-Klauseln für internal_details hinzufügen, mit deinen Spaltennamen
        if (internalDetailsFromClient) {
            if (internalDetailsFromClient.generalNotes !== undefined) { setClauses.push(`interne_notizen = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.generalNotes); }
            if (internalDetailsFromClient.clarificationType !== undefined) { setClauses.push(`interne_klaerungsart = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.clarificationType); }
            if (internalDetailsFromClient.teamLeadInformed !== undefined) { setClauses.push(`interne_teamleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.teamLeadInformed); }
            if (internalDetailsFromClient.departmentHeadInformed !== undefined) { setClauses.push(`interne_bereichsleiter_informiert = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.departmentHeadInformed); }
            if (internalDetailsFromClient.forwardedToSubcontractor !== undefined) { setClauses.push(`interne_an_subunternehmer_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToSubcontractor); }
            if (internalDetailsFromClient.forwardedToInsurance !== undefined) { setClauses.push(`interne_an_versicherung_weitergeleitet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.forwardedToInsurance); }
            if (internalDetailsFromClient.moneyRefunded !== undefined) { setClauses.push(`interne_geld_erstattet = $${paramIndex++}`); updateQueryParams.push(internalDetailsFromClient.moneyRefunded); }
            if (internalDetailsFromClient.refundAmount !== undefined) { 
                // Validierung und Konvertierung zu Numeric, falls DB NUMERIC ist und String kommt
                const amount = parseFloat(internalDetailsFromClient.refundAmount);
                setClauses.push(`interne_erstattungsbetrag = $${paramIndex++}`); 
                updateQueryParams.push(isNaN(amount) ? null : amount); // Sende null, wenn nicht parsebar
            }
        }
        
        if (setClauses.length > 0) {
            updateQueryParams.push(itemId);
            const updateQueryText = `UPDATE beschwerde SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id;`;
            const updateResult = await client.query<{ id: number }>(updateQueryText, updateQueryParams);
            if (updateResult.rowCount === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Beschwerde konnte nicht aktualisiert werden.' }, { status: 404 }); }
        }

        // Hole das vollständige Item mit den aktualisierten Daten
        const finalSelectQuery = `
            SELECT b.*, u.name || ' ' || u.nachname AS bearbeiter_name
            FROM beschwerde b
            LEFT JOIN users u ON b.bearbeiter_id = u.id
            WHERE b.id = $1;
        `;
        const finalItemResult = await client.query<BeschwerdeDbRow>(finalSelectQuery, [itemId]);
        if (finalItemResult.rows.length === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Beschwerde nach Update nicht gefunden.' }, { status: 404 }); }
        
        let responseRow = mapDbRowToApiResponse(finalItemResult.rows[0]);
        const itemToSend = { ...responseRow, ...actionResponsePayload }; // Füge action_required hinzu, falls vorhanden
        
        await client.query('COMMIT');
        return NextResponse.json(itemToSend, { status: 200 });

    } catch (error) {
        if (client) { try { await client.query('ROLLBACK'); } catch (rbError) { console.error('Fehler beim Rollback (Beschwerde):', rbError); } }
        console.error(`[${requestTimestamp}] PATCH /api/containt (Beschwerde) Fehler für ID ${itemId}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Interner Serverfehler.';
        return NextResponse.json({ error: "Fehler beim Verarbeiten der Anfrage.", details: errorMsg }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}