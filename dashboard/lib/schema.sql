-- Kompletter SQL-Schema-Dump für das Beschwerdemanagement-System
-- Datenbank: PostgreSQL

-- Zuerst die Tabelle 'users' erstellen, da andere Tabellen davon abhängen.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    nachname VARCHAR(50) NOT NULL,
    username VARCHAR(101) GENERATED ALWAYS AS (LOWER(name || '.' || nachname)) STORED UNIQUE,
    password VARCHAR(72) NOT NULL, -- Passwörter sollten immer sicher gehasht gespeichert werden!
    erstelltam TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    letzter_login TIMESTAMPTZ,
    ist_admin BOOLEAN DEFAULT FALSE
);

-- Tabelle für Anregungen
CREATE TABLE anregung (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255), -- Name der Person, die die Anregung einreicht
    email VARCHAR(255),
    tel VARCHAR(50),
    betreff VARCHAR(255),
    beschreibung TEXT,
    erstelltam TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50), -- z.B. 'offen', 'in Bearbeitung', 'abgeschlossen'. Ein DEFAULT Wert könnte hier sinnvoll sein, z.B. DEFAULT 'offen'.
    abgeschlossenam TIMESTAMPTZ,
    bearbeiter_id INTEGER,
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabelle für Beschwerden
CREATE TABLE beschwerde (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255), -- Name der Person, die die Beschwerde einreicht
    email VARCHAR(255),
    tel VARCHAR(50),
    betreff VARCHAR(255),
    beschreibung TEXT,      -- Allgemeine Beschreibung
    beschwerdegrund TEXT,   -- Spezifischer Grund der Beschwerde
    datum DATE,             -- Datum des Vorfalls
    uhrzeitzeit TIME,              -- Uhrzeit des Vorfalls
    haltestelle VARCHAR(255),
    linie VARCHAR(50),
    erstelltam TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50), -- z.B. 'offen', 'in Bearbeitung', 'abgeschlossen'. Ein DEFAULT Wert könnte hier sinnvoll sein, z.B. DEFAULT 'offen'.
    abgeschlossenam TIMESTAMPTZ,
    bearbeiter_id INTEGER,
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabelle für Lob
CREATE TABLE lob (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255), -- Name der Person, die das Lob ausspricht
    email VARCHAR(255),
    tel VARCHAR(50),
    betreff VARCHAR(255),
    beschreibung TEXT,
    erstelltam TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50), -- z.B. 'neu', 'gesichtet', 'danke gesagt'. Ein DEFAULT Wert könnte hier sinnvoll sein, z.B. DEFAULT 'neu'.
    abgeschlossenam TIMESTAMPTZ, -- Ggf. nicht relevant für Lob oder anders interpretieren
    bearbeiter_id INTEGER, -- Ggf. wer das Lob entgegengenommen/bearbeitet hat
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Mögliche weitere Ergänzungen (als Kommentar, da nicht aus den Screenshots ersichtlich):
-- Indizes für häufig abgefragte Spalten zur Performanceverbesserung:
-- CREATE INDEX idx_anregung_status ON anregung(status);
-- CREATE INDEX idx_anregung_email ON anregung(email);
-- CREATE INDEX idx_beschwerde_status ON beschwerde(status);
-- CREATE INDEX idx_beschwerde_email ON beschwerde(email);
-- CREATE INDEX idx_beschwerde_haltestelle ON beschwerde(haltestelle);
-- CREATE INDEX idx_beschwerde_linie ON beschwerde(linie);
-- CREATE INDEX idx_lob_email ON lob(email);

-- Check Constraints für Spalten wie 'status', um nur erlaubte Werte zuzulassen:
-- ALTER TABLE anregung ADD CONSTRAINT chk_anregung_status CHECK (status IN ('offen', 'in Bearbeitung', 'abgeschlossen', 'abgelehnt'));
-- (Beispielwerte, an deine Bedürfnisse anpassen)