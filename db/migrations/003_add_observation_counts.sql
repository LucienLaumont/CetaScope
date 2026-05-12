CREATE TABLE observation_counts (
    id         SERIAL   PRIMARY KEY,
    species_id INTEGER  NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    year       SMALLINT NOT NULL,
    count      INTEGER  NOT NULL CHECK (count >= 0),
    source     TEXT     NOT NULL CHECK (source IN ('OBIS','GBIF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (species_id, year, source)
);

CREATE INDEX obs_counts_species_idx ON observation_counts(species_id);
