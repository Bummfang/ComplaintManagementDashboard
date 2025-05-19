// app/types.ts

// Status-Typen für die einzelnen Ansichten (bleiben spezifisch)
export type AllowedBeschwerdeStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export type AllowedLobStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export type AllowedAnregungStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

// Basis-Interface für Felder, die null aus der DB sein könnten
interface NullableBaseFields {
    name: string | null;
    email: string | null;
    tel?: string | null; // Optional und kann null sein
    betreff: string | null;
    beschreibung: string | null;
}

// Item-Typen, die NullableBaseFields erweitern
export interface BeschwerdeItem extends NullableBaseFields {
    id: number;
    beschwerdegrund: string | null; // Kann auch null sein
    datum: string; // Annahme: Datum ist immer vorhanden
    uhrzeit: string; // Annahme: Uhrzeit ist immer vorhanden
    haltestelle?: string | null; // Optional und kann null sein
    linie?: string | null; // Optional und kann null sein
    erstelltam: string; // Annahme: Erstelltam ist immer vorhanden
    status?: AllowedBeschwerdeStatus; // Status ist optional
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;
}

export interface LobItem extends NullableBaseFields {
    id: number;
    erstelltam: string;
    status?: AllowedLobStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;
}

export interface AnregungItem extends NullableBaseFields {
    id: number;
    erstelltam: string;
    status?: AllowedAnregungStatus;
    abgeschlossenam?: string | null;
    bearbeiter_id?: number | null;
    bearbeiter_name?: string | null;
}

// DataItem ist eine Union aller möglichen Item-Typen
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin";

// StatusFilterMode für die Filter-Komponente
export type StatusFilterMode = "alle" | AllowedBeschwerdeStatus; // Oder eine Union aller Allowed Status, falls übergreifend gefiltert wird

/**
 * Repräsentiert alle möglichen Statuswerte, die ein Item haben kann,
 * inklusive der Möglichkeit, dass der Status nicht gesetzt (null oder undefined) ist.
 * Dies ist wichtig für item.status in den Datenobjekten.
 */
export type AnyItemStatus = AllowedBeschwerdeStatus | AllowedLobStatus | AllowedAnregungStatus | null | undefined;

// --- Definitionen für DataItemCard ---
export interface InternalCardData {
    generalNotes: string;
    clarificationType: 'written' | 'phone' | null;
    teamLeadInformed: boolean;
    departmentHeadInformed: boolean;
    forwardedToSubcontractor: boolean;
    forwardedToInsurance: boolean;
    moneyRefunded: boolean;
    refundAmount: string;
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

/**
 * Der spezifische Typ für das `item`-Prop der DataItemCard.
 * Erbt die (jetzt präziseren) Felder von DataItem und fügt
 * `internal_details` und `action_required` hinzu.
 */
export type CardSpecificDataItem = DataItem & {
    internal_details?: InternalCardData;
    action_required?: "relock_ui"; // Wird von ContaintTable übergeben
};
