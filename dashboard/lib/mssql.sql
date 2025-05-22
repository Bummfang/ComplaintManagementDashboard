
-- Achtung!! MSSQL unterscheidet sich bei den Daten massive von Postgres!

CREATE TABLE users (
    id INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    nachname NVARCHAR(50) NOT NULL,
    -- Corrected username definition:
    -- It relies on the defined lengths of [name] (NVARCHAR(50)) and nachname (NVARCHAR(50)).
    -- The result of [name] + N'.' + nachname will be NVARCHAR(101).
    username AS (LOWER([name] + N'.' + nachname)) PERSISTED,
    [password] VARCHAR(72) NOT NULL, -- Annahme: Passwort-Hashes, kein Unicode nötig
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NULL,
    letzter_login DATETIMEOFFSET NULL,
    ist_admin BIT DEFAULT 0 NULL, -- PostgreSQL bool DEFAULT false wird zu MS SQL BIT DEFAULT 0
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username) -- This will now work
);



CREATE TABLE anregung (
    id INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(255) NULL, -- NVARCHAR für potenzielle Sonderzeichen
    email NVARCHAR(255) NULL,   -- NVARCHAR für E-Mail-Adressen (können internationale Zeichen enthalten)
    tel VARCHAR(50) NULL,       -- VARCHAR für Telefonnummern
    betreff NVARCHAR(255) NULL,
    beschreibung NVARCHAR(MAX) NULL, -- PostgreSQL text wird zu NVARCHAR(MAX)
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NULL, -- PostgreSQL timestamptz wird zu DATETIMEOFFSET
    status VARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,
    bearbeiter_id INT NULL,     -- PostgreSQL int4 wird zu INT
    CONSTRAINT anregung_pkey PRIMARY KEY (id)
);



ALTER TABLE anregung ADD CONSTRAINT anregung_bearbeiter_id_fkey
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;



CREATE TABLE beschwerde (
    id INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(255) NULL,
    email NVARCHAR(255) NULL,
    tel VARCHAR(50) NULL,
    betreff NVARCHAR(255) NULL,
    beschreibung NVARCHAR(MAX) NULL,
    beschwerdegrund NVARCHAR(MAX) NULL,
    datum DATE NULL,                     -- PostgreSQL date bleibt DATE
    uhrzeit TIME NULL,                   -- PostgreSQL time bleibt TIME
    haltestelle NVARCHAR(255) NULL,
    linie VARCHAR(50) NULL,
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NULL,
    status VARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,
    bearbeiter_id INT NULL,
    CONSTRAINT beschwerde_pkey PRIMARY KEY (id)
);



ALTER TABLE beschwerde ADD CONSTRAINT beschwerde_bearbeiter_id_fkey
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;



CREATE TABLE lob (
    id INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(255) NULL,
    email NVARCHAR(255) NULL,
    tel VARCHAR(50) NULL,
    betreff NVARCHAR(255) NULL,
    beschreibung NVARCHAR(MAX) NULL,
    erstelltam DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NULL,
    status VARCHAR(50) NULL,
    abgeschlossenam DATETIMEOFFSET NULL,
    bearbeiter_id INT NULL,
    CONSTRAINT lob_pkey PRIMARY KEY (id)
);



ALTER TABLE lob ADD CONSTRAINT lob_bearbeiter_id_fkey
    FOREIGN KEY (bearbeiter_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;


