// app/api/statistics/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

export type ChartComplaintStatusType = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt" | "Unbekannt";

interface ComplaintByStatusAPI {
  status: ChartComplaintStatusType;
  count: number;
}
interface ComplaintOverTimeAPI { date: string; count: number; }
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
  averageProcessingTime?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  console.log(`[${requestTimestamp}] API GET /api/statistics: Fetching all statistics data.`);

  if (!JWT_SECRET) {
    console.error(`[${requestTimestamp}] FATAL for /api/statistics: JWT_SECRET is not defined.`);
    return NextResponse.json({ error: 'Serverkonfigurationsfehler.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentifizierungstoken fehlt oder ist ungültig.' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  try {
    jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
  } catch (error) {
    return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.' }, { status: 401 });
  }

  const pool = getDbPool();
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();

    // 1. Gesamtzahlen
    const complaintsResult = await client.query('SELECT COUNT(*) AS total FROM beschwerde');
    const totalComplaints = parseInt(complaintsResult.rows[0].total, 10) || 0;

    const praisesResult = await client.query('SELECT COUNT(*) AS total FROM lob');
    const totalPraises = parseInt(praisesResult.rows[0].total, 10) || 0;

    const suggestionsResult = await client.query('SELECT COUNT(*) AS total FROM anregung');
    const totalSuggestions = parseInt(suggestionsResult.rows[0].total, 10) || 0;

    // 2. Beschwerden nach Status
    const statusQuery = `
      SELECT status, COUNT(*) AS count
      FROM beschwerde
      WHERE status IS NOT NULL AND status <> ''
      GROUP BY status
      ORDER BY count DESC;
    `;
    const statusResult = await client.query(statusQuery);
    const complaintsByStatus: ComplaintByStatusAPI[] = statusResult.rows.map(row => ({
        status: row.status as ChartComplaintStatusType,
        count: parseInt(row.count, 10)
    }));

    // 3. Beschwerden über die Zeit (letzte 30 Tage, basierend auf 'datum')
    const overTimeQuery = `
      SELECT TO_CHAR(datum, 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM beschwerde
      WHERE datum >= CURRENT_DATE - INTERVAL '30 days' AND datum <= CURRENT_DATE
      GROUP BY date
      ORDER BY date ASC;
    `;
    const overTimeResult = await client.query(overTimeQuery);
    const complaintsOverTime: ComplaintOverTimeAPI[] = overTimeResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count, 10)
    }));

    // 4. Top 10 Beschwerdegründe
    const reasonsQuery = `
      SELECT beschwerdegrund AS reason, COUNT(*) AS count
      FROM beschwerde
      WHERE beschwerdegrund IS NOT NULL AND beschwerdegrund <> ''
      GROUP BY beschwerdegrund
      ORDER BY count DESC
      LIMIT 10;
    `;
    const reasonsResult = await client.query(reasonsQuery);
    const complaintReasons: ComplaintReasonAPI[] = reasonsResult.rows.map(row => ({
        reason: row.reason,
        count: parseInt(row.count, 10)
    }));

    // 5. Top 10 Linien
    const linesQuery = `
      SELECT linie AS name, COUNT(*) AS count
      FROM beschwerde
      WHERE linie IS NOT NULL AND linie <> ''
      GROUP BY linie
      ORDER BY count DESC
      LIMIT 10;
    `;
    const linesResult = await client.query(linesQuery);
    const topComplaintLines: ComplaintHotspotAPI[] = linesResult.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count, 10)
    }));

    // 6. Top 10 Haltestellen
    const stopsQuery = `
      SELECT haltestelle AS name, COUNT(*) AS count
      FROM beschwerde
      WHERE haltestelle IS NOT NULL AND haltestelle <> ''
      GROUP BY haltestelle
      ORDER BY count DESC
      LIMIT 10;
    `;
    const stopsResult = await client.query(stopsQuery);
    const topComplaintStops: ComplaintHotspotAPI[] = stopsResult.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count, 10)
    }));

    // 7. Top Beschwerdezeiten (gruppiert nach Stunde)
    const timesQuery = `
      SELECT 
        TO_CHAR(uhrzeit, 'HH24:00') || '-' || TO_CHAR(uhrzeit + INTERVAL '1 hour', 'HH24:00') AS name, 
        COUNT(*) AS count
      FROM beschwerde
      WHERE uhrzeit IS NOT NULL
      GROUP BY TO_CHAR(uhrzeit, 'HH24:00') || '-' || TO_CHAR(uhrzeit + INTERVAL '1 hour', 'HH24:00') -- KORRIGIERT: Gruppierung nach dem Ausdruck
      ORDER BY count DESC
      LIMIT 10;
    `;
    // Alternative (oft einfacher und weniger fehleranfällig für GROUP BY):
    // const timesQuery = `
    //   SELECT EXTRACT(HOUR FROM uhrzeit) AS hour_of_day, COUNT(*) AS count
    //   FROM beschwerde
    //   WHERE uhrzeit IS NOT NULL
    //   GROUP BY EXTRACT(HOUR FROM uhrzeit)
    //   ORDER BY count DESC
    //   LIMIT 10;
    // `;

    const timesResult = await client.query(timesQuery);
    const topComplaintTimes: ComplaintHotspotAPI[] = timesResult.rows.map(row => {
        // Wenn die alternative Query verwendet wird, muss 'name' hier konstruiert werden:
        // if (typeof row.hour_of_day !== 'undefined') {
        //   const hour = parseInt(String(row.hour_of_day), 10);
        //   return {
        //     name: `${String(hour).padStart(2, '0')}:00-${String(hour + 1 > 23 ? 0 : hour + 1).padStart(2, '0')}:00`,
        //     count: parseInt(row.count, 10)
        //   };
        // }
        return { // Für die ursprüngliche Query mit dem formatierten String als 'name'
            name: row.name,
            count: parseInt(row.count, 10)
        };
    });


    const responsePayload: StatisticsApiResponse = {
      totalComplaints,
      totalPraises,
      totalSuggestions,
      complaintsByStatus,
      complaintsOverTime,
      complaintReasons,
      topComplaintLines,
      topComplaintStops,
      topComplaintTimes,
    };

    console.log(`[${requestTimestamp}] API GET /api/statistics: All data fetched successfully.`);
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] Error fetching statistics:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler.';
    return NextResponse.json({ error: 'Fehler beim Abrufen der Statistiken.', details: errorMessage }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
