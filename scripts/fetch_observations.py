"""
Récupère les observations depuis OBIS (primaire) et GBIF (complément).

Deux tables alimentées :
- observations       : points géo pour la carte, cappés à MAX_GEO_PER_SPECIES
- observation_counts : agrégats annuels réels pour les graphiques de tendance

Stratégie source :
- OBIS pour toutes les espèces marines.
- GBIF en fallback si OBIS retourne 0 résultats (dauphins de rivière).

Usage :
    cd scripts && python fetch_observations.py
    cd scripts && python fetch_observations.py --since 2024-01-01   # incrémental
"""

import asyncio
import argparse
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
import sys

import asyncpg
import httpx
from dotenv import load_dotenv
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils.db_connector import get_connection, log_sync

DEFAULT_START_DATE = "2010-01-01"
OBIS_GEO_PAGE_SIZE = 500
OBIS_COUNT_PAGE_SIZE = 5000   # payloads minimaux (fields=date_year)
GBIF_PAGE_SIZE = 300
OBIS_DELAY = 1.0
GBIF_DELAY = 0.5
REQUEST_TIMEOUT = 60
INSERT_CHUNK = 500
MAX_GEO_PER_SPECIES = 15000


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def _parse_int(v) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


async def fetch_obis_geo(
    http: httpx.AsyncClient, scientific_name: str, start_date: str
) -> list[dict]:
    """Points géo OBIS pour la carte, cappés à MAX_GEO_PER_SPECIES."""
    records = []
    offset = 0
    while True:
        resp = await asyncio.wait_for(
            http.get(
                "https://api.obis.org/v3/occurrence",
                params={
                    "scientificname": scientific_name,
                    "startdate": start_date,
                    "size": OBIS_GEO_PAGE_SIZE,
                    "offset": offset,
                },
            ),
            timeout=REQUEST_TIMEOUT,
        )
        await asyncio.sleep(OBIS_DELAY)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])
        total = data.get("total", 0)

        for r in batch:
            if r.get("dropped") or r.get("absence"):
                continue
            lat = r.get("decimalLatitude")
            lon = r.get("decimalLongitude")
            record_id = str(r.get("occurrenceID", ""))[:100]
            if lat is None or lon is None or not record_id:
                continue
            records.append({
                "latitude": lat,
                "longitude": lon,
                "observed_at": _parse_date(r.get("eventDate")),
                "individual_count": _parse_int(r.get("individualCount")),
                "depth_m": None,
                "source_record_id": record_id,
            })

        offset += len(batch)
        if not batch or offset >= total or len(records) >= MAX_GEO_PER_SPECIES:
            break
    return records[:MAX_GEO_PER_SPECIES]


async def fetch_obis_counts(
    http: httpx.AsyncClient, scientific_name: str, start_date: str
) -> dict[int, int]:
    """Agrégat annuel OBIS complet (fields=date_year, sans cap)."""
    counts: dict[int, int] = defaultdict(int)
    offset = 0
    while True:
        resp = await asyncio.wait_for(
            http.get(
                "https://api.obis.org/v3/occurrence",
                params={
                    "scientificname": scientific_name,
                    "startdate": start_date,
                    "size": OBIS_COUNT_PAGE_SIZE,
                    "offset": offset,
                    "fields": "date_year",
                },
            ),
            timeout=REQUEST_TIMEOUT,
        )
        await asyncio.sleep(OBIS_DELAY)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])
        total = data.get("total", 0)

        for r in batch:
            year = r.get("date_year")
            if year:
                counts[int(year)] += 1

        offset += len(batch)
        if not batch or offset >= total:
            break
    return dict(counts)


