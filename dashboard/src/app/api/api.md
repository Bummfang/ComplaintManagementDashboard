# API Routen Dokumentation

Dieses Dokument beschreibt die verschiedenen API-Endpunkte der Anwendung. Alle Endpunkte befinden sich unter dem Basispfad `/api`.

---

## Authentifizierung

Die meisten Endpunkte erfordern eine Authentifizierung mittels eines JWT (JSON Web Token). Der Token muss als Bearer-Token im `Authorization`-Header der Anfrage gesendet werden:

`Authorization: Bearer <your_jwt_token>`

Einige Endpunkte erfordern zusätzlich Administratorrechte, die im JWT-Payload (`isAdmin: true`) enthalten sein müssen.

---

### 1. `/api/admin/create-user`

* **Datei:** `app/api/admin/create-user/route.ts`
* **HTTP Methode:** `POST`
* **Zweck:** Ermöglicht einem authentifizierten Administrator das Erstellen eines neuen Benutzers im System.
* **Authentifizierung/Autorisierung:**
    * JWT Bearer Token erforderlich.
    * Benutzer muss Administratorrechte besitzen (`decodedToken.isAdmin === true`).
* **Request Body:**
    ```json
    {
      "name": "string (erforderlich)",
      "nachname": "string (erforderlich)",
      "password_hash": "string (Klartext-Passwort, erforderlich, min. 6 Zeichen)",
      "isAdmin": "boolean (erforderlich)"
    }
    ```
* **Response:**
    * **201 Created (Erfolg):**
        ```json
        {
          "userId": "number",
          "username": "string (von DB generiert)",
          "name": "string",
          "nachname": "string",
          "isAdmin": "boolean",
          "message": "Benutzer erfolgreich angelegt."
        }
        ```
    * **Fehlercodes:**
        * `400 Bad Request`: Fehlende Felder, Passwort zu kurz, `isAdmin` kein Boolean, ungültiger JSON-Body.
        * `401 Unauthorized`: Token fehlt, ungültig oder abgelaufen.
        * `403 Forbidden`: Anfragender Benutzer ist kein Administrator.
        * `409 Conflict`: Benutzer mit identischem Vor- und Nachnamen existiert bereits oder der von der DB generierte `username` ist bereits vergeben.
        * `500 Internal Server Error`: Serverkonfigurationsfehler (z.B. `JWT_SECRET` nicht gesetzt), Datenbankfehler.
        * **Fehler-Payload (Beispiel):**
            ```json
            { "error": "Fehlermeldung", "details": "optionale Details" }
            ```
* **Datenbank-Interaktionen (`users` Tabelle):**
    * Überprüft, ob ein Benutzer mit dem angegebenen Vor- und Nachnamen bereits existiert (case-insensitive).
    * Fügt einen neuen Benutzer mit `name`, `nachname`, gehashtem `password` und `ist_admin` ein.
    * Der `username` wird von der Datenbank generiert (Annahme basierend auf dem Schema).
    * Nutzt `RETURNING` um die Daten des neu erstellten Benutzers zu erhalten.
* **Wichtige Bibliotheken/Logik:**
    * `NextResponse` für API-Antworten.
    * `pg` (via `getDbPool`) für Datenbankzugriffe.
    * `bcryptjs` zum Hashen von Passwörtern (Salt Rounds: 10).
    * `jsonwebtoken` zur Verifizierung des Admin-Tokens.
    * `JWT_SECRET` Umgebungsvariable ist kritisch für die Token-Validierung.
    * Eingaben für `name` und `nachname` werden getrimmt.

---

### 2. `/api/containt` (Beschwerden)

* **Datei:** `app/api/containt/route.ts`
* **Zweck:** Dient zum Abrufen und Aktualisieren von Beschwerdedaten.
* **Authentifizierung/Autorisierung:**
    * JWT Bearer Token für alle Methoden erforderlich.

#### 2.1 Methode: `GET`

