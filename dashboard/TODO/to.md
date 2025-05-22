# To-Do-Liste: Migration von PostgreSQL zu MSSQL (Next.js API)

## I. Globale Vorbereitungen & Konfiguration

- [ ] **MSSQL-Treiber installieren:**
    - Führe `npm install mssql` oder `yarn add mssql` in deinem Projektverzeichnis aus.
- [ ] **Datenbankverbindungslogik anpassen (z.B. in `@/lib/db.ts`):**
    - [ ] Importiere den `mssql`-Treiber (z.B. `import sql from 'mssql';`).
    - [ ] Schreibe die Funktion `getDbPool` um, sodass sie einen MSSQL-Verbindungspool (`sql.ConnectionPool`) verwendet und zurückgibt.
    - [ ] Konfiguriere die Verbindungsparameter für MSSQL (Server, Datenbankname `BeschwerdeManagement_CV`, Benutzer, Passwort, Port, `options.encrypt`, `options.trustServerCertificate` etc.).
    - [ ] Ersetze PostgreSQL-spezifische Client-Typen (z.B. `PoolClient` von `pg`) durch entsprechende Typen des `mssql`-Treibers (z.B. `sql.ConnectionPool`, `sql.Request`).
- [ ] **Typ-Importe global anpassen:**
    - [ ] Entferne `import { type QueryResultRow } from 'pg';` oder ersetze es durch äquivalente Typen des `mssql`-Treibers, falls vorhanden und notwendig (oft geben Treiber einfach `any[]` oder generische Objekte zurück).

## II. Anpassung der API-Routen (Datenbankinteraktion)

**Für jede der folgenden Routendateien:**

- **Allgemeine Anpassungen pro Datei:**
    - [ ] Ersetze `pg`-spezifische Importe durch `mssql`.
    - [ ] Passe alle `client.query(...)`-Aufrufe an die Syntax des `mssql`-Treibers an. Typischerweise erstellst du ein `request`-Objekt vom Pool, fügst Inputs hinzu und führst dann `query()` oder `execute()` aus (z.B. `const request = pool.request(); request.input('paramName', sql.VarChar, value); const result = await request.query('SELECT * FROM table WHERE col = @paramName');`).
    - [ ] Stelle alle SQL-Parameter von PostgreSQLs `$1, $2, ...` auf benannte Parameter für MSSQL um (z.B. `@param1, @param2, ...`).
    - [ ] Ersetze String-Verkettungen in SQL-Queries von `||` auf `+` (konsistent mit deiner DDL) oder verwende die `CONCAT()` Funktion.
    - [ ] Ersetze `RETURNING ...`-Klauseln (PostgreSQL) durch die `OUTPUT inserted.*` (oder `OUTPUT inserted.spaltenname, ...`)-Klausel von MSSQL.
    - [ ] Ersetze `FOR UPDATE`-Klauseln (PostgreSQL) durch MSSQL Locking Hints (z.B. `WITH (UPDLOCK)` oder `WITH (ROWLOCK, UPDLOCK)`).
    - [ ] Überprüfe und passe das Handling von Datenbankfehlern an. PostgreSQL-Fehlercodes (z.B. `23505` für Unique Constraint) müssen auf MSSQL-Fehlercodes (z.B. `2627` oder `2601` für Unique Constraint Violation) und deren Auswertung umgestellt werden. Der Typ `DatabaseError` von `pg` existiert nicht mehr; der `mssql`-Treiber hat eigene Fehlerobjekte.

---

- [ ] **`app/api/admin/create-user/route.ts`**
    - [ ] `checkNameQuery`: Parameter anpassen (`LOWER($1)` -> `LOWER(@name)`).
    - [ ] `insertUserQuery`: Parameter und `RETURNING`-Klausel anpassen (`VALUES (@name, @nachname, @password, @isAdmin) OUTPUT inserted.id, inserted.username, inserted.name, inserted.nachname, inserted.ist_admin;`).

- [ ] **`app/api/containt/[id]/attachment/route.ts`**
    - [ ] `POST`-Handler:
        - [ ] `itemCheck`-Query (`SELECT ... FOR UPDATE`): Locking Hint und Parameter anpassen.
        - [ ] Dynamische `UPDATE`-Query (`updateQueryText`): Parameter und deren Aufbau anpassen.
        - [ ] `updatedItemResult`-Query (SELECT nach Update): String-Verkettung und Parameter anpassen.
    - [ ] `GET`-Handler:
        - [ ] `SELECT`-Query: Parameter anpassen.
    - [ ] `DELETE`-Handler:
        - [ ] `UPDATE`-Query (`RETURNING id`): `OUTPUT`-Klausel und Parameter anpassen.
        - [ ] `finalItemResult`-Query (SELECT nach Update): String-Verkettung und Parameter anpassen.

- [ ] **`app/api/containt/route.ts`**
    - [ ] `GET`-Handler (alle Beschwerden):
        - [ ] `SELECT`-Query: String-Verkettung (`u.name || ' ' || u.nachname`) anpassen.
    - [ ] `PATCH`-Handler:
        - [ ] `currentItemResult`-Query (`SELECT ... FOR UPDATE`): Locking Hint und Parameter anpassen.
        - [ ] Dynamische `UPDATE`-Query (`updateQueryText`): Parameter und `RETURNING id` (-> `OUTPUT inserted.id`) anpassen.
        - [ ] `finalSelectQuery`: String-Verkettung und Parameter anpassen.

