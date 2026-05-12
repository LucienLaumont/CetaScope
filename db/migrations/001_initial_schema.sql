-- ============================================================
-- 001 — Schéma initial CetaScope
-- ============================================================

-- ------------------------------------------------------------
-- geographic_zones
-- ------------------------------------------------------------
CREATE TABLE geographic_zones (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,
    zone_type  TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- species
-- ------------------------------------------------------------
CREATE TABLE species (
    id               SERIAL      PRIMARY KEY,
    scientific_name  TEXT        NOT NULL UNIQUE,
    worms_id         INTEGER     UNIQUE,
    order_name       TEXT,
    family_name      TEXT,
    genus_name       TEXT,
    common_name_fr   TEXT,
    common_name_en   TEXT,

    -- IUCN
    iucn_id          INTEGER,
    iucn_status      TEXT        CHECK (iucn_status IN ('EX','EW','CR','EN','VU','NT','LC','DD','NE')),
    population_trend TEXT        CHECK (population_trend IN ('increasing','decreasing','stable','unknown')),

    -- Morphologie
    length_m_min     NUMERIC(6,2) CHECK (length_m_min > 0),
    length_m_max     NUMERIC(6,2) CHECK (length_m_max > 0),
    weight_kg_min    NUMERIC(10,2) CHECK (weight_kg_min > 0),
    weight_kg_max    NUMERIC(10,2) CHECK (weight_kg_max > 0),

    -- Biologie
    lifespan_years   SMALLINT    CHECK (lifespan_years > 0),
    gestation_days   SMALLINT    CHECK (gestation_days > 0),
    is_echolocating  BOOLEAN,
    habitat_type     TEXT        CHECK (habitat_type IN ('Oceanic','Coastal & Oceanic','Estuarine','Freshwater')),

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- observations
-- ------------------------------------------------------------
CREATE TABLE observations (
    id               SERIAL      PRIMARY KEY,
    species_id       INTEGER     NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    zone_id          INTEGER     REFERENCES geographic_zones(id) ON DELETE SET NULL,
    latitude         NUMERIC(8,5)  NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude        NUMERIC(9,5)  NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    observed_at      DATE        NOT NULL,
    source           TEXT        NOT NULL CHECK (source IN ('OBIS','GBIF')),
    source_record_id TEXT        NOT NULL,
    individual_count SMALLINT    CHECK (individual_count >= 1),
    depth_m          NUMERIC(7,1) CHECK (depth_m >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source, source_record_id)
);

CREATE INDEX obs_species_idx ON observations(species_id);
CREATE INDEX obs_date_idx    ON observations(observed_at);
CREATE INDEX obs_zone_idx    ON observations(zone_id);

-- ------------------------------------------------------------
-- conservation_history
-- ------------------------------------------------------------
CREATE TABLE conservation_history (
    id          SERIAL  PRIMARY KEY,
    species_id  INTEGER NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    year        SMALLINT NOT NULL CHECK (year >= 1963),
    iucn_status TEXT    NOT NULL CHECK (iucn_status IN ('EX','EW','CR','EN','VU','NT','LC','DD','NE')),
    -- 'global' = scope code 1 IUCN, 'regional' = toute autre évaluation
    scope       TEXT    NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'regional')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (species_id, year, scope)
);

-- ------------------------------------------------------------
-- sync_logs
-- ------------------------------------------------------------
CREATE TABLE sync_logs (
    id              SERIAL      PRIMARY KEY,
    source          TEXT        NOT NULL,
    sync_type       TEXT        NOT NULL,
    records_added   INTEGER     NOT NULL DEFAULT 0,
    records_updated INTEGER     NOT NULL DEFAULT 0,
    status          TEXT        NOT NULL CHECK (status IN ('success','error')),
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