* **Zweck:** Ruft eine Liste aller Beschwerden ab.
* **Response:**
    * **200 OK (Erfolg):** Ein Array von `BeschwerdeApiResponse`-Objekten.
        ```json
        [
          {
            "id": "number",
            "name": "string",
            "email": "string",
            "tel": "string | null",
            "betreff": "string",
            "beschreibung": "string",
            "beschwerdegrund": "string",
            "datum": "string (YYYY-MM-DD)",
            "uhrzeit": "string (HH:MM:SS)",
            "haltestelle": "string | null",
            "linie": "string | null",
            "erstelltam": "string (ISO DateTime)",
            "status": "AllowedStatus ('Offen', 'In Bearbeitung', 'Gelöst', 'Abgelehnt') | null",
            "abgeschlossenam": "string (ISO DateTime) | null",
            "bearbeiter_id": "number | null",
            "bearbeiter_name": "string | null",
            "internal_details": { // Optional
              "generalNotes": "string | undefined",
              "clarificationType": "'written' | 'phone' | null | undefined",
              "teamLeadInformed": "boolean | undefined",
              "departmentHeadInformed": "boolean | undefined",
              "forwardedToSubcontractor": "boolean | undefined",
              "forwardedToInsurance": "boolean | undefined",
              "moneyRefunded": "boolean | undefined",
              "refundAmount": "string | undefined"
            },
            "action_required": "'relock_ui' | undefined" // Nur in PATCH-Antwort, falls relevant
          }
          // ... weitere Beschwerden
        ]
        ```
    * **Fehlercodes:** `401 Unauthorized`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`beschwerde`, `users` Tabellen):**
    * `SELECT`-Abfrage auf die `beschwerde`-Tabelle.
    * `LEFT JOIN` mit `users`-Tabelle, um `bearbeiter_name` zu ermitteln.
    * Sortiert nach `erstelltam DESC`.
    * Datenbank-Spalten mit `interne_`-Präfix werden in das `internal_details`-Objekt der API-Antwort gemappt (snake_case zu camelCase für Schlüssel).

#### 2.2 Methode: `PATCH`

* **Zweck:** Aktualisiert eine bestehende Beschwerde (Statusänderung, Zuweisung eines Bearbeiters, Speichern interner Details).
* **Request Body:**
    ```json
    {
      "id": "string | number (erforderlich)",
      "status": "AllowedStatus ('Offen', 'In Bearbeitung', 'Gelöst', 'Abgelehnt') | undefined",
      "assign_me_as_bearbeiter": "boolean | undefined",
      "internal_details": { // Optional, Struktur siehe InternalCardData
        "generalNotes": "string | undefined",
        "clarificationType": "'written' | 'phone' | null | undefined", // Beachte: API verwendet hier 'written'/'phone'
        // ... weitere interne Detailfelder
        "refundAmount": "string | undefined" // Wird als String erwartet, Komma wird zu Punkt konvertiert
      }
    }
    ```
* **Response:**
    * **200 OK (Erfolg):** Das aktualisierte `BeschwerdeApiResponse`-Objekt (siehe GET), kann zusätzlich `action_required: "relock_ui"` enthalten.
    * **Fehlercodes:**
        * `400 Bad Request`: Ungültiger JSON-Body, ID fehlt/ungültig, ungültiger Statuswert.
        * `401 Unauthorized`: Token fehlt, ungültig oder abgelaufen.
        * `404 Not Found`: Beschwerde mit der ID nicht gefunden.
        * `500 Internal Server Error`.