- [ ] **`app/api/feedback/route.ts` (für "anregung")**
    - [ ] `GET`-Handler:
        - [ ] `SELECT`-Query: String-Verkettung anpassen.
    - [ ] `PATCH`-Handler:
        - [ ] `currentItemResult`-Query (`SELECT ... FOR UPDATE`): Locking Hint und Parameter anpassen.
        - [ ] Dynamische `UPDATE`-Query (`updateQueryText`): Parameter und `RETURNING id` (-> `OUTPUT inserted.id`) anpassen.
        - [ ] `finalSelectQuery`: String-Verkettung und Parameter anpassen.

- [ ] **`app/api/like/route.ts` (für "lob")**
    - [ ] `GET`-Handler:
        - [ ] `SELECT`-Query: String-Verkettung anpassen.
    - [ ] `PATCH`-Handler:
        - [ ] `currentItemResult`-Query (`SELECT ... FOR UPDATE`): Locking Hint und Parameter anpassen.
        - [ ] Dynamische `UPDATE`-Query (`updateQueryText`): Parameter und `RETURNING id` (-> `OUTPUT inserted.id`) anpassen.
        - [ ] `finalSelectQuery`: String-Verkettung und Parameter anpassen.

- [ ] **`app/api/login/route.ts`**
    - [ ] `SELECT`-Query: Parameter anpassen.

- [ ] **`app/api/statistics/route.ts`** (erfordert besondere Aufmerksamkeit)
    - [ ] Alle `SELECT`-Abfragen: Parameter und dynamische Filterkonditionen anpassen.
    - [ ] **PostgreSQL-spezifische Funktionen durch MSSQL-Äquivalente ersetzen:**
        - [ ] `TO_CHAR(datum, 'YYYY-MM-DD')` -> `FORMAT(datum, 'yyyy-MM-dd')` oder `CONVERT(varchar, datum, 23)`.
        - [ ] `CURRENT_DATE - INTERVAL '30 days'` -> `DATEADD(day, -30, GETDATE())`. (Beachte: `GETDATE()` liefert Datum+Zeit, ggf. `CAST(GETDATE() AS DATE)` verwenden, wenn nur Datum benötigt wird).
        - [ ] `TO_CHAR(uhrzeit, 'HH24:00')` -> `FORMAT(uhrzeit, 'HH:00')` oder `LEFT(CONVERT(varchar, uhrzeit, 108), 2) + ':00'`.
        - [ ] `uhrzeit + INTERVAL '1 hour'` -> `DATEADD(hour, 1, uhrzeit)`.
        - [ ] `EXTRACT(EPOCH FROM (abgeschlossenam - erstelltam))` -> `DATEDIFF(second, erstelltam, abgeschlossenam)`.
    - [ ] Die Logik für dynamische Parameter-Indizes (`$${paramIndex}`) und Array-basierte Parameter muss auf das Parametersystem des `mssql`-Treibers umgestellt werden (typischerweise durch dynamisches Hinzufügen von Inputs zu einem `request`-Objekt).

## III. Transaktionsmanagement

- [ ] Überprüfe alle Transaktionen (`BEGIN`, `COMMIT`, `ROLLBACK`).
    - [ ] Stelle sicher, dass die Transaktionssteuerung korrekt mit den Methoden des `mssql`-Treibers implementiert ist (z.B. über ein `transaction`-Objekt des `mssql`-Pakets: `transaction.begin()`, `transaction.commit()`, `transaction.rollback()`).

## IV. Testen

- [ ] **Jeden einzelnen API-Endpunkt gründlich testen:**
    - [ ] Funktionalität im "Happy Path" (erwartete Eingaben, erfolgreiche Operationen).
    - [ ] Verhalten bei Fehlerfällen (z.B. ungültige Eingabedaten, nicht existierende IDs).
    - [ ] Korrekte Verarbeitung und Rückgabe von Datenbankfehlern (z.B. Unique Constraint Violations).
    - [ ] Korrektheit der zurückgegebenen Datenstrukturen und Werte.
    - [ ] Performance-Implikationen im Auge behalten (optional, aber empfehlenswert).
- [ ] **Besonderer Fokus auf `statistics/route.ts`:** Teste diese Route mit verschiedenen Datumsfiltern (Startdatum, Enddatum, beides, keines), um die korrekte Funktion der angepassten Datumslogik sicherzustellen.
- [ ] Teste das Anlegen von Benutzern, um das Verhalten bei bereits existierenden Benutzernamen (generiert durch Vor-/Nachname) zu prüfen.

## V. Aufräumarbeiten & Sonstiges (Optional)

- [ ] Entferne alle alten PostgreSQL-spezifischen Code-Teile, Typen und Kommentare.
- [ ] Überprüfe und aktualisiere Umgebungsvariablen für die MSSQL-Datenbankverbindung.
- [ ] Erweitere oder passe das Logging an, um MSSQL-spezifische Fehler oder Informationen besser zu erfassen.

---