// app/api/reports/generate/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDbPool } from '@/lib/db'; // Passe den Pfad an, falls nötig (z.B. ../../../lib/db)
import { ReportDefinition, ReportDataResponse, ReportBlockResult, ReportBlock } from '@/app/types/reports'; // Passe den Pfad an

// Die Hauptfunktion, die POST-Anfragen an diesen Endpunkt behandelt
export async function POST(req: NextRequest) {
  const pool = getDbPool();

  try {
    // 1. Die Anfrage des Frontends auslesen und validieren
    const definition: ReportDefinition = await req.json();
    if (!definition || !definition.blocks || definition.blocks.length === 0) {
      return NextResponse.json({ error: 'Ungültige Berichtsdefinition.' }, { status: 400 });
    }

    // 2. Alle angeforderten Analyse-Blöcke parallel abarbeiten
    const results: ReportBlockResult[] = await Promise.all(
      definition.blocks.map(async (block: ReportBlock): Promise<ReportBlockResult> => {
        let data: any;

        // WICHTIG: Die WHERE-Klauseln und Parameter dynamisch und sicher erstellen, um SQL-Injection zu verhindern
        const whereClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (block.filters.startDate) {
            whereClauses.push(`erstelltam >= $${paramIndex++}`);
            params.push(block.filters.startDate);
        }
        if (block.filters.endDate) {
            // Wir addieren einen Tag und fragen "kleiner als", um den gesamten End-Tag einzuschließen
            const endDate = new Date(block.filters.endDate);
            endDate.setDate(endDate.getDate() + 1);
            whereClauses.push(`erstelltam < $${paramIndex++}`);
            params.push(endDate.toISOString().split('T')[0]);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 3. Je nach Block-Typ die passende SQL-Abfrage ausführen
        switch (block.type) {
          case 'TIME_SERIES':
            const timeSeriesSql = `
              SELECT DATE(erstelltam) as date, COUNT(*) as count 
              FROM beschwerde
              ${whereSql}
              GROUP BY DATE(erstelltam) 
              ORDER BY DATE(erstelltam) ASC;
            `;
            const timeSeriesResult = await pool.query(timeSeriesSql, params);
            data = timeSeriesResult.rows;
            break;

          case 'TOP_N_LIST':
            // SICHERHEIT: Direkte Spaltennamen aus dem Frontend sind gefährlich.
            // Wir verwenden eine Map, um eine sichere Zuordnung zu gewährleisten.
            const subjectColumnMap: Record<string, string> = {
              reasons: 'beschwerdegrund',
              lines: 'linie',
              stops: 'haltestelle',
            };
            const columnName = subjectColumnMap[block.filters.topNSubject || 'reasons'];
            if (!columnName) {
              throw new Error(`Ungültiges Thema für Top-N-Liste: ${block.filters.topNSubject}`);
            }

            const limit = block.filters.limit || 10;
            params.push(limit); // Limit als letzten Parameter hinzufügen

            const topNListSql = `
              SELECT ${columnName} as name, COUNT(*) as count 
              FROM beschwerde 
              ${whereSql}
              GROUP BY ${columnName}
              HAVING ${columnName} IS NOT NULL AND ${columnName} != ''
              ORDER BY count DESC 
              LIMIT $${paramIndex};
            `;
            const topNListResult = await pool.query(topNListSql, params);
            data = topNListResult.rows;
            break;
            
          default:
            // Wenn ein unbekannter Block-Typ angefordert wird
            data = { error: `Unbekannter Block-Typ: ${block.type}` };
            break;
        }

        return { blockRequest: block, data };
      })
    );
    
    // 4. Die aufbereiteten Ergebnisse an das Frontend zurücksenden
    const responsePayload: ReportDataResponse = {
      reportTitle: definition.reportTitle,
      generatedAt: definition.generatedAt,
      results: results,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Fehler im API-Endpunkt /api/reports/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ein serverseitiger Fehler ist aufgetreten.';
    return NextResponse.json({ error: 'Fehler bei der Berichtserstellung auf dem Server.', details: errorMessage }, { status: 500 });
  }
}