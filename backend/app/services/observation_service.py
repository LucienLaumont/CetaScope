import json

import asyncpg

from app.models.observation import (
    ObservationCountBySpecies,
    ObservationCountByYear,
)


async def get_map_observations(
    db: asyncpg.Connection,
    species_id: int | None,
    zone_id: int | None,
    year_min: int | None,
    year_max: int | None,
) -> dict:
    """Retourne un GeoJSON FeatureCollection de points d'observations."""
    conditions: list[str] = []
    args: list[object] = []

    if species_id is not None:
        args.append(species_id)
        conditions.append(f"o.species_id = ${len(args)}")

    if zone_id is not None:
        args.append(zone_id)
        conditions.append(f"o.zone_id = ${len(args)}")

    if year_min is not None:
        args.append(year_min)
        conditions.append(f"EXTRACT(YEAR FROM o.observed_at) >= ${len(args)}")

    if year_max is not None:
        args.append(year_max)
        conditions.append(f"EXTRACT(YEAR FROM o.observed_at) <= ${len(args)}")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = await db.fetch(
        f"""
        SELECT
            o.id,
            o.species_id,
            s.scientific_name,
            s.common_name_fr,
            o.observed_at,
            o.individual_count,
            o.source,
            ST_AsGeoJSON(o.geom)::text AS geom_json
        FROM observations o
        JOIN species s ON s.id = o.species_id
        {where}
        """,
        *args,
    )

    features = [
        {
            "type": "Feature",
            "geometry": json.loads(row["geom_json"]),
            "properties": {
                "id": row["id"],
                "species_id": row["species_id"],
                "scientific_name": row["scientific_name"],
                "common_name_fr": row["common_name_fr"],
                "observed_at": str(row["observed_at"]),
                "individual_count": row["individual_count"],
                "source": row["source"],
            },
        }
        for row in rows
    ]

    return {"type": "FeatureCollection", "features": features}


async def get_time_series(
    db: asyncpg.Connection,
    species_id: int,
) -> list[ObservationCountByYear]:
    rows = await db.fetch(
        """
        SELECT year, SUM(count) AS count
        FROM observation_counts
        WHERE species_id = $1
        GROUP BY year
        ORDER BY year ASC
        """,
        species_id,
    )
    return [ObservationCountByYear(year=row["year"], count=row["count"]) for row in rows]


async def get_top_species(
    db: asyncpg.Connection,
    zone_id: int | None,
    limit: int = 10,
) -> list[ObservationCountBySpecies]:
    args: list[object] = []
    where = ""

    if zone_id is not None:
        args.append(zone_id)
        where = "WHERE o.zone_id = $1"

    args.append(limit)
    limit_placeholder = f"${len(args)}"

    rows = await db.fetch(
        f"""
        SELECT
            s.id   AS species_id,
            s.scientific_name,
            COUNT(o.id) AS count
        FROM observations o
        JOIN species s ON s.id = o.species_id
        {where}
        GROUP BY s.id
        ORDER BY count DESC
        LIMIT {limit_placeholder}
        """,
        *args,
    )
    return [ObservationCountBySpecies(**dict(row)) for row in rows]