* **Datenbank-Interaktionen (`beschwerde` Tabelle):**
    * Verwendet eine Transaktion (`BEGIN`, `COMMIT`, `ROLLBACK`).
    * Sperrt die Zeile mit `FOR UPDATE` vor der Aktualisierung.
    * Aktualisiert selektiv Felder basierend auf den im Request Body übermittelten Daten:
        * `bearbeiter_id`: Wenn `assign_me_as_bearbeiter: true` und `bearbeiter_id` aktuell `NULL` ist, wird die `userId` aus dem Token gesetzt.
        * `status`: Wenn ein neuer Status gesetzt wird.
        * `abgeschlossenam`: Wird auf `CURRENT_TIMESTAMP` gesetzt, wenn Status "Gelöst" oder "Abgelehnt"; auf `NULL` bei "Offen".
        * Wenn Status auf "Offen" zurückgesetzt wird und vorher "Gelöst"/"Abgelehnt" war, wird `bearbeiter_id` auf `NULL` gesetzt und `action_required: "relock_ui"` an den Client gesendet.
        * Interne Detailfelder (z.B. `interne_notizen`, `interne_klaerungsart`) werden basierend auf dem `internal_details`-Objekt aktualisiert (camelCase-Clientdaten zu snake_case-DB-Spalten).
    * Liest das aktualisierte Item erneut aus der DB, um die finale Antwort zu erstellen.
* **Wichtige Bibliotheken/Logik:**
    * `mapDbRowToApiResponse`: Hilfsfunktion zum Transformieren der Datenbankzeile in die API-Antwortstruktur, insbesondere für `internal_details`.
    * Dynamische Erstellung der `UPDATE`-Query basierend auf den im Request vorhandenen Feldern.
    * Umgang mit `refundAmount`: Konvertiert Komma zu Punkt, speichert als String (oder `NULL` wenn leer/`null`).

---

### 3. `/api/feedback` (Anregungen)

* **Datei:** `app/api/feedback/route.ts`
* **Zweck:** Dient zum Abrufen und Aktualisieren von Anregungsdaten.
* **Authentifizierung/Autorisierung:**
    * JWT Bearer Token für alle Methoden erforderlich.

#### 3.1 Methode: `GET`

* **Zweck:** Ruft eine Liste aller Anregungen ab.
* **Response:**
    * **200 OK (Erfolg):** Ein Array von `AnregungData`-Objekten.
        ```json
        [
          {
            "id": "number",
            "name": "string",
            "email": "string",
            "tel": "string | null",
            "betreff": "string",
            "beschreibung": "string",
            "erstelltam": "string (ISO DateTime)",
            "status": "AllowedStatusAnregung ('Offen', 'In Bearbeitung', 'Gelöst', 'Abgelehnt') | null",
            "abgeschlossenam": "string (ISO DateTime) | null",
            "bearbeiter_id": "number | null",
            "bearbeiter_name": "string | null"
          }
          // ... weitere Anregungen
        ]
        ```
    * **Fehlercodes:** `401 Unauthorized`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`anregung`, `users` Tabellen):**
    * `SELECT`-Abfrage auf die `anregung`-Tabelle.
    * `LEFT JOIN` mit `users`-Tabelle, um `bearbeiter_name` zu ermitteln.
    * Sortiert nach `erstelltam DESC`.

#### 3.2 Methode: `PATCH`

* **Zweck:** Aktualisiert eine bestehende Anregung (Statusänderung, Zuweisung eines Bearbeiters).
* **Request Body:**
    ```json
    {
      "id": "string | number (erforderlich)",
      "status": "AllowedStatusAnregung ('Offen', 'In Bearbeitung', 'Gelöst', 'Abgelehnt') | undefined",
      "assign_me_as_bearbeiter": "boolean | undefined"
    }
    ```
* **Response:**
    * **200 OK (Erfolg):** Das aktualisierte `AnregungData`-Objekt, kann zusätzlich `action_required: "relock_ui"` enthalten.
    * **Fehlercodes:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`anregung` Tabelle):**
    * Sehr ähnlich zur `/api/containt` PATCH-Logik (Transaktion, `FOR UPDATE`, dynamische Query).
    * Aktualisiert `bearbeiter_id`, `status`, `abgeschlossenam` analog zu Beschwerden.
    * Keine `internal_details`-Verarbeitung.

---

### 4. `/api/like` (Lob)

