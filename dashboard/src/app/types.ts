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

// DataItem ist eine Union aller möglichen Item-Typen
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin";

export type StatusFilterMode = "alle" | AllowedBeschwerdeStatus; // Bleibt gleich

export type AnyItemStatus = AllowedBeschwerdeStatus | AllowedLobStatus | AllowedAnregungStatus; // Bleibt gleich