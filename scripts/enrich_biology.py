"""
Enrichit les espèces avec les données biologiques via Gemini.
One-shot : ne touche que les lignes dont au moins un champ est null.

Champs mis à jour : gestation_days, lifespan_years, is_echolocating, habitat_type.

habitat_type — vocabulaire contrôlé (4 valeurs) :
  Oceanic            haute mer, pélagique
  Coastal & Oceanic  espèces non limitées à une zone
  Estuarine          estuaires, eaux saumâtres
  Freshwater         rivières, fleuves

Usage :
    cd scripts && python enrich_biology.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from itertools import batched
from pathlib import Path

import asyncpg
from cetascope_shared.models.species import SpeciesBiology
from dotenv import load_dotenv
from google import genai
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent))
from utils.db_connector import get_connection, log_sync
from utils.gemini import fetch_gemini_json

BATCH_SIZE = 10

SYSTEM = (
    "You are a marine biology reference. "
    "Return accurate biological data for cetacean species. "
    "Use null when a value is unknown or uncertain."
)

PROMPT = """\
For each cetacean species listed below, provide the following biological data.

Return ONLY valid JSON — no markdown, no explanation — with this exact structure:
{{
  "<scientific_name>": {{
    "gestation_days": <gestation period in days, integer or null>,
    "lifespan_years": <maximum known lifespan in years, integer or null>,
    "is_echolocating": <true for Odontoceti (toothed), false for Mysticeti (baleen)>,
    "habitat_type": <one of exactly: "Oceanic", "Coastal & Oceanic", "Estuarine", "Freshwater">
  }}
}}

Species:
{species_list}
"""


async def fetch_biology(client: genai.Client, names: list[str]) -> dict:
    prompt = PROMPT.format(species_list="\n".join(f"- {n}" for n in names))
    return await fetch_gemini_json(client, "gemini-3-flash-preview", SYSTEM, prompt)


def parse_gemini_biology(name: str, data: dict) -> SpeciesBiology | None:
    """Valide les données Gemini avant insertion. Retourne None si tout est null ou invalide."""
    try:
        bio = SpeciesBiology(
            gestation_days=data.get("gestation_days"),
            lifespan_years=data.get("lifespan_years"),
            is_echolocating=data.get("is_echolocating"),
            habitat_type=data.get("habitat_type"),
        )
    except ValidationError as e:
        print(f"  ⚠ Données invalides pour {name}: {e.error_count()} erreur(s) — ignoré", flush=True)
        return None
    if not any(v is not None for v in [bio.gestation_days, bio.lifespan_years,
                                        bio.is_echolocating, bio.habitat_type]):
        return None
    return bio


async def update_species(conn: asyncpg.Connection, name: str, bio: SpeciesBiology) -> None:
    await conn.execute(
        """
        UPDATE species SET
            gestation_days  = COALESCE(gestation_days,  $2),
            lifespan_years  = COALESCE(lifespan_years,  $3),
            is_echolocating = COALESCE(is_echolocating, $4),
            habitat_type    = COALESCE(habitat_type,    $5),
            updated_at      = NOW()
        WHERE scientific_name = $1
        """,
        name,
        bio.gestation_days,
        bio.lifespan_years,
        bio.is_echolocating,
        bio.habitat_type,
    )


async def main() -> None:
    load_dotenv(Path(__file__).parent.parent / ".env")
    started_at = datetime.now(timezone.utc)
    updated = 0

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise RuntimeError("GEMINI_API_KEY manquante dans .env")

    client = genai.Client(api_key=gemini_key)

    conn = await get_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT scientific_name FROM species
            WHERE gestation_days  IS NULL
               OR lifespan_years  IS NULL
               OR is_echolocating IS NULL
               OR habitat_type    IS NULL
            ORDER BY scientific_name
            """
        )
        names = [r["scientific_name"] for r in rows]
        if not names:
            print("Toutes les especes ont deja leurs donnees biologiques.", flush=True)
            return

        batches = list(batched(names, BATCH_SIZE))
        print(f"{len(names)} especes a enrichir en {len(batches)} batches…", flush=True)

        for i, batch in enumerate(batches, 1):
            print(f"\nBatch {i}/{len(batches)}…", flush=True)
            try:
                results = await fetch_biology(client, batch)
            except Exception as e:
                print(f"  Erreur batch {i}: {e}", flush=True)
                continue

            for name in batch:
                bio = parse_gemini_biology(name, results.get(name, {}))
                if bio is None:
                    print(f"  -- {name}: aucune donnée valide", flush=True)
                    continue
                await update_species(conn, name, bio)
                updated += 1
                print(
                    f"  OK {name}: "
                    f"gest={bio.gestation_days or '—'}j  "
                    f"life={bio.lifespan_years or '—'}ans  "
                    f"echo={bio.is_echolocating}  "
                    f"habitat={bio.habitat_type or '—'}",
                    flush=True,
                )

        print(f"\nTermine : {updated} especes mises a jour.", flush=True)
        await log_sync(conn, source="Gemini", sync_type="species_biology",
                       added=0, updated=updated, status="success", started_at=started_at)

    except Exception as exc:
        await log_sync(conn, source="Gemini", sync_type="species_biology",
                       added=0, updated=updated, status="error", started_at=started_at, error=str(exc))
        raise

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