* **Datei:** `app/api/like/route.ts`
* **Zweck:** Dient zum Abrufen und Aktualisieren von Lob-Daten.
* **Authentifizierung/Autorisierung:**
    * JWT Bearer Token für alle Methoden erforderlich.

#### 4.1 Methode: `GET`

* **Zweck:** Ruft eine Liste aller Lob-Einträge ab.
* **Response:**
    * **200 OK (Erfolg):** Ein Array von `LobData`-Objekten (Struktur analog zu `AnregungData`).
    * **Fehlercodes:** `401 Unauthorized`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`lob`, `users` Tabellen):**
    * Analog zu `/api/feedback` GET, aber für die `lob`-Tabelle.

#### 4.2 Methode: `PATCH`

* **Zweck:** Aktualisiert einen bestehenden Lob-Eintrag (Statusänderung, Zuweisung eines Bearbeiters).
* **Request Body:**
    ```json
    {
      "id": "string | number (erforderlich)",
      "status": "AllowedStatusLob ('Offen', 'In Bearbeitung', 'Gelöst', 'Abgelehnt') | undefined",
      "assign_me_as_bearbeiter": "boolean | undefined"
    }
    ```
* **Response:**
    * **200 OK (Erfolg):** Das aktualisierte `LobData`-Objekt, kann zusätzlich `action_required: "relock_ui"` enthalten.
    * **Fehlercodes:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`lob` Tabelle):**
    * Analog zu `/api/feedback` PATCH, aber für die `lob`-Tabelle.

---

### 5. `/api/login`

* **Datei:** `app/api/login/route.ts`
* **HTTP Methode:** `POST`
* **Zweck:** Authentifiziert einen Benutzer und gibt bei Erfolg einen JWT zurück.
* **Authentifizierung/Autorisierung:** Keine erforderlich (ist der Authentifizierungsendpunkt selbst).
* **Request Body:**
    ```json
    {
      "username": "string (erforderlich)",
      "password": "string (Klartext-Passwort, erforderlich)"
    }
    ```
* **Response:**
    * **200 OK (Erfolg):**
        ```json
        {
          "userId": "number",
          "username": "string",
          "name": "string (Vorname)",
          "nachname": "string (Nachname)",
          "isAdmin": "boolean",
          "message": "Login erfolgreich.",
          "token": "string (JWT)"
        }
        ```
    * **Fehlercodes:**
        * `400 Bad Request`: Fehlender `username` oder `password`.
        * `401 Unauthorized`: Ungültiger `username` oder falsches Passwort.
        * `500 Internal Server Error`: Serverkonfigurationsfehler (z.B. `JWT_SECRET` nicht gesetzt), Datenbankfehler.
* **Datenbank-Interaktionen (`users` Tabelle):**
    * Sucht Benutzer anhand des `username`.
    * Vergleicht das übermittelte Passwort mit dem gehashten Passwort in der Datenbank mittels `bcrypt.compare`.
* **Wichtige Bibliotheken/Logik:**
    * `bcryptjs` zum Passwortvergleich.
    * `jsonwebtoken` zum Erstellen des JWT. Der Token enthält `userId`, `username`, `isAdmin`, `name`, `nachname` und hat eine Gültigkeit (z.B. '1h').
    * `JWT_SECRET` Umgebungsvariable ist kritisch für die Token-Erstellung.

---

### 6. `/api/statistics`

* **Datei:** `app/api/statistics/route.ts`
* **HTTP Methode:** `GET`
* **Zweck:** Ruft verschiedene aggregierte Statistiken über Beschwerden, Lob und Anregungen ab.
* **Authentifizierung/Autorisierung:**
    * JWT Bearer Token erforderlich.
* **Request Query Parameter (Optional):**
    * `startDate`: `string (YYYY-MM-DD)` - Startdatum für den Filter.
    * `endDate`: `string (YYYY-MM-DD)` - Enddatum für den Filter. Wenn `endDate` gesetzt ist, wird es intern auf 23:59:59.999 Uhr gesetzt.
