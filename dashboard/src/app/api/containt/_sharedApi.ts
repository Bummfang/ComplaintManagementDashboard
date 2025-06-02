// src/app/api/containt/_sharedApi.ts

import { type QueryResultRow } from 'pg';
// Globale Typen, die Frontend und Backend nutzen
import { InternalCardData as FrontendInternalCardData, AllowedBeschwerdeStatus } from '@/app/types';

// Dieses Interface spiegelt die Spaltennamen wider, wie sie in deiner DB-Tabelle 'beschwerde' sind
export interface BeschwerdeDbRow extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string | null;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string | null;
    linie?: string | null;
    erstelltam: string;
    status?: AllowedBeschwerdeStatus | null; 
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;
    interne_notizen?: string | null;
    interne_klaerungsart?: 'schriftlich' | 'telefonisch' | null;
    interne_teamleiter_informiert?: boolean | null;
    interne_bereichsleiter_informiert?: boolean | null;
    interne_an_subunternehmer_weitergeleitet?: boolean | null;
    interne_an_versicherung_weitergeleitet?: boolean | null;
    interne_geld_erstattet?: boolean | null;
    interne_erstattungsbetrag?: string | null;
    attachment_filename?: string | null;
    attachment_mimetype?: string | null;
    attachment_data?: Buffer | null; 
}








// Das finale Objekt, das an das Frontend gesendet wird
// MODIFIZIERT: 'status' aus Omit entfernt und explizit als non-nullable hinzugefügt
export interface BeschwerdeApiResponse extends Omit<BeschwerdeDbRow,
    'interne_notizen' |
    'interne_klaerungsart' |
    'interne_teamleiter_informiert' |
    'interne_bereichsleiter_informiert' |
    'interne_an_subunternehmer_weitergeleitet' |
    'interne_an_versicherung_weitergeleitet' |
    'interne_geld_erstattet' |
    'interne_erstattungsbetrag' |
    'attachment_data' | // attachment_data wird hier bewusst ausgelassen
    'status'          // ursprünglichen (potenziell null) Status entfernen
> {
    internal_details?: FrontendInternalCardData;
    action_required?: "relock_ui";
    status: AllowedBeschwerdeStatus; // Status ist hier immer ein gültiger String
}










export const allowedStatusesList: AllowedBeschwerdeStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
export function mapDbRowToApiResponse(row: BeschwerdeDbRow): BeschwerdeApiResponse {
    const {
        // Felder für internal_details und Felder, die nicht direkt übernommen werden
        interne_notizen,
        interne_klaerungsart,
        interne_teamleiter_informiert,
        interne_bereichsleiter_informiert,
        interne_an_subunternehmer_weitergeleitet,
        interne_an_versicherung_weitergeleitet,
        interne_geld_erstattet,
        interne_erstattungsbetrag,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        attachment_data,    // Wird nicht in die API-Response übernommen
        status: dbStatus,   // Status aus der Datenbank (kann null sein) -> kann nicht mehr null sein durch db constrain
        // Alle anderen Felder aus row werden in apiRelevantFields gesammelt
        ...apiRelevantFields 
    } = row;





    const frontendClarificationType: FrontendInternalCardData['clarificationType'] = interne_klaerungsart || null;
    // Stelle sicher, dass der Status immer ein gültiger Wert ist.
    // Standardmäßig auf "Offen", falls der DB-Status null, undefined oder nicht in der Liste ist.
    const validStatus: AllowedBeschwerdeStatus = 
        dbStatus && allowedStatusesList.includes(dbStatus) 
        ? dbStatus 
        : 'Offen';



    // BeschwerdeApiResponse Objekt erstellen.
    // apiRelevantFields enthält alle Felder von BeschwerdeDbRow außer den oben explizit destrukturierten.
    // Wir müssen sicherstellen, dass das resultierende Objekt dem Typ BeschwerdeApiResponse entspricht.
    const apiResponse: BeschwerdeApiResponse = {
        ...(apiRelevantFields as Omit<BeschwerdeApiResponse, 'status' | 'internal_details' | 'action_required'>), // Cast, um Basistyp zu erfüllen
        status: validStatus, // Hier den validierten, nicht-null Status setzen
    };





    const hasInternalDetailsData = [
        interne_notizen, interne_klaerungsart, interne_teamleiter_informiert,
        interne_bereichsleiter_informiert, interne_an_subunternehmer_weitergeleitet,
        interne_an_versicherung_weitergeleitet, interne_geld_erstattet, interne_erstattungsbetrag
    ].some(field => field !== undefined && field !== null);




    
    if (hasInternalDetailsData) {
        apiResponse.internal_details = {
            generalNotes: interne_notizen || "",
            clarificationType: frontendClarificationType,
            teamLeadInformed: !!interne_teamleiter_informiert,
            departmentHeadInformed: !!interne_bereichsleiter_informiert,
            forwardedToSubcontractor: !!interne_an_subunternehmer_weitergeleitet,
            forwardedToInsurance: !!interne_an_versicherung_weitergeleitet,
            moneyRefunded: !!interne_geld_erstattet,
            refundAmount: interne_erstattungsbetrag || "",
        };
    }
    return apiResponse;
}