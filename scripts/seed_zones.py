# /// script
# dependencies = ["geopandas", "geoalchemy2", "sqlalchemy", "psycopg2-binary", "python-dotenv"]
# ///

import os
from pathlib import Path
import geopandas as gpd
from shapely.geometry import MultiPolygon
from sqlalchemy import create_engine
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
SHP_PATH = ROOT / "data" / "World_Seas_IHO_v3" / "World_Seas_IHO_v3.shp" 

def main():
    load_dotenv(ROOT / ".env")
    db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        print("❌ DATABASE_URL manquante")
        return

    print("[1] Lecture du Shapefile (patience, c'est un gros morceau)...")
    # On charge le fichier
    gdf = gpd.read_file(SHP_PATH)

    # On prépare les colonnes pour coller à ta table
    # IHO Shapefile utilise souvent 'NAME' pour le nom de la mer
    gdf = gdf[['NAME', 'geometry']].copy()
    gdf.columns = ['name', 'geom']
    gdf = gdf.set_geometry('geom')
    gdf['geom'] = gdf['geom'].apply(
        lambda g: g if g.geom_type == 'MultiPolygon' else MultiPolygon([g])
    )
    gdf['zone_type'] = 'IHO Sea Area'

    print(f"[2] Connexion à la base et injection de {len(gdf)} zones...")
    engine = create_engine(db_url)
    
    # if_exists='append' car ton init_db a déjà créé la structure
    # dtype={'geom': 'geometry'} informe que c'est une colonne spatiale
    gdf.to_postgis('geographic_zones', engine, if_exists='append', index=False)

    print("[3] C'est fait ! Tes zones maritimes sont prêtes.")

if __name__ == "__main__":
    main()