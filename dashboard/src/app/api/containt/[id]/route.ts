// app/api/containt/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { type PoolClient } from 'pg'; 
import { getDbPool } from '@/lib/db'; 
import type { BeschwerdeData } from '../route'; // Relative import for BeschwerdeData

type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { params } = context; 
  
  let requestBody;
  let itemIdString: string; 
  let itemId: number;

  console.log(`[PATCH /api/containt/[id]] Funktion aufgerufen. Request-URL: ${request.url}`);

  try {
    requestBody = await request.json(); // Erste await-Operation

    // Zugriff auf params.id und dessen Verarbeitung ERST NACHDEM request.json() erfolgreich war
    itemIdString = params.id; 
    itemId = parseInt(itemIdString, 10); 
    
    console.log(`[PATCH /api/containt/${itemIdString}] ID aus Params: ${itemIdString}, geparst als: ${itemId}`);
    
    if (isNaN(itemId)) {
      console.error(`API PATCH /api/containt/${itemIdString}: Ungültige ID nach dem Parsen.`);
      return NextResponse.json({ error: 'Ungültige Beschwerde-ID nach dem Parsen.', details: `Die ID "${itemIdString}" ist keine gültige Zahl.` }, { status: 400 });
    }

  } catch (e) {
    // Im Fehlerfall von request.json() greifen wir hier NICHT mehr auf params.id zu für das Logging.
    console.error(`API PATCH /api/containt/[id_unknown]: Fehler beim Parsen des JSON-Bodys.`, e);
    return NextResponse.json({ error: 'Ungültiger JSON-Body in der Anfrage.' }, { status: 400 });
  }

  const { status: newStatus } = requestBody; 

  if (!newStatus) {
    return NextResponse.json({ error: 'Der neue Status fehlt im Request-Body.' }, { status: 400 });
  }

  if (!allowedStatuses.includes(newStatus as AllowedStatus)) {
    return NextResponse.json(
      {
        error: 'Ungültiger Statuswert.',
        details: `Der Status "${newStatus}" ist nicht erlaubt. Erlaubte Werte sind: ${allowedStatuses.join(', ')}.`
      },
      { status: 400 }
    );
  }

  console.log(`API PATCH /api/containt/${itemId}: Versuche Status zu ändern auf "${newStatus}"`);

  let client: PoolClient | undefined;
  try {
    const pool = getDbPool();
    client = await pool.connect(); 

    const query = `
      UPDATE "beschwerde"
      SET status = $1
      WHERE id = $2
      RETURNING *; 
    `;

    const result = await client.query<BeschwerdeData>(query, [newStatus, itemId]);

    if (result.rowCount === 0) {
      console.warn(`API PATCH /api/containt/${itemId}: Keine Beschwerde mit dieser ID gefunden.`);
      return NextResponse.json({ error: 'Beschwerde nicht gefunden.', details: `Es wurde keine Beschwerde mit der ID ${itemId} gefunden.` }, { status: 404 });
    }

    console.log(`API PATCH /api/containt/${itemId}: Status erfolgreich auf "${newStatus}" geändert.`);
    return NextResponse.json(result.rows[0], { status: 200 });

  } catch (error) {
    console.error(`API PATCH /api/containt/${itemId}: Fehler beim Aktualisieren des Status für ID ${itemId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren des Status.';
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status in der Datenbank.', details: errorMessage }, { status: 500 });
  } finally {
    if (client) {
      client.release();
      console.log(`API PATCH /api/containt/${itemId}: Datenbank-Client freigegeben.`);
    }
  }
}
