// app/api/containt/_sharedApi.ts
import { type QueryResultRow } from 'pg';
// Globale Typen, die Frontend und Backend nutzen
import { 
    InternalCardData as FrontendInternalCardData, // Umbenannt zur Unterscheidung von DB-Feldern
    AllowedBeschwerdeStatus // Direkter Import des spezifischen Statustyps
} from '@/app/types'; 

// Dieses Interface spiegelt die Spaltennamen wider, wie sie in deiner DB-Tabelle 'beschwerde' sind
export interface BeschwerdeDbRow extends QueryResultRow {
    id: number;
    name: string;
    email: string;
    tel?: string | null; // In DB oft als NULLable
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string; // In DB oft als DATE
    uhrzeit: string; // In DB oft als TIME
    haltestelle?: string | null;
    linie?: string | null;
    erstelltam: string; // In DB oft als TIMESTAMPTZ
    status?: AllowedBeschwerdeStatus | null; // Status kann auch null sein aus der DB
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;

    interne_notizen?: string | null;
    interne_klaerungsart?: 'written' | 'phone' | null; // DB-spezifische Enum-Werte
    interne_teamleiter_informiert?: boolean | null;
    interne_bereichsleiter_informiert?: boolean | null;
    interne_an_subunternehmer_weitergeleitet?: boolean | null;
    interne_an_versicherung_weitergeleitet?: boolean | null;
    interne_geld_erstattet?: boolean | null;
    interne_erstattungsbetrag?: string | null; // NUMERIC wird oft als String gelesen

    // Attachment-Felder aus deiner DB
    attachment_filename?: string | null;
    attachment_mimetype?: string | null;
    attachment_data?: Buffer | null; // Buffer für bytea
}

// Das finale Objekt, das an das Frontend gesendet wird
export interface BeschwerdeApiResponse extends Omit<BeschwerdeDbRow,
    // Felder, die in internal_details zusammengefasst werden oder nicht gesendet werden
    'interne_notizen' | 
    'interne_klaerungsart' | 
    'interne_teamleiter_informiert' |
    'interne_bereichsleiter_informiert' | 
    'interne_an_subunternehmer_weitergeleitet' |
    'interne_an_versicherung_weitergeleitet' | 
    'interne_geld_erstattet' | 
    'interne_erstattungsbetrag' |
    'attachment_data' // Rohdaten nicht ans Frontend
> {
    internal_details?: FrontendInternalCardData; // Verwendung des Frontend-Typs
    action_required?: "relock_ui";
    // attachment_filename und attachment_mimetype werden von BeschwerdeDbRow übernommen
    // und sind nach Omit nicht mehr da, falls sie nicht explizit in BeschwerdeDbRow wären.
    // Da sie aber in BeschwerdeDbRow sind und nicht in der Omit-Liste, bleiben sie erhalten.
}


export function mapDbRowToApiResponse(row: BeschwerdeDbRow): BeschwerdeApiResponse {
    const {
        interne_notizen,
        interne_klaerungsart,
        interne_teamleiter_informiert,
        interne_bereichsleiter_informiert,
        interne_an_subunternehmer_weitergeleitet,
        interne_an_versicherung_weitergeleitet,
        interne_geld_erstattet,
        interne_erstattungsbetrag,
        attachment_data, // Wird nicht direkt weitergegeben
        ...restOfRow // Enthält attachment_filename und attachment_mimetype, wenn sie in row sind
    } = row;

    let frontendClarificationType: FrontendInternalCardData['clarificationType'] = null;
    if (interne_klaerungsart === 'written') {
        frontendClarificationType = 'schriftlich';
    } else if (interne_klaerungsart === 'phone') {
        frontendClarificationType = 'telefonisch';
    }

    const apiResponse: BeschwerdeApiResponse = { 
        ...restOfRow, 
        // attachment_filename und attachment_mimetype sind in restOfRow, wenn in BeschwerdeDbRow vorhanden
    };
    
    // internal_details nur erstellen, wenn mindestens ein relevantes Feld vorhanden ist
    const hasInternalDetailsData = [
        interne_notizen, interne_klaerungsart, interne_teamleiter_informiert,
        interne_bereichsleiter_informiert, interne_an_subunternehmer_weitergeleitet,
        interne_an_versicherung_weitergeleitet, interne_geld_erstattet, interne_erstattungsbetrag
    ].some(field => field !== undefined && field !== null);

    if (hasInternalDetailsData) {
        apiResponse.internal_details = {
            generalNotes: interne_notizen || "", // Fallback auf leeren String
            clarificationType: frontendClarificationType,
            teamLeadInformed: !!interne_teamleiter_informiert, // In Boolean konvertieren
            departmentHeadInformed: !!interne_bereichsleiter_informiert,
            forwardedToSubcontractor: !!interne_an_subunternehmer_weitergeleitet,
            forwardedToInsurance: !!interne_an_versicherung_weitergeleitet,
            moneyRefunded: !!interne_geld_erstattet,
            refundAmount: interne_erstattungsbetrag || "", // Fallback auf leeren String
        };
    }
    return apiResponse;
}

// AllowedStatus wird jetzt direkt aus @/app/types als AllowedBeschwerdeStatus importiert
// und in BeschwerdeDbRow verwendet.
// Wenn du eine separate Liste für Validierungszwecke brauchst:
export const allowedStatusesList: AllowedBeschwerdeStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];
