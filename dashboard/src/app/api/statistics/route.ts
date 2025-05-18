// app/api/statistics/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

export type ChartComplaintStatusType = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt" | "Unbekannt";

interface ComplaintByStatusAPI { status: ChartComplaintStatusType; count: number; }
interface ComplaintOverTimeAPI { date: string; count: number; } // date im Format YYYY-MM-DD
interface ComplaintReasonAPI { reason: string; count: number; }
interface ComplaintHotspotAPI { name: string; count: number; }

interface StatisticsApiResponse {
  totalComplaints: number;
  totalPraises: number;
  totalSuggestions: number;
  complaintsByStatus: ComplaintByStatusAPI[];
  complaintsOverTime: ComplaintOverTimeAPI[];
  complaintReasons: ComplaintReasonAPI[];
  topComplaintLines: ComplaintHotspotAPI[];
  topComplaintStops: ComplaintHotspotAPI[];
  topComplaintTimes: ComplaintHotspotAPI[];
  averageProcessingTime: number | null;
  // NEU: Um den angewendeten Filter im Frontend anzuzeigen
  filterApplied: { startDate?: string; endDate?: string; isDefault: boolean };
}

const JWT_SECRET = process.env.JWT_SECRET;

// Hilfsfunktion zum sicheren Parsen von Daten
const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
};

