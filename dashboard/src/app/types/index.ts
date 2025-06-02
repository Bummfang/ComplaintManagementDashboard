// app/types.ts

export type AllowedBeschwerdeStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export interface BeschwerdeItem {
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
    status?: AllowedBeschwerdeStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null; // << Sicherstellen, dass vorhanden
    bearbeiter_name?: string | null; // << NEU HINZUGEFÜGT
    internal_details?: InternalCardData;
    attachment_filename?: string | null; 
    attachment_mimetype?: string | null; 
}








export type AllowedLobStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export interface LobItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedLobStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null; // << Sicherstellen, dass vorhanden
     bearbeiter_name?: string | null; // << NEU HINZUGEFÜGT
}









export type AllowedAnregungStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export interface AnregungItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
    status?: AllowedAnregungStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null; // << Sicherstellen, dass vorhanden
     bearbeiter_name?: string | null; // << NEU HINZUGEFÜGT
}








export type DataItem = BeschwerdeItem | LobItem | AnregungItem;
export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin";
export type StatusFilterMode = "alle" | AllowedBeschwerdeStatus; // Bleibt gleich
export type AnyItemStatus = AllowedBeschwerdeStatus | AllowedLobStatus | AllowedAnregungStatus; // Bleibt gleich



export interface InternalCardData {
    generalNotes: string;
    clarificationType: 'schriftlich' | 'telefonisch' | null;
    teamLeadInformed: boolean;
    departmentHeadInformed: boolean;
    forwardedToSubcontractor: boolean;
    forwardedToInsurance: boolean;
    moneyRefunded: boolean;
    refundAmount: string; // Als String für Formular-Eingabe, Validierung in der Logik
}






export interface ApiErrorResponse {
    error?: string;
    details?: string;
    message?: string; 
}






export const defaultInternalDetails: InternalCardData = {
    generalNotes: "",
    clarificationType: null,
    teamLeadInformed: false,
    departmentHeadInformed: false,
    forwardedToSubcontractor: false,
    forwardedToInsurance: false,
    moneyRefunded: false,
    refundAmount: "",
};








export type CardSpecificDataItem = DataItem & {
    internal_details?: InternalCardData;
    action_required?: "relock_ui"; 
    name: string | null; 
    email: string | null; 
    tel?: string | null; 
    betreff: string | null; 
    beschreibung: string | null; 
    beschwerdegrund?: string | null; 
};