async def fetch_gbif_geo_and_counts(
    http: httpx.AsyncClient, scientific_name: str, start_year: int
) -> tuple[list[dict], dict[int, int]]:
    """Fetch GBIF en une seule passe : retourne points géo ET agrégat annuel."""
    records = []
    counts: dict[int, int] = defaultdict(int)
    offset = 0
    end_year = date.today().year
    while True:
        resp = await asyncio.wait_for(
            http.get(
                "https://api.gbif.org/v1/occurrence/search",
                params={
                    "scientificName": scientific_name,
                    "year": f"{start_year},{end_year}",
                    "limit": GBIF_PAGE_SIZE,
                    "offset": offset,
                    "hasCoordinate": "true",
                    "hasGeospatialIssue": "false",
                },
            ),
            timeout=REQUEST_TIMEOUT,
        )
        await asyncio.sleep(GBIF_DELAY)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])

        for r in batch:
            lat = r.get("decimalLatitude")
            lon = r.get("decimalLongitude")
            record_id = str(r.get("key", ""))[:100]
            if lat is None or lon is None or not record_id:
                continue
            records.append({
                "latitude": lat,
                "longitude": lon,
                "observed_at": _parse_date(r.get("eventDate")),
                "individual_count": _parse_int(r.get("individualCount")),
                "depth_m": r.get("depth"),
                "source_record_id": record_id,
            })
            year = r.get("year")
            if year:
                counts[int(year)] += 1

        offset += len(batch)
        if data.get("endOfRecords", True) or not batch:
            break
    return records[:MAX_GEO_PER_SPECIES], dict(counts)


async def insert_geo(
    conn: asyncpg.Connection, species_id: int, source: str, records: list[dict]
) -> int:
    if not records:
        return 0
    
    # Préparation des données
    rows = [
        (
            species_id,
            r["latitude"],
            r["longitude"],
            r["observed_at"],
            source,
            r["individual_count"],
            r["depth_m"],
            r["source_record_id"],
        )
        for r in records
    ]

    for i in range(0, len(rows), INSERT_CHUNK):
        await conn.executemany(
            """
            INSERT INTO observations
                (species_id, latitude, longitude, observed_at, source,
                 individual_count, depth_m, source_record_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (source, source_record_id) DO NOTHING
            """,
            rows[i : i + INSERT_CHUNK],
        )
    return len(rows)


async def insert_counts(
    conn: asyncpg.Connection, species_id: int, source: str, counts: dict[int, int]
) -> int:
    if not counts:
        return 0
    rows = [(species_id, year, count, source) for year, count in counts.items()]
    await conn.executemany(
        """
        INSERT INTO observation_counts (species_id, year, count, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (species_id, year, source) DO UPDATE SET count = EXCLUDED.count
        """,
        rows,
    )
    return len(rows)


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--since",
        default=DEFAULT_START_DATE,
        help="Date de départ ISO (défaut: 2010-01-01). Ex: --since 2024-01-01",
    )
    args = parser.parse_args()

    load_dotenv(Path(__file__).parent.parent / ".env")
    started_at = datetime.now(timezone.utc)
    total_geo = 0

    conn = await get_connection()
    try:
        species_rows = await conn.fetch(
            "SELECT id, scientific_name FROM species ORDER BY scientific_name"
        )
        species_map = {r["scientific_name"]: r["id"] for r in species_rows}
        print(f"{len(species_map)} espèces. Fetch depuis {args.since}…", flush=True)

        async with httpx.AsyncClient(
            timeout=30,
            headers={"User-Agent": "CetaScope/1.0 (portfolio; contact: lucienlaumont36@gmail.com)"},
        ) as http:
            progress = tqdm(species_map.items(), total=len(species_map), unit="espèce")
            for name, sp_id in progress:
                progress.set_description(f"{name[:35]:<35}")
                try:
                    geo = await fetch_obis_geo(http, name, args.since)
                    counts = await fetch_obis_counts(http, name, args.since)
                    source = "OBIS"

                    if not geo and not counts:
                        start_year = date.fromisoformat(args.since).year
                        geo, counts = await fetch_gbif_geo_and_counts(
                            http, name, start_year
                        )
                        source = "GBIF"

                    n_geo = await insert_geo(conn, sp_id, source, geo)
                    n_years = await insert_counts(conn, sp_id, source, counts)
                    total_geo += n_geo
                    progress.write(f"  {name}: {n_geo} geo, {n_years} années ({source})")

                except Exception as e:
                    progress.write(f"  ERREUR {name}: {e}")

        print(f"Terminé : {total_geo} points géo.", flush=True)
        await log_sync(
            conn,
            source="OBIS+GBIF",
            sync_type="observations",
            added=total_geo,
            updated=0,
            status="success",
            started_at=started_at,
        )

    except Exception as exc:
        await log_sync(
            conn,
            source="OBIS+GBIF",
            sync_type="observations",
            added=total_geo,
            updated=0,
            status="error",
            started_at=started_at,
            error=str(exc),
        )
        raise

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
