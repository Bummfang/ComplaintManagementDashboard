// app/api/statistics/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { type PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import jwt from 'jsonwebtoken';

export type ChartComplaintStatusType = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt" | "Unbekannt";





interface ComplaintByStatusAPI { status: ChartComplaintStatusType; count: number; }
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
  averageProcessingTime: number | null;
  filterApplied: { startDate?: string; endDate?: string; isDefault: boolean };
}









const JWT_SECRET = process.env.JWT_SECRET;

const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
};






export async function GET(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  const url = new URL(request.url);
  const queryStartDate = url.searchParams.get('startDate');
  const queryEndDate = url.searchParams.get('endDate');
  const startDate = parseDate(queryStartDate);
  const endDate = parseDate(queryEndDate);

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }
  






  const startDateSQL = startDate ? startDate.toISOString().split('T')[0] : null;
  const endDateSQL = endDate ? endDate.toISOString().split('T')[0] : null;





  console.log(`[${requestTimestamp}] API GET /api/statistics: Fetching statistics data. Filter: ${startDateSQL ? `Start: ${startDateSQL}` : 'N/A'}, ${endDateSQL ? `End: ${endDateSQL}` : 'N/A'}`);







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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; isAdmin: boolean };
    console.log(`[GET /api/statistics] Token verified for user: ${decoded.username}`);
  } catch (error) { // error wird jetzt verwendet
    console.error(`[GET /api/statistics] Invalid token:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token.', details: error instanceof Error ? error.message : 'JWT error' }, { status: 401 }); 
  }








  const pool = getDbPool();
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    
    let dateFilterConditionBeschwerde = "";
    const dateFilterParamsBeschwerde: string[] = []; // Bleibt let, da paramIndex darauf basiert und es modifiziert wird
    let paramIndex = 1; // paramIndex wird modifiziert

  
  
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
        // paramIndex += 1; // Dieser paramIndex Inkrement war hier überflüssig, da er danach nicht mehr verwendet wird für diese spezifische Kondition
    }
    


   
   
   
    // KORRIGIERT: zu const, da nicht neu zugewiesen
    const dateFilterConditionLob = dateFilterConditionBeschwerde.replace(/\$\d+/g, (match) => `$${parseInt(match.substring(1),10)}`);
    const dateFilterParamsLob = [...dateFilterParamsBeschwerde];
    const dateFilterConditionAnregung = dateFilterConditionBeschwerde.replace(/\$\d+/g, (match) => `$${parseInt(match.substring(1),10)}`);
    const dateFilterParamsAnregung = [...dateFilterParamsBeschwerde];
    const complaintsResult = await client.query(`SELECT COUNT(*) AS total FROM beschwerde ${dateFilterConditionBeschwerde}`, dateFilterParamsBeschwerde);
    const totalComplaints = parseInt(complaintsResult.rows[0].total, 10) || 0;
    const praisesResult = await client.query(`SELECT COUNT(*) AS total FROM lob ${dateFilterConditionLob}`, dateFilterParamsLob);
    const totalPraises = parseInt(praisesResult.rows[0].total, 10) || 0;
    const suggestionsResult = await client.query(`SELECT COUNT(*) AS total FROM anregung ${dateFilterConditionAnregung}`, dateFilterParamsAnregung);
    const totalSuggestions = parseInt(suggestionsResult.rows[0].total, 10) || 0;
    let incidentDateFilterCondition = "";
    const incidentDateFilterParams: string[] = []; // Bleibt let, da .push() verwendet wird
    const incidentParamIndex = 1; // KORRIGIERT: zu const






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










    const statusQuery = `
      SELECT status, COUNT(*) AS count
      FROM beschwerde
      ${dateFilterConditionBeschwerde} ${dateFilterConditionBeschwerde ? 'AND' : 'WHERE'} status IS NOT NULL AND status <> ''
      GROUP BY status
      ORDER BY count DESC;
    `;








    const statusResult = await client.query(statusQuery, dateFilterParamsBeschwerde);
    const complaintsByStatus: ComplaintByStatusAPI[] = statusResult.rows.map(row => ({ status: row.status as ChartComplaintStatusType, count: parseInt(row.count, 10) }));
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
    } else { 
        overTimeQuery = `
          SELECT TO_CHAR(datum, 'YYYY-MM-DD') AS date, COUNT(*) AS count
          FROM beschwerde
          WHERE datum >= CURRENT_DATE - INTERVAL '30 days' AND datum <= CURRENT_DATE
          GROUP BY date
          ORDER BY date ASC;
        `;
    }









    const overTimeResult = await client.query(overTimeQuery, overTimeParams);
    const complaintsOverTime: ComplaintOverTimeAPI[] = overTimeResult.rows.map(row => ({ date: row.date, count: parseInt(row.count, 10) }));
    const reasonsQuery = `
      SELECT beschwerdegrund AS reason, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} beschwerdegrund IS NOT NULL AND beschwerdegrund <> ''
      GROUP BY beschwerdegrund
      ORDER BY count DESC
      LIMIT 10;
    `;







    const reasonsResult = await client.query(reasonsQuery, incidentDateFilterParams);
    const complaintReasons: ComplaintReasonAPI[] = reasonsResult.rows.map(row => ({ reason: row.reason, count: parseInt(row.count, 10) }));
    const linesQuery = `
      SELECT linie AS name, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} linie IS NOT NULL AND linie <> ''
      GROUP BY linie
      ORDER BY count DESC
      LIMIT 10;
    `;
    const linesResult = await client.query(linesQuery, incidentDateFilterParams);
    const topComplaintLines: ComplaintHotspotAPI[] = linesResult.rows.map(row => ({ name: row.name, count: parseInt(row.count, 10) }));
    const stopsQuery = `
      SELECT haltestelle AS name, COUNT(*) AS count
      FROM beschwerde
      ${incidentDateFilterCondition} ${incidentDateFilterCondition ? 'AND' : 'WHERE'} haltestelle IS NOT NULL AND haltestelle <> ''
      GROUP BY haltestelle
      ORDER BY count DESC
      LIMIT 10;
    `;
    const stopsResult = await client.query(stopsQuery, incidentDateFilterParams);
    const topComplaintStops: ComplaintHotspotAPI[] = stopsResult.rows.map(row => ({ name: row.name, count: parseInt(row.count, 10) }));
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
    const topComplaintTimes: ComplaintHotspotAPI[] = timesResult.rows.map(row => ({ name: row.name, count: parseInt(row.count, 10) }));
    let averageProcessingTime: number | null = null;
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (abgeschlossenam - erstelltam))) AS avg_seconds
      FROM beschwerde
      ${dateFilterConditionBeschwerde} ${dateFilterConditionBeschwerde ? 'AND' : 'WHERE'} status IN ('Gelöst', 'Abgelehnt') 
        AND abgeschlossenam IS NOT NULL AND erstelltam IS NOT NULL AND abgeschlossenam >= erstelltam;
    `;
    const avgTimeResult = await client.query(avgTimeQuery, dateFilterParamsBeschwerde);









    if (avgTimeResult.rows.length > 0 && avgTimeResult.rows[0].avg_seconds !== null) { const avgSeconds = parseFloat(avgTimeResult.rows[0].avg_seconds); averageProcessingTime = parseFloat((avgSeconds / (60 * 60 * 24)).toFixed(1));  }
    const responsePayload: StatisticsApiResponse = {
      totalComplaints, totalPraises, totalSuggestions,
      complaintsByStatus, complaintsOverTime, complaintReasons,
      topComplaintLines, topComplaintStops, topComplaintTimes,
      averageProcessingTime,
      filterApplied: { startDate: startDateSQL || undefined, endDate: endDateSQL || undefined, isDefault: !startDateSQL && !endDateSQL }
    };








    console.log(`[${requestTimestamp}] API GET /api/statistics: All data fetched successfully. Filter: ${JSON.stringify(responsePayload.filterApplied)}`);
    return NextResponse.json(responsePayload, { status: 200 });





    

  } catch (error) { 
    const errorTimestamp = new Date().toISOString(); 
    console.error(`[${errorTimestamp}] Error fetching statistics:`, error); 
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler.'; 
    return NextResponse.json({ error: 'Fehler beim Abrufen der Statistiken.', details: errorMessage }, { status: 500 });
 
 
 
 
  } finally { if (client) { client.release(); } }
}
