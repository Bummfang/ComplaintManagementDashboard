// app/api/containt/[id]/route.ts
import { NextResponse } from 'next/server';
import { type PoolClient } from 'pg'; // Nur PoolClient wird hier direkt benötigt
import { getDbPool } from '@/lib/db'; // Importiere die zentrale Pool-Funktion
import type { BeschwerdeData } from '@/app/api/containt/route'; // Importiere das Interface aus der GET-Route

// Definiere die erlaubten Statuswerte, um die Eingabe zu validieren.
// Diese sollten mit den Statuswerten im Frontend übereinstimmen.
type AllowedStatus = "Offen" | "In Bearbeitung" | "Gelöst" | "Abgelehnt";
const allowedStatuses: AllowedStatus[] = ["Offen", "In Bearbeitung", "Gelöst", "Abgelehnt"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } } // Die ID kommt aus dem dynamischen Teil der URL, z.B. /api/containt/123
) {
  const { id: itemIdString } = params; // ID als String aus den URL-Parametern
  let requestBody;

  // Versuche, den JSON-Body der Anfrage zu parsen
  try {
    requestBody = await request.json();
  } catch (e) {
    console.error(`API PATCH /api/containt/${itemIdString}: Fehler beim Parsen des JSON-Bodys`, e);
    return NextResponse.json({ error: 'Ungültiger JSON-Body in der Anfrage.' }, { status: 400 });
  }

  const { status: newStatus } = requestBody; // Extrahiere den neuen Status aus dem geparsten Body
  const itemId = parseInt(itemIdString, 10); // Konvertiere die ID-String in eine Zahl

  // --- Eingabevalidierung ---
  if (isNaN(itemId)) {
    return NextResponse.json({ error: 'Ungültige Beschwerde-ID.', details: `Die ID "${itemIdString}" ist keine gültige Zahl.` }, { status: 400 });
  }

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
    // Hole den Datenbank-Pool über die zentrale Funktion
    const pool = getDbPool();
    client = await pool.connect(); // Verbinde dich mit der Datenbank

    // SQL-Query zum Aktualisieren des Status für die gegebene ID.
    // "beschwerde" ist der Tabellenname, "status" die Spalte für den Status, "id" die ID-Spalte.
    // RETURNING * gibt die komplette aktualisierte Zeile zurück.
    const query = `
      UPDATE "beschwerde"
      SET status = $1
      WHERE id = $2
      RETURNING *; 
    `;

    // Führe die Query mit dem neuen Status und der itemId als Parameter aus.
    // Das Interface BeschwerdeData wird für die Typisierung des Ergebnisses verwendet.
    const result = await client.query<BeschwerdeData>(query, [newStatus, itemId]);

    // Überprüfe, ob eine Zeile aktualisiert wurde.
    // Wenn rowCount 0 ist, wurde keine Beschwerde mit der gegebenen ID gefunden.
    if (result.rowCount === 0) {
      console.warn(`API PATCH /api/containt/${itemId}: Keine Beschwerde mit dieser ID gefunden.`);
      return NextResponse.json({ error: 'Beschwerde nicht gefunden.', details: `Es wurde keine Beschwerde mit der ID ${itemId} gefunden.` }, { status: 404 });
    }

    // Erfolgreich aktualisiert: Gib die aktualisierte Beschwerde zurück.
    console.log(`API PATCH /api/containt/${itemId}: Status erfolgreich auf "${newStatus}" geändert.`);
    return NextResponse.json(result.rows[0], { status: 200 });

  } catch (error) {
    // Fehlerbehandlung für Datenbankfehler oder andere unerwartete Probleme.
    console.error(`API PATCH /api/containt/${itemId}: Fehler beim Aktualisieren des Status für ID ${itemId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler beim Aktualisieren des Status.';
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Status in der Datenbank.', details: errorMessage }, { status: 500 });
  } finally {
    // Gib den Datenbank-Client immer frei, egal ob erfolgreich oder nicht.
    if (client) {
      client.release();
      console.log(`API PATCH /api/containt/${itemId}: Datenbank-Client freigegeben.`);
    }
  }
}
