"""
Enrichit les espèces avec les données morphologiques adultes via Gemini.
One-shot : ne touche que les lignes dont length_m_min ou length_m_max est null.

Champs mis à jour : length_m_min, length_m_max, weight_kg_min, weight_kg_max.
Les valeurs correspondent à des adultes (ni nouveau-nés ni juvéniles).

Usage :
    cd scripts && python enrich_morpho.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from itertools import batched
from pathlib import Path

import asyncpg
from cetascope_shared.models.species import SpeciesMorphology
from dotenv import load_dotenv
from google import genai
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent))
from utils.db_connector import get_connection, log_sync
from utils.gemini import fetch_gemini_json

BATCH_SIZE = 10

SYSTEM = (
    "You are a marine biology reference. "
    "For each cetacean species, return adult body measurements only — "
    "not newborn, not juvenile. Use null when the value is unknown."
)

PROMPT = """\
For each species listed below, provide typical adult body measurements.

Return ONLY valid JSON — no markdown, no explanation — with this exact structure:
{{
  "<scientific_name>": {{
    "length_m_min": <smallest typical adult length in metres, float or null>,
    "length_m_max": <largest known adult length in metres, float or null>,
    "weight_kg_min": <lightest typical adult weight in kg, float or null>,
    "weight_kg_max": <heaviest known adult weight in kg, float or null>
  }}
}}

Species:
{species_list}
"""


async def fetch_morpho(client: genai.Client, names: list[str]) -> dict:
    prompt = PROMPT.format(species_list="\n".join(f"- {n}" for n in names))
    return await fetch_gemini_json(client, "gemini-3-flash-preview", SYSTEM, prompt)


def parse_gemini_morpho(name: str, data: dict) -> SpeciesMorphology | None:
    """Valide les données Gemini avant insertion. Retourne None si tout est null ou invalide."""
    try:
        morpho = SpeciesMorphology(
            length_m_min=data.get("length_m_min"),
            length_m_max=data.get("length_m_max"),
            weight_kg_min=data.get("weight_kg_min"),
            weight_kg_max=data.get("weight_kg_max"),
        )
    except ValidationError as e:
        print(f"  ⚠ Données invalides pour {name}: {e.error_count()} erreur(s) — ignoré", flush=True)
        return None
    if not any(v is not None for v in [morpho.length_m_min, morpho.length_m_max,
                                        morpho.weight_kg_min, morpho.weight_kg_max]):
        return None
    return morpho


async def update_species(conn: asyncpg.Connection, name: str, morpho: SpeciesMorphology) -> None:
    await conn.execute(
        """
        UPDATE species SET
            length_m_min  = COALESCE(length_m_min,  $2),
            length_m_max  = COALESCE(length_m_max,  $3),
            weight_kg_min = COALESCE(weight_kg_min, $4),
            weight_kg_max = COALESCE(weight_kg_max, $5),
            updated_at    = NOW()
        WHERE scientific_name = $1
        """,
        name,
        morpho.length_m_min,
        morpho.length_m_max,
        morpho.weight_kg_min,
        morpho.weight_kg_max,
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
            WHERE length_m_min IS NULL OR length_m_max IS NULL
            ORDER BY scientific_name
            """
        )
        names = [r["scientific_name"] for r in rows]
        if not names:
            print("Toutes les especes ont deja leurs donnees morphologiques.", flush=True)
            return

        batches = list(batched(names, BATCH_SIZE))
        print(f"{len(names)} especes a enrichir en {len(batches)} batches…", flush=True)

        for i, batch in enumerate(batches, 1):
            print(f"\nBatch {i}/{len(batches)}…", flush=True)
            try:
                results = await fetch_morpho(client, batch)
            except Exception as e:
                print(f"  Erreur batch {i}: {e}", flush=True)
                continue

            for name in batch:
                morpho = parse_gemini_morpho(name, results.get(name, {}))
                if morpho is None:
                    print(f"  -- {name}: aucune donnée valide", flush=True)
                    continue
                await update_species(conn, name, morpho)
                updated += 1
                l = f"{morpho.length_m_min or '—'}–{morpho.length_m_max or '—'}m"
                w = f"{morpho.weight_kg_min or '—'}–{morpho.weight_kg_max or '—'}kg"
                print(f"  OK {name}: {l}  {w}", flush=True)

        print(f"\nTermine : {updated} especes mises a jour.", flush=True)
        await log_sync(conn, source="Gemini", sync_type="species_morphology",
                       added=0, updated=updated, status="success", started_at=started_at)

    except Exception as exc:
        await log_sync(conn, source="Gemini", sync_type="species_morphology",
                       added=0, updated=updated, status="error", started_at=started_at, error=str(exc))
        raise

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
