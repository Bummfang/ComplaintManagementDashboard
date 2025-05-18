// app/constants.ts
import { ViewType, StatusFilterMode } from './types';

export const API_ENDPOINTS: Record<ViewType, string | null> = { // Erlaube null für API-Endpunkte
  beschwerden: "/api/containt",
  lob: "/api/like",
  anregungen: "/api/feedback",
  statistik: "/api/statistics",
  admin: null, // NEU: Admin-Sektion lädt initial keine spezifischen Daten über diesen Weg
};

export const VIEW_TITLES: Record<ViewType, string> = {
  beschwerden: "Beschwerdeübersicht",
  lob: "Lobübersicht",
  anregungen: "Anregungsübersicht",
  statistik: "Statistikübersicht",
  admin: "Administration", // NEU: Titel für Admin-Sektion
};

export const FILTER_LABELS: Record<StatusFilterMode, string> = {
  "alle": "Alle",
  "Offen": "Offen",
  "In Bearbeitung": "In Bearb.",
  "Gelöst": "Gelöst",
  "Abgelehnt": "Abgelehnt",
};

export const LOGIN_APP_NAME = "BM";
export const COMPANY_NAME = "Cottbusverkehr";
export const COMPANY_SUBTITLE = "Ein Unternehmen der Stadt Cottbus/Chóśebuz";
export const LOGIN_API_ENDPOINT = '/api/login';