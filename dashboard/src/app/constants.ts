// app/constants.ts
import { ViewType, StatusFilterMode } from './types'; // Pfad anpassen

export const API_ENDPOINTS: Record<ViewType, string> = {
    beschwerden: "/api/containt",
    lob: "/api/like",
    anregungen: "/api/feedback",
};

export const VIEW_TITLES: Record<ViewType, string> = {
    beschwerden: "Beschwerdeübersicht",
    lob: "Lobübersicht",
    anregungen: "Anregungsübersicht",
};

export const FILTER_LABELS: Record<StatusFilterMode, string> = {
    "alle": "Alle",
    "Offen": "Offen",
    "In Bearbeitung": "In Bearb.",
    "Gelöst": "Gelöst",
    "Abgelehnt": "Abgelehnt",
};