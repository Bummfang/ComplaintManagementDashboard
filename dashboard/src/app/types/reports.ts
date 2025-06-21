// app/types/reports.ts

// --- Typen für die Konfiguration (Frontend -> Backend) ---

/**
 * Definiert die Art der Analyse, die ein einzelner Block in einem Bericht durchführen kann.
 */
export type ReportBlockType = 
  | 'TIME_SERIES'
  | 'TOP_N_LIST';

/**
 * Definiert die Konfiguration für einen einzelnen, modularen Analyse-Block.
 */
export interface ReportBlock {
  id: string;
  title: string;
  type: ReportBlockType;
  filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    topNSubject?: 'reasons' | 'lines' | 'stops';
  };
}

/**
 * Definiert die gesamte Struktur eines Berichts, den der Benutzer konfiguriert.
 */
export interface ReportDefinition {
  reportTitle: string;
  generatedAt: string;
  blocks: ReportBlock[];
}


// --- Typen für die Antwort (Backend -> Frontend) ---
// DIESER TEIL HAT GEFEHLT:

/**
 * Definiert die Struktur der Daten, die für einen einzelnen Analyse-Block
 * vom Backend zurückkommen. Das 'data'-Feld ist flexibel.
 */
export interface ReportBlockResult {
  blockRequest: ReportBlock; // Die ursprüngliche Konfiguration für diesen Block
  data: any; // Hier stecken die eigentlichen Ergebnisse, z.B. eine Liste von { date: string, count: number }
}

/**
 * Definiert die gesamte Antwort der API für eine Berichts-Anfrage.
 */
export interface ReportDataResponse {
  reportTitle: string;
  generatedAt: string;
  results: ReportBlockResult[];
}