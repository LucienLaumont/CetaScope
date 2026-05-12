# /// script
# dependencies = ["asyncpg", "folium", "python-dotenv"]
# ///

import asyncio
import json
import os
from pathlib import Path
import folium
import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent.parent
SPECIES = "Orcinus orca"
ZONE_NAME = "North Pacific Ocean"

async def main():
    load_dotenv(ROOT / ".env")
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])

    zone = await conn.fetchrow(
        """
        SELECT id, ST_AsGeoJSON(geom)::text AS geojson
        FROM geographic_zones
        WHERE name = $1
        """,
        ZONE_NAME,
    )
    if not zone:
        print(f"Zone '{ZONE_NAME}' introuvable en DB.")
        return

    observations = await conn.fetch(
        """
        SELECT o.latitude, o.longitude
        FROM observations o
        JOIN species s ON s.id = o.species_id
        WHERE s.scientific_name = $1
          AND o.zone_id = $2
          AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
        """,
        SPECIES,
        zone["id"],
    )
    await conn.close()

    print(f"{len(observations)} observations dans '{ZONE_NAME}'")

    m = folium.Map(location=[40, -170], zoom_start=3, tiles="CartoDB dark_matter")

    folium.GeoJson(
        data={"type": "Feature", "geometry": json.loads(zone["geojson"])},
        style_function=lambda _: {
            "fillColor": "#0077b6",
            "fillOpacity": 0.25,
            "color": "#90e0ef",
            "weight": 1.5,
        },
        name=ZONE_NAME,
    ).add_to(m)

    for r in observations:
        folium.CircleMarker(
            location=[r["latitude"], r["longitude"]],
            radius=2,
            color="#f77f00",
            fill=True,
            fill_opacity=0.7,
            weight=0,
        ).add_to(m)

    folium.LayerControl().add_to(m)

    out = ROOT / "preview_pacific.html"
    m.save(str(out))
    print(f"Carte sauvegardée : {out}")

if __name__ == "__main__":
    asyncio.run(main())
