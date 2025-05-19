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

// --- NEUE DEFINITIONEN / ERGÄNZUNGEN für DataItemCard ---
export interface InternalCardData {
    generalNotes: string;
    clarificationType: 'written' | 'phone' | null;
    teamLeadInformed: boolean;
    departmentHeadInformed: boolean;
    forwardedToSubcontractor: boolean;
    forwardedToInsurance: boolean;
    moneyRefunded: boolean;
    refundAmount: string; // Als String für Formular-Eingabe, Validierung in der Logik
}

export const defaultInternalDetails: InternalCardData = {
    generalNotes: "",
    clarificationType: null,
    teamLeadInformed: false,
    departmentHeadInformed: false,
    forwardedToSubcontractor: false,
    forwardedToInsurance: false,
    moneyRefunded: false,
    refundAmount: "",
};

// Dieser Typ wird in DataItemCard Props verwendet.
// Er nimmt dein bestehendes DataItem und fügt die optionalen Felder hinzu,
// die spezifisch für die Darstellung und Bearbeitung in der Karte sind.
// WICHTIG: `action_required` wird hier hinzugefügt, da es nicht in deinen Basis-Items ist.
export type CardSpecificDataItem = DataItem & {
    internal_details?: InternalCardData;
    action_required?: "relock_ui"; // Dieses Feld wird von ContaintTable an DataItemCard übergeben

    // Überprüfe, ob die folgenden Felder in ALLEN DataItem-Varianten (Beschwerde, Lob, Anregung)
    // entweder vorhanden sind oder als optional (`?:`) definiert sind,
    // um mit der `DataField` Komponente kompatibel zu sein, die `value?: string | null` erwartet.
    // Deine aktuellen Definitionen (z.B. `name: string`) sind strenger.
    // Wenn ein Feld wie `name` tatsächlich `null` sein kann, ändere es in `name: string | null;`
    // in den jeweiligen Interfaces (BeschwerdeItem, LobItem, AnregungItem).
    name: string | null; // Sicherstellen, dass dies mit der Realität und DataField übereinstimmt
    email: string | null; // Sicherstellen, dass dies mit der Realität und DataField übereinstimmt
    tel?: string | null; // Optional und kann null sein
    betreff: string | null; // Sicherstellen, dass dies mit der Realität und DataField übereinstimmt
    beschreibung: string | null; // Sicherstellen, dass dies mit der Realität und DataField übereinstimmt
    
    // Spezifische Felder für Beschwerden, die in DataField verwendet werden könnten:
    beschwerdegrund?: string | null; // Nur in BeschwerdeItem, daher hier optional
    // datum: string; // Bereits in BeschwerdeItem
    // uhrzeit: string; // Bereits in BeschwerdeItem
    // linie?: string; // Bereits in BeschwerdeItem
    // haltestelle?: string; // Bereits in BeschwerdeItem
};
// --- Ende NEUE DEFINITIONEN / ERGÄNZUNGEN ---
