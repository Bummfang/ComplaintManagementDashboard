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

// "admin" als neuer möglicher Wert hinzugefügt.
export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin"; // NEU

export type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

// User-Definition (aus AuthContext, hier zur Vollständigkeit, falls sie zentral sein soll)
// Stelle sicher, dass diese Definition konsistent ist mit der in AuthContext.tsx
export interface User {
  userId: number;
  username: string;
  isAdmin: boolean;
  name?: string;
  nachname?: string;
}