// app/types.ts

export type AllowedBeschwerdeStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
export interface BeschwerdeItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string; // spezifisch für Beschwerde
    datum: string; // spezifisch für Beschwerde (Vorfalldatum)
    uhrzeit: string; // spezifisch für Beschwerde (Vorfallzeit)
    haltestelle?: string; // spezifisch für Beschwerde
    linie?: string; // spezifisch für Beschwerde
    erstelltam: string; // gemeinsames Feld
    status?: AllowedBeschwerdeStatus; // gemeinsames Feld (Typ kann spezifisch sein, wenn Werte variieren)
    abgeschlossenam?: string | null; // gemeinsames Feld
}

export type AllowedLobStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt"; // Kann angepasst werden, wenn Lob andere Status hat
export interface LobItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string; // gemeinsames Feld
    status?: AllowedLobStatus; // gemeinsames Feld
    abgeschlossenam?: string | null; // gemeinsames Feld
}

export type AllowedAnregungStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt"; // Kann angepasst werden
export interface AnregungItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string; // gemeinsames Feld
    status?: AllowedAnregungStatus; // gemeinsames Feld
    abgeschlossenam?: string | null; // gemeinsames Feld
}

// DataItem ist eine Union aller möglichen Item-Typen
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin";

// StatusFilterMode - die Filterpille verwendet diese Status.
// Da die Status für alle Typen gleich sein sollen, können wir AllowedBeschwerdeStatus verwenden.
export type StatusFilterMode = "alle" | AllowedBeschwerdeStatus;

// AnyItemStatus ist eine Union aller möglichen spezifischen Status-Typen.
// Nützlich für Funktionen, die generisch mit Status umgehen.
export type AnyItemStatus = AllowedBeschwerdeStatus | AllowedLobStatus | AllowedAnregungStatus;