CREATE TABLE anregung (
	id serial4 NOT NULL,
	"name" varchar(255) NULL,
	email varchar(255) NULL,
	tel varchar(50) NULL,
	betreff varchar(255) NULL,
	beschreibung text NULL,
	erstelltam timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	status varchar(50) NULL,
	abgeschlossenam timestamptz NULL,
	bearbeiter_id int4 NULL,
	CONSTRAINT anregung_pkey PRIMARY KEY (id)
);

ALTER TABLE public.anregung ADD CONSTRAINT anregung_bearbeiter_id_fkey FOREIGN KEY (bearbeiter_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE public.beschwerde (
	id serial4 NOT NULL,
	"name" varchar(255) NULL,
	email varchar(255) NULL,
	tel varchar(50) NULL,
	betreff varchar(255) NULL,
	beschreibung text NULL,
	beschwerdegrund text NULL,
	datum date NULL,
	uhrzeit time NULL,
	haltestelle varchar(255) NULL,
	linie varchar(50) NULL,
	erstelltam timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	status varchar(50) NULL,
	abgeschlossenam timestamptz NULL,
	bearbeiter_id int4 NULL,
	CONSTRAINT beschwerde_pkey PRIMARY KEY (id)
);


-- public.beschwerde foreign keys

ALTER TABLE beschwerde ADD CONSTRAINT beschwerde_bearbeiter_id_fkey FOREIGN KEY (bearbeiter_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;


CREATE TABLE public.lob (
	id serial4 NOT NULL,
	"name" varchar(255) NULL,
	email varchar(255) NULL,
	tel varchar(50) NULL,
	betreff varchar(255) NULL,
	beschreibung text NULL,
	erstelltam timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	status varchar(50) NULL,
	abgeschlossenam timestamptz NULL,
	bearbeiter_id int4 NULL,
	CONSTRAINT lob_pkey PRIMARY KEY (id)
);


-- public.lob foreign keys

ALTER TABLE public.lob ADD CONSTRAINT lob_bearbeiter_id_fkey FOREIGN KEY (bearbeiter_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;



-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	nachname varchar(50) NOT NULL,
	username varchar(101) GENERATED ALWAYS AS (lower((name::text || '.'::text) || nachname::text)) STORED NULL,
	"password" varchar(72) NOT NULL,
	erstelltam timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	letzter_login timestamptz NULL,
	ist_admin bool DEFAULT false NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_username_key UNIQUE (username)
);