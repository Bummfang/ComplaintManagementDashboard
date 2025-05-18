// app/types.ts

export interface BaseItem {
  id: number;
  name: string;
  email: string;
  tel?: string;
  betreff: string;
  beschreibung: string;
  erstelltam: string; // Beachte: in deiner DB heißt es erstelltam (ohne Unterstrich)
}

export interface BeschwerdeItem extends BaseItem {
  beschwerdegrund: string;
  datum: string; // Datum des Vorfalls
  uhrzeit: string; // Uhrzeit des Vorfalls
  haltestelle?: string;
  linie?: string;
  status?: "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
  abgeschlossenam?: string | null; // NEU: Zeitstempel, wann die Beschwerde geschlossen wurde
}

export type LobItem = BaseItem; // Lob hat aktuell keinen eigenen Status oder Abschlussdatum im Schema
export type AnregungItem = BaseItem; // Anregung hat aktuell keinen eigenen Status oder Abschlussdatum im Schema

// DataItem ist eine Union der spezifischen Item-Typen.
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

// Definiert die möglichen Ansichten in der Anwendung.
export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik" | "admin";

// Definiert die möglichen Filtermodi für den Status, typischerweise bei Beschwerden.
export type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

// User-Definition (sollte konsistent mit AuthContext.tsx sein)
export interface User {
  userId: number;
  username: string;
  isAdmin: boolean;
  name?: string;
  nachname?: string;
}