export async function GET(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();

  // Query-Parameter für Datumsfilter auslesen
  const url = new URL(request.url);
  const queryStartDate = url.searchParams.get('startDate');
  const queryEndDate = url.searchParams.get('endDate');

  // Validieren und Formatieren der Daten für SQL
  // Wichtig: Immer YYYY-MM-DD für SQL verwenden, um Formatfehler zu vermeiden
  const startDate = parseDate(queryStartDate);
  const endDate = parseDate(queryEndDate);

  // Setze das Ende des Tages für das Enddatum, um den gesamten Tag einzuschließen
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }
  
  const startDateSQL = startDate ? startDate.toISOString().split('T')[0] : null;
  const endDateSQL = endDate ? endDate.toISOString().split('T')[0] : null;


  console.log(`[${requestTimestamp}] API GET /api/statistics: Fetching statistics data. Filter: ${startDateSQL ? `Start: ${startDateSQL}` : 'N/A'}, ${endDateSQL ? `End: ${endDateSQL}` : 'N/A'}`);

  if (!JWT_SECRET) { /* ... (Fehlerbehandlung wie zuvor) ... */ console.error(`[${requestTimestamp}] FATAL for /api/statistics: JWT_SECRET is not defined.`); return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 }); }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) { /* ... (Fehlerbehandlung wie zuvor) ... */ return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });}
  const token = authHeader.split(' ')[1];
  try { jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean }; } catch (error) { /* ... (Fehlerbehandlung wie zuvor) ... */ return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 }); }

  const pool = getDbPool();
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();

    // Basis WHERE-Klausel für Datumsfilter (für 'erstelltam' Spalte)
    // Wichtig: Passe 'erstelltam' an den tatsächlichen Spaltennamen für das Erstellungsdatum
    // in deinen Tabellen 'lob' und 'anregung' an, falls abweichend.
    // Für 'beschwerde' verwenden wir 'datum' für Vorfälle und 'erstelltam' für die Erstellung der Beschwerde selbst.
    // Für die Gesamtzahlen ist 'erstelltam' der Beschwerde wahrscheinlich relevanter.
    
    let dateFilterConditionBeschwerde = "";
    let dateFilterParamsBeschwerde: string[] = [];
    let paramIndex = 1;

    if (startDateSQL && endDateSQL) {
        dateFilterConditionBeschwerde = `WHERE erstelltam >= $${paramIndex} AND erstelltam <= $${paramIndex+1}`;
        dateFilterParamsBeschwerde.push(startDateSQL, endDateSQL);
        paramIndex += 2;
    } else if (startDateSQL) {
        dateFilterConditionBeschwerde = `WHERE erstelltam >= $${paramIndex}`;
        dateFilterParamsBeschwerde.push(startDateSQL);
        paramIndex += 1;
    } else if (endDateSQL) {
        dateFilterConditionBeschwerde = `WHERE erstelltam <= $${paramIndex}`;
        dateFilterParamsBeschwerde.push(endDateSQL);
        paramIndex += 1;
    }
    
    // Ähnliche Filter für 'lob' und 'anregung', falls deren Erstellungsdatum anders heißt
    // Annahme: 'erstelltam' ist in allen drei Tabellen vorhanden
    let dateFilterConditionLob = dateFilterConditionBeschwerde.replace(/\$\d+/g, (match) => `$${parseInt(match.substring(1),10) + dateFilterParamsBeschwerde.length - (startDateSQL && endDateSQL ? 2 : (startDateSQL || endDateSQL ? 1 : 0))}`);
    let dateFilterParamsLob = [...dateFilterParamsBeschwerde];
    
    let dateFilterConditionAnregung = dateFilterConditionBeschwerde.replace(/\$\d+/g, (match) => `$${parseInt(match.substring(1),10) + dateFilterParamsBeschwerde.length - (startDateSQL && endDateSQL ? 2 : (startDateSQL || endDateSQL ? 1 : 0))}`);
    let dateFilterParamsAnregung = [...dateFilterParamsBeschwerde];


    // 1. Gesamtzahlen
    const complaintsResult = await client.query(`SELECT COUNT(*) AS total FROM beschwerde ${dateFilterConditionBeschwerde}`, dateFilterParamsBeschwerde);
    const totalComplaints = parseInt(complaintsResult.rows[0].total, 10) || 0;

    const praisesResult = await client.query(`SELECT COUNT(*) AS total FROM lob ${dateFilterConditionLob}`, dateFilterParamsLob);
    const totalPraises = parseInt(praisesResult.rows[0].total, 10) || 0;

    const suggestionsResult = await client.query(`SELECT COUNT(*) AS total FROM anregung ${dateFilterConditionAnregung}`, dateFilterParamsAnregung);
    const totalSuggestions = parseInt(suggestionsResult.rows[0].total, 10) || 0;


    // Filter für Abfragen, die sich auf das Vorfallsdatum 'datum' beziehen
    let incidentDateFilterCondition = "";
    let incidentDateFilterParams: string[] = [];
    let incidentParamIndex = 1;

    if (startDateSQL && endDateSQL) {
        incidentDateFilterCondition = `WHERE datum >= $${incidentParamIndex} AND datum <= $${incidentParamIndex+1}`;
        incidentDateFilterParams.push(startDateSQL, endDateSQL);
    } else if (startDateSQL) {
        incidentDateFilterCondition = `WHERE datum >= $${incidentParamIndex}`;
        incidentDateFilterParams.push(startDateSQL);
    } else if (endDateSQL) {
        incidentDateFilterCondition = `WHERE datum <= $${incidentParamIndex}`;
        incidentDateFilterParams.push(endDateSQL);
    }


    // 2. Beschwerden nach Status
    // Verwendet den allgemeinen Datumsfilter basierend auf 'erstelltam' der Beschwerde
    const statusQuery = `
      SELECT status, COUNT(*) AS count
      FROM beschwerde
      ${dateFilterConditionBeschwerde} ${dateFilterConditionBeschwerde ? 'AND' : 'WHERE'} status IS NOT NULL AND status <> ''
      GROUP BY status
      ORDER BY count DESC;
    `;
    const statusResult = await client.query(statusQuery, dateFilterParamsBeschwerde);
    const complaintsByStatus: ComplaintByStatusAPI[] = statusResult.rows.map(row => ({ /* ... */ status: row.status as ChartComplaintStatusType, count: parseInt(row.count, 10) }));

    // 3. Beschwerden über die Zeit
    let overTimeQuery;
    let overTimeParams : string[] = [];
    if (startDateSQL && endDateSQL) {
        overTimeQuery = `
          SELECT TO_CHAR(datum, 'YYYY-MM-DD') AS date, COUNT(*) AS count
          FROM beschwerde
          WHERE datum >= $1 AND datum <= $2
          GROUP BY date
          ORDER BY date ASC;
        `;
        overTimeParams = [startDateSQL, endDateSQL];
    } else { // Standard: letzte 30 Tage
        overTimeQuery = `
          SELECT TO_CHAR(datum, 'YYYY-MM-DD') AS date, COUNT(*) AS count
          FROM beschwerde
          WHERE datum >= CURRENT_DATE - INTERVAL '30 days' AND datum <= CURRENT_DATE
          GROUP BY date
          ORDER BY date ASC;
        `;
    }
    const overTimeResult = await client.query(overTimeQuery, overTimeParams);
    const complaintsOverTime: ComplaintOverTimeAPI[] = overTimeResult.rows.map(row => ({ /* ... */ date: row.date, count: parseInt(row.count, 10) }));

    // 4. Top 10 Beschwerdegründe
    const reasonsQuery = `
      SELECT beschwerdegrund AS reason, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} beschwerdegrund IS NOT NULL AND beschwerdegrund <> ''
      GROUP BY beschwerdegrund
      ORDER BY count DESC
      LIMIT 10;
    `;
    const reasonsResult = await client.query(reasonsQuery, incidentDateFilterParams);
    const complaintReasons: ComplaintReasonAPI[] = reasonsResult.rows.map(row => ({ /* ... */ reason: row.reason, count: parseInt(row.count, 10) }));

    // 5. Top 10 Linien
    const linesQuery = `
      SELECT linie AS name, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} linie IS NOT NULL AND linie <> ''
      GROUP BY linie
      ORDER BY count DESC
      LIMIT 10;
    `;
    const linesResult = await client.query(linesQuery, incidentDateFilterParams);
    const topComplaintLines: ComplaintHotspotAPI[] = linesResult.rows.map(row => ({ /* ... */ name: row.name, count: parseInt(row.count, 10) }));

    // 6. Top 10 Haltestellen
    const stopsQuery = `
      SELECT haltestelle AS name, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} haltestelle IS NOT NULL AND haltestelle <> ''
      GROUP BY haltestelle
      ORDER BY count DESC
      LIMIT 10;
    `;
    const stopsResult = await client.query(stopsQuery, incidentDateFilterParams);
    const topComplaintStops: ComplaintHotspotAPI[] = stopsResult.rows.map(row => ({ /* ... */ name: row.name, count: parseInt(row.count, 10) }));

    // 7. Top Beschwerdezeiten
    const timesQuery = `
      SELECT 
        TO_CHAR(uhrzeit, 'HH24:00') || '-' || TO_CHAR(uhrzeit + INTERVAL '1 hour', 'HH24:00') AS name, 
        COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} uhrzeit IS NOT NULL 
      GROUP BY TO_CHAR(uhrzeit, 'HH24:00') || '-' || TO_CHAR(uhrzeit + INTERVAL '1 hour', 'HH24:00')
      ORDER BY count DESC
      LIMIT 10;
    `;
    const timesResult = await client.query(timesQuery, incidentDateFilterParams);
    const topComplaintTimes: ComplaintHotspotAPI[] = timesResult.rows.map(row => ({ /* ... */ name: row.name, count: parseInt(row.count, 10) }));

    // 8. Durchschnittliche Bearbeitungszeit
    let averageProcessingTime: number | null = null;
    // Für die Bearbeitungszeit ist der Filter auf 'erstelltam' der Beschwerde wahrscheinlich sinnvoller
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (abgeschlossenam - erstelltam))) AS avg_seconds
      FROM beschwerde
      ${dateFilterConditionBeschwerde} ${dateFilterConditionBeschwerde ? 'AND' : 'WHERE'} status IN ('Gelöst', 'Abgelehnt') 
        AND abgeschlossenam IS NOT NULL AND erstelltam IS NOT NULL AND abgeschlossenam >= erstelltam;
    `;
    const avgTimeResult = await client.query(avgTimeQuery, dateFilterParamsBeschwerde);
    if (avgTimeResult.rows.length > 0 && avgTimeResult.rows[0].avg_seconds !== null) { /* ... */ const avgSeconds = parseFloat(avgTimeResult.rows[0].avg_seconds); averageProcessingTime = parseFloat((avgSeconds / (60 * 60 * 24)).toFixed(1));  }


    const responsePayload: StatisticsApiResponse = {
      totalComplaints, totalPraises, totalSuggestions,
      complaintsByStatus, complaintsOverTime, complaintReasons,
      topComplaintLines, topComplaintStops, topComplaintTimes,
      averageProcessingTime,
      filterApplied: { startDate: startDateSQL || undefined, endDate: endDateSQL || undefined, isDefault: !startDateSQL && !endDateSQL }
    };

    console.log(`[${requestTimestamp}] API GET /api/statistics: All data fetched successfully. Filter: ${JSON.stringify(responsePayload.filterApplied)}`);
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) { /* ... (Fehlerbehandlung wie zuvor) ... */ const errorTimestamp = new Date().toISOString(); console.error(`[${errorTimestamp}] Error fetching statistics:`, error); const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler.'; return NextResponse.json({ error: 'Fehler beim Abrufen der Statistiken.', details: errorMessage }, { status: 500 });
  } finally { if (client) { client.release(); } }
}
