// app/types.ts
export interface BaseItem {
    id: number;
    name: string;
    email: string;
    tel?: string;
    betreff: string;
    beschreibung: string;
    erstelltam: string;
}

export interface BeschwerdeItem extends BaseItem {
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string;
    linie?: string;
    status?: "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
}

export type LobItem = BaseItem;
export type AnregungItem = BaseItem;
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

export type ViewType = "beschwerden" | "lob" | "anregungen";

export type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";