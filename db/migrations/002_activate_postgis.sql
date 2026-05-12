-- 1. ACTIVATION DE L'EXTENSION POSTGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. MISE À JOUR DE LA TABLE geographic_zones
-- On ajoute la colonne géométrique pour stocker les polygones des océans
ALTER TABLE geographic_zones 
ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326);

-- Index spatial pour accélérer les calculs de zone
CREATE INDEX IF NOT EXISTS idx_geographic_zones_geom 
ON geographic_zones USING GIST (geom);


-- 3. MISE À JOUR DE LA TABLE observations
-- On ajoute une colonne geom pour stocker la position sous forme de point PostGIS
ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Index spatial pour la table des observations
CREATE INDEX IF NOT EXISTS idx_observations_geom 
ON observations USING GIST (geom);


-- 4. CRÉATION DE LA FONCTION D'AUTOMATISATION
-- Cette fonction fait deux choses :
--    a. Transforme latitude/longitude en un point géométrique
--    b. Cherche la zone la plus proche/contenant le point pour remplir zone_id
CREATE OR REPLACE FUNCTION fn_process_observation_geography()
RETURNS TRIGGER AS $$
BEGIN
    -- Création de la géométrie du point (WGS84)
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);

    -- Attribution automatique du zone_id
    -- On utilise l'opérateur <-> (distance KNN) qui est ultra performant avec l'index GIST
    -- Cela permet d'attribuer la zone même si le point est légèrement hors polygone (côte)
    NEW.zone_id := (
        SELECT id 
        FROM geographic_zones 
        ORDER BY geographic_zones.geom <-> NEW.geom 
        LIMIT 1
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5. CRÉATION DU TRIGGER
-- Se déclenche à chaque insertion ou modification de coordonnées
DROP TRIGGER IF EXISTS trg_observations_geography ON observations;

CREATE TRIGGER trg_observations_geography
BEFORE INSERT OR UPDATE OF latitude, longitude 
ON observations
FOR EACH ROW 
EXECUTE FUNCTION fn_process_observation_geography();


-- 6. OPTIONNEL : MISE À JOUR DES DONNÉES EXISTANTES
-- Si vous avez déjà des données, décommentez la ligne suivante pour les synchroniser
-- UPDATE observations SET latitude = latitude;