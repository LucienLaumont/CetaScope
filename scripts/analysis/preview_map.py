# /// script
# dependencies = ["asyncpg", "folium", "python-dotenv"]
# ///

import asyncio
import os
from pathlib import Path
import folium
import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent.parent
SPECIES = "Orcinus orca"

async def main():
    load_dotenv(ROOT / ".env")
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])

    rows = await conn.fetch(
        """
        SELECT latitude, longitude
        FROM observations o
        JOIN species s ON s.id = o.species_id
        WHERE s.scientific_name = $1
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        """,
        SPECIES,
    )
    await conn.close()

    print(f"{len(rows)} observations chargées pour {SPECIES}")

    m = folium.Map(location=[30, 0], zoom_start=2, tiles="CartoDB dark_matter")

    for r in rows:
        folium.CircleMarker(
            location=[r["latitude"], r["longitude"]],
            radius=2,
            color="#00b4d8",
            fill=True,
            fill_opacity=0.6,
            weight=0,
        ).add_to(m)

    out = ROOT / "preview_orca.html"
    m.save(str(out))
    print(f"Carte sauvegardée : {out}")

if __name__ == "__main__":
    asyncio.run(main())
