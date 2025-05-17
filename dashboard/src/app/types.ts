// app/types.ts

export interface BaseItem {
  id: number;
  name: string; // In deiner Version sind diese nicht nullable, ich behalte das bei.
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

// DataItem ist eine Union der spezifischen Item-Typen.
export type DataItem = BeschwerdeItem | LobItem | AnregungItem;

// Definiert die möglichen Ansichten in der Anwendung.
// "statistik" wurde als neuer möglicher Wert hinzugefügt.
export type ViewType = "beschwerden" | "lob" | "anregungen" | "statistik";

// Definiert die möglichen Filtermodi für den Status, typischerweise bei Beschwerden.
export type StatusFilterMode = "alle" | "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";

// Optional: Wenn du die User und AuthContextType Definitionen auch hier verwalten möchtest,
// kannst du sie aus der vorherigen Version des Artefakts hierher kopieren.
// Für die Behebung der aktuellen TypeScript-Fehler sind sie nicht direkt relevant.

/*
// Typ für Benutzerdaten, die im AuthContext gespeichert werden.
export interface User {
  userId: string | number;
  username: string;
  name?: string;
  nachname?: string;
  isAdmin: boolean;
  token?: string;
}

// Struktur für den Authentifizierungskontext.
export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoadingAuth: boolean;
  login: (userData: User) => void;
  logout: () => void;
}
*/
