"""
Enrichit les espèces avec les données de conservation IUCN Red List v4.
À exécuter après fetch_species.py. Fréquence cible : mensuelle (GitHub Actions cron).

Champs mis à jour :
  species            → iucn_status, iucn_id, common_name_en, population_trend
  conservation_history → une ligne par évaluation globale historique

Usage :
    cd scripts && python enrich_iucn.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from cetascope_shared.models.conservation_history import ConservationHistory
from utils.api_clients import IUCNClient
from utils.db_connector import get_connection, get_species_names, log_sync

# ---------------------------------------------------------------------------
# Normalisation des codes IUCN historiques → codes modernes
# ---------------------------------------------------------------------------
_LEGACY: dict[str, str] = {
    "E":     "EN",
    "V":     "VU",
    "R":     "NT",
    "I":     "DD",
    "K":     "DD",
    "LR/cd": "NT",
    "LR/lc": "LC",
    "LR/nt": "NT",
}
_EXCLUDE = {"N/A", "NA"}

def normalize_status(code: str | None) -> str | None:
    if not code:
        return None
    code = code.strip()
    if code in _EXCLUDE:
        return None
    return _LEGACY.get(code, code)


# ---------------------------------------------------------------------------
# Dérivation de population_trend depuis la trajectoire des évaluations globales
# ---------------------------------------------------------------------------
_SEVERITY: dict[str, int] = {
    "EX": 9, "EW": 8, "CR": 7, "EN": 6, "VU": 5, "NT": 4, "LC": 3,
}

def derive_trend(global_assessments: list[dict]) -> str:
    """
    Compare l'évaluation la plus ancienne à la plus récente.
    DD exclu (pas de tendance dérivable). Requiert ≥ 2 points comparables.
    """
    points = [
        (a["year"], _SEVERITY[normalize_status(a["iucn_status"])])
        for a in global_assessments
        if normalize_status(a["iucn_status"]) in _SEVERITY
    ]
    if len(points) < 2:
        return "unknown"
    points.sort()
    oldest, latest = points[0][1], points[-1][1]
    if latest < oldest:
        return "increasing"
    if latest > oldest:
        return "decreasing"
    return "stable"


# ---------------------------------------------------------------------------
# Écritures en base
# ---------------------------------------------------------------------------
async def update_species(conn, name: str, data: dict | None) -> None:
    trend = derive_trend(data["global_assessments"]) if data else None
    await conn.execute(
        """
        UPDATE species SET
            iucn_status      = $2,
            iucn_id          = $3,
            common_name_en   = $4,
            population_trend = $5,
            updated_at       = NOW()
        WHERE scientific_name = $1
        """,
        name,
        normalize_status(data.get("iucn_status")) if data else "NE",
        data.get("iucn_id") if data else None,
        data.get("common_name_en") if data else None,
        trend,
    )


async def upsert_conservation_history(conn, species_id: int,
                                      global_assessments: list[dict]) -> int:
    inserted = 0
    for a in global_assessments:
        status = normalize_status(a["iucn_status"])
        if status is None:
            continue
        entry = ConservationHistory(
            species_id=species_id,
            year=a["year"],
            iucn_status=status,
            scope="global",
        )
        await conn.execute(
            """
            INSERT INTO conservation_history (species_id, year, iucn_status, scope)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (species_id, year, scope) DO UPDATE SET iucn_status = EXCLUDED.iucn_status
            """,
            entry.species_id,
            entry.year,
            entry.iucn_status,
            entry.scope,
        )
        inserted += 1
    return inserted


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main() -> None:
    load_dotenv(Path(__file__).parent.parent / ".env")
    started_at = datetime.now(timezone.utc)
    updated = history_added = 0

    iucn_token = os.environ.get("IUCN_API_KEY")
    if not iucn_token:
        raise RuntimeError("IUCN_API_KEY manquante dans .env")

    conn = await get_connection()
    try:
        names = await get_species_names(conn)
        if not names:
            print("Aucune espèce en base. Exécute fetch_species.py d'abord.", flush=True)
            return

        print(f"{len(names)} espèces en base. Enrichissement IUCN en cours…", flush=True)

        iucn = IUCNClient(token=iucn_token)

        for i, name in enumerate(names, 1):
            data = await iucn.get_species(name)
            await update_species(conn, name, data)
            updated += 1

            if data and data["global_assessments"]:
                row = await conn.fetchrow(
                    "SELECT id FROM species WHERE scientific_name = $1", name
                )
                if row:
                    n = await upsert_conservation_history(
                        conn, row["id"], data["global_assessments"]
                    )
                    history_added += n

            status = normalize_status(data["iucn_status"]) if data else "—"
            trend  = derive_trend(data["global_assessments"]) if data else "—"
            print(f"  [{i}/{len(names)}] {name}  {status}  {trend}", flush=True)

        print(
            f"\nTerminé : {updated} espèces mises à jour, "
            f"{history_added} entrées conservation_history.",
            flush=True,
        )
        await log_sync(conn, source="IUCN", sync_type="species_conservation",
                       added=history_added, updated=updated,
                       status="success", started_at=started_at)

    except Exception as exc:
        await log_sync(conn, source="IUCN", sync_type="species_conservation",
                       added=0, updated=updated, status="error",
                       started_at=started_at, error=str(exc))
        raise

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
