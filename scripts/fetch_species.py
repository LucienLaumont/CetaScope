"""
Récupère toutes les espèces de cétacés depuis WoRMS et les upserte dans la table species.
Fréquence cible : mensuelle (GitHub Actions cron).

Ce script crée uniquement les lignes. L'enrichissement (IUCN) est géré
par enrich_iucn.py.

Usage :
    cd scripts && python fetch_species.py
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import asyncpg
import httpx
from cetascope_shared.models.species import SpeciesTaxonomy
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from utils.api_clients import WoRMSClient
from utils.db_connector import get_connection, log_sync

CETACEA_APHIA_ID = 2688


def parse_worms(worms: dict) -> tuple[SpeciesTaxonomy, bool | None]:
    """Transforme un dict brut WoRMS en modèle validé + flag écholocation."""
    taxonomy = SpeciesTaxonomy(
        scientific_name=worms.get("valid_name") or worms["scientificname"],
        worms_id=worms.get("valid_AphiaID") or worms["AphiaID"],
        order_name=worms.get("order"),
        family_name=worms.get("family"),
        genus_name=worms.get("genus"),
    )
    return taxonomy, worms.get("_is_echolocating")


async def upsert_species(
    conn: asyncpg.Connection, taxonomy: SpeciesTaxonomy, is_echolocating: bool | None
) -> bool:
    """Upserte une espèce depuis WoRMS. Retourne True si insertion, False si mise à jour."""
    row = await conn.fetchrow(
        """
        INSERT INTO species
            (scientific_name, worms_id, order_name, family_name, genus_name, is_echolocating, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (scientific_name) DO UPDATE SET
            worms_id        = EXCLUDED.worms_id,
            order_name      = EXCLUDED.order_name,
            family_name     = EXCLUDED.family_name,
            genus_name      = EXCLUDED.genus_name,
            is_echolocating = EXCLUDED.is_echolocating,
            updated_at      = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS inserted
        """,
        taxonomy.scientific_name,
        taxonomy.worms_id,
        taxonomy.order_name,
        taxonomy.family_name,
        taxonomy.genus_name,
        is_echolocating,
    )
    return bool(row["inserted"])


async def main() -> None:
    load_dotenv(Path(__file__).parent.parent / ".env")
    started_at = datetime.now(timezone.utc)
    added = updated = 0

    conn = await get_connection()
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            worms = WoRMSClient(http)

            print(f"Récupération des espèces Cetacea depuis WoRMS (aphia_id={CETACEA_APHIA_ID})…", flush=True)
            species_list = await worms.get_all_species(CETACEA_APHIA_ID)
            print(f"{len(species_list)} espèces trouvées. Insertion en cours…", flush=True)

            for sp in species_list:
                try:
                    taxonomy, is_echolocating = parse_worms(sp)
                    was_inserted = await upsert_species(conn, taxonomy, is_echolocating)
                    if was_inserted:
                        added += 1
                    else:
                        updated += 1
                except asyncpg.exceptions.UniqueViolationError:
                    name = sp.get("valid_name") or sp["scientificname"]
                    print(f"  Skip doublon worms_id: {name}", flush=True)

        print(f"Terminé : {added} ajoutées, {updated} mises à jour.", flush=True)
        await log_sync(conn, source="WoRMS", sync_type="species",
                       added=added, updated=updated, status="success", started_at=started_at)

    except Exception as exc:
        await log_sync(conn, source="WoRMS", sync_type="species",
                       added=added, updated=updated, status="error", started_at=started_at, error=str(exc))
        raise

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
