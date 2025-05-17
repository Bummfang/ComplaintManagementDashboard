// app/constants.ts
import { ViewType, StatusFilterMode } from './types'; // Pfad ggf. anpassen, falls 'types.ts' woanders liegt

// Bestehende API Endpunkte für die Hauptanwendung
export const API_ENDPOINTS: Record<ViewType, string> = {
  beschwerden: "/api/containt",
  lob: "/api/like",
  anregungen: "/api/feedback",
};

// Bestehende Titel für die Ansichten
export const VIEW_TITLES: Record<ViewType, string> = {
  beschwerden: "Beschwerdeübersicht",
  lob: "Lobübersicht",
  anregungen: "Anregungsübersicht",
};

// Bestehende Labels für Filter
export const FILTER_LABELS: Record<StatusFilterMode, string> = {
  "alle": "Alle",
  "Offen": "Offen",
  "In Bearbeitung": "In Bearb.",
  "Gelöst": "Gelöst",
  "Abgelehnt": "Abgelehnt",
};


// Name der Login-Anwendung (Bitte anpassen, falls gewünscht)
export const LOGIN_APP_NAME = "BM"; // Beispiel, bitte den echten Namen eintragen

// Firmeninformationen
export const COMPANY_NAME = "Cottbusverkehr";
export const COMPANY_SUBTITLE = "Ein Unternehmen der Stadt Cottbus/Chóśebuz";

// API Endpunkt für den Login-Vorgang
export const LOGIN_API_ENDPOINT = '/api/login'; // Pfad zur zukünftigen Login-API-Route


