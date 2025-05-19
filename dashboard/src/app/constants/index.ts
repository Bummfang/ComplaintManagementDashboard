// app/constants.ts
import { ViewType, StatusFilterMode } from '../types'; // ViewType wird immer noch für VIEW_TITLES benötigt

// Definiere ein Interface für alle API Endpunkte, um den TypeScript-Fehler zu beheben
interface AllApiEndpoints {
    beschwerden: string;
    lob: string;
    anregungen: string;
    statistik: string;
    admin?: string; // Admin ist optional oder kann einen leeren String haben, wenn kein direkter Datenendpunkt
    login: string;
    verifyToken: string;
    createUser: string;
}

export const API_ENDPOINTS: AllApiEndpoints = {
    beschwerden: '/api/containt',
    lob: '/api/like',
    anregungen: '/api/feedback',
    statistik: '/api/statistics',
    admin: '', // oder weglassen, falls im AllApiEndpoints Interface als optional definiert
    login: '/api/login',
    verifyToken: '/api/verify-token',
    createUser: '/api/admin/create-user',
};

export const VIEW_TITLES: Record<ViewType, string> = {
    beschwerden: "Beschwerdeübersicht",
    lob: "Lobübersicht",
    anregungen: "Anregungsübersicht",
    statistik: "Statistiken & Analyse",
    admin: "Administration",
};

export const FILTER_LABELS: Record<StatusFilterMode, string> = {
    alle: "Alle",
    Offen: "Offen",
    "In Bearbeitung": "In Bearbeitung",
    Gelöst: "Gelöst",
    Abgelehnt: "Abgelehnt",
};

export const LOGIN_APP_NAME = "BM";
export const COMPANY_NAME = "Cottbusverkehr";
export const COMPANY_SUBTITLE = "Ein Unternehmen der Stadt Cottbus/Chóśebuz";
// LOGIN_API_ENDPOINT Konstante wird nicht mehr separat benötigt, da sie in API_ENDPOINTS.login enthalten ist.
// export const LOGIN_API_ENDPOINT = '/api/login'; // Entfernt oder auskommentiert