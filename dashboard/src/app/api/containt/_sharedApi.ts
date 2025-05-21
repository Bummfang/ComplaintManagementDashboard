// WICHTIG: Diese Datei muss unter src/app/api/containt/_sharedApi.ts liegen

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
export interface BeschwerdeApiResponse extends Omit<BeschwerdeDbRow,
    'interne_notizen' |
    'interne_klaerungsart' |
    'interne_teamleiter_informiert' |
    'interne_bereichsleiter_informiert' |
    'interne_an_subunternehmer_weitergeleitet' |
    'interne_an_versicherung_weitergeleitet' |
    'interne_geld_erstattet' |
    'interne_erstattungsbetrag' |
    'attachment_data' // attachment_data wird hier bewusst ausgelassen
> {
    internal_details?: FrontendInternalCardData;
    action_required?: "relock_ui";
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        attachment_data, // Unterstrich wieder entfernt, da die Direktive die Zeile direkt anspricht
        ...restOfRow
    } = row;

    const frontendClarificationType: FrontendInternalCardData['clarificationType'] = interne_klaerungsart || null;

    const apiResponse: BeschwerdeApiResponse = {
        ...restOfRow,
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

export const allowedStatusesList: AllowedBeschwerdeStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];