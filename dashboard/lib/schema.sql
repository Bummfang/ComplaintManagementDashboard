-- =======================================================================
-- Erstellung der Tabelle: users
-- Enthält Benutzerinformationen und den berechneten Usernamen.
-- =======================================================================
CREATE TABLE users (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(50) NOT NULL,
    nachname NVARCHAR(50) NOT NULL,
    username AS (name + N'.' + nachname), -- Berechnete Spalte
    password NVARCHAR(255) NOT NULL,      -- Länge ggf. anpassen, 72 war im PG Schema, aber bcrypt Hashes können länger sein
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,
    letzter_login DATETIMEOFFSET NULL,
    ist_admin BIT NOT NULL DEFAULT 0,

    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_username UNIQUE (username) -- Sicherstellen, dass Usernamen einzigartig sind (wenn persistiert oder für Abfragen)
);
GO

-- =======================================================================
-- Erstellung der Tabelle: anregung
-- Speichert Anregungen.
-- =======================================================================
CREATE TABLE anregung (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    tel NVARCHAR(50) NULL,
    betreff NVARCHAR(255) NOT NULL,
    beschreibung NVARCHAR(MAX) NOT NULL,
    erstelltam DATETIME2 DEFAULT GETDATE() NOT NULL, -- timestamp ohne TZ in PG
    status NVARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,          -- timestamptz in PG
    bearbeiter_id INT NULL,

    CONSTRAINT PK_anregung PRIMARY KEY (id),
    CONSTRAINT FK_anregung_users FOREIGN KEY (bearbeiter_id) REFERENCES users(id)
);
GO

-- =======================================================================
-- Erstellung der Tabelle: beschwerde
-- Speichert Beschwerden, inklusive der speziellen Logik für interne_klaerungsart.
-- =======================================================================
CREATE TABLE beschwerde (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    tel NVARCHAR(50) NULL,
    beschreibung NVARCHAR(MAX) NOT NULL,
    beschwerdegrund NVARCHAR(MAX) NOT NULL, -- 'text NOT NULL' im PG Schema
    uhrzeit TIME NOT NULL,
    haltestelle NVARCHAR(255) NULL,
    linie NVARCHAR(50) NULL,
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL, -- timestamptz in PG
    status NVARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,          -- timestamptz in PG
    bearbeiter_id INT NULL,
    interne_notizen NVARCHAR(MAX) NULL,
    interne_klaerungsart NVARCHAR(20) NULL,
    interne_bereichsleiter_informiert BIT NOT NULL DEFAULT 0,
    interne_an_subunternehmer_weitergeleitet BIT NOT NULL DEFAULT 0,
    interne_kein_entschaedigung_weitergeleitet BIT NOT NULL DEFAULT 0,
    intern_geld_erstattet BIT NOT NULL DEFAULT 0,
    interne_erstattungsbetrag DECIMAL(10,2) NULL,

    CONSTRAINT PK_beschwerde PRIMARY KEY (id),
    CONSTRAINT FK_beschwerde_users FOREIGN KEY (bearbeiter_id) REFERENCES users(id),
    CONSTRAINT beschwerde_interne_klaerungsart_check -- Name wie von dir gewünscht
        CHECK (interne_klaerungsart IS NULL OR interne_klaerungsart IN (N'schriftlich', N'telefonisch'))
);
GO

-- =======================================================================
-- Erstellung der Tabelle: lob
-- Speichert Lob / positive Rückmeldungen.
-- =======================================================================
CREATE TABLE lob (
    id INT IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    tel NVARCHAR(50) NULL,
    betreff NVARCHAR(255) NOT NULL,
    beschreibung NVARCHAR(MAX) NOT NULL,
    erstelltam DATETIME2 DEFAULT GETDATE() NOT NULL, -- timestamp ohne TZ in PG
    status NVARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,          -- timestamptz in PG
    bearbeiter_id INT NULL,

    CONSTRAINT PK_lob PRIMARY KEY (id),
    CONSTRAINT FK_lob_users FOREIGN KEY (bearbeiter_id) REFERENCES users(id)
);
GO

