-- ============================================================
-- 005 — Recherche floue (pg_trgm) + noms de zones en français
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE geographic_zones
ADD COLUMN IF NOT EXISTS name_fr TEXT;

-- Index trigrammes sur species
CREATE INDEX IF NOT EXISTS idx_species_trgm_scientific
    ON species USING GIN (scientific_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_species_trgm_fr
    ON species USING GIN (common_name_fr gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_species_trgm_en
    ON species USING GIN (common_name_en gin_trgm_ops);

-- Index trigrammes sur geographic_zones
CREATE INDEX IF NOT EXISTS idx_zones_trgm_name
    ON geographic_zones USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_zones_trgm_name_fr
    ON geographic_zones USING GIN (name_fr gin_trgm_ops);