* **Response:**
    * **200 OK (Erfolg):** Ein `StatisticsApiResponse`-Objekt.
        ```json
        {
          "totalComplaints": "number",
          "totalPraises": "number",
          "totalSuggestions": "number",
          "complaintsByStatus": [ { "status": "ChartComplaintStatusType", "count": "number" } ],
          "complaintsOverTime": [ { "date": "string (YYYY-MM-DD)", "count": "number" } ], // Default: Letzte 30 Tage, wenn kein Datumsfilter
          "complaintReasons": [ { "reason": "string", "count": "number" } ], // Top 10
          "topComplaintLines": [ { "name": "string", "count": "number" } ],   // Top 10
          "topComplaintStops": [ { "name": "string", "count": "number" } ],    // Top 10
          "topComplaintTimes": [ { "name": "string (HH24:00-HH24:00)", "count": "number" } ], // Top 10, stündliche Intervalle
          "averageProcessingTime": "number | null (in Tagen, z.B. 2.5)",
          "filterApplied": { "startDate": "string | undefined", "endDate": "string | undefined", "isDefault": "boolean" }
        }
        ```
    * **Fehlercodes:** `401 Unauthorized`, `500 Internal Server Error`.
* **Datenbank-Interaktionen (`beschwerde`, `lob`, `anregung` Tabellen):**
    * Führt mehrere `SELECT COUNT(*)` und `GROUP BY` Abfragen durch, um die Statistiken zu generieren.
    * Datumsfilter (`erstelltam` für Gesamtzahlen und Status, `datum` für Vorfalls-bezogene Statistiken wie Gründe, Linien, Haltestellen, Zeiten) werden dynamisch angewendet, wenn `startDate` und/oder `endDate` in der Query vorhanden sind.
    * `complaintsOverTime` zeigt standardmäßig die letzten 30 Tage, wenn keine Filter gesetzt sind.
    * `averageProcessingTime` berechnet die durchschnittliche Bearbeitungszeit in Tagen für abgeschlossene Beschwerden.
* **Wichtige Logik:**
    * `parseDate` Hilfsfunktion zur Validierung und Konvertierung von Datumsstrings.
    * Dynamische SQL-Filterbedingungen basierend auf Query-Parametern.

---

### 7. `/api/verify-token`

* **Datei:** `app/api/verify-token/route.ts`
* **HTTP Methode:** `POST`
* **Zweck:** Überprüft die Gültigkeit eines übermittelten JWT. Wird typischerweise beim Initialisieren der Anwendung im Frontend verwendet, um den Authentifizierungsstatus wiederherzustellen.
* **Authentifizierung/Autorisierung:** Erfordert einen JWT Bearer Token im Header (den es ja gerade validieren soll).
* **Request Body:** Keiner erforderlich (die Route prüft den Token im Header).
* **Response:**
    * **200 OK (Erfolg, Token gültig):**
        ```json
        {
          "isValid": true,
          "user": {
            "userId": "number",
            "username": "string",
            "isAdmin": "boolean",
            "name": "string (Vorname)",
            "nachname": "string (Nachname)"
          }
        }
        ```
    * **Fehlercodes/Antworten bei ungültigem Token:**
        * `401 Unauthorized`: Token fehlt, ist ungültig (z.B. falsche Signatur, abgelaufen).
            ```json
            { "error": "Meldung", "details": "...", "isValid": false }
            ```
        * `500 Internal Server Error`: Serverkonfigurationsfehler (z.B. `JWT_SECRET` nicht gesetzt).
            ```json
            { "error": "Meldung", "details": "...", "isValid": false }
            ```
* **Wichtige Bibliotheken/Logik:**
    * `jsonwebtoken` zur Verifizierung des Tokens.
    * `JWT_SECRET` Umgebungsvariable ist kritisch.
    * Gibt Benutzerinformationen aus dem dekodierten Token zurück, wenn dieser gültig ist.
    * Prüft auch, ob `name` und `nachname` im Token vorhanden sind und loggt eine Warnung, falls nicht (relevant für Frontend-Begrüßung).