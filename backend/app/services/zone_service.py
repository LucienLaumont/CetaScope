import json

import asyncpg

from app.models.zone import ZoneChoropleth, ZoneResponse


async def list_zones(
    db: asyncpg.Connection,
    q: str | None = None,
) -> list[ZoneResponse]:
    where = ""
    args: list[object] = []

    if q:
        where = "WHERE z.name ILIKE $1"
        args.append(f"%{q}%")

    rows = await db.fetch(
        f"""
        SELECT
            z.id,
            z.name,
            z.zone_type,
            z.created_at,
            COUNT(o.id) AS observation_count
        FROM geographic_zones z
        LEFT JOIN observations o ON o.zone_id = z.id
        {where}
        GROUP BY z.id
        ORDER BY z.name
        """,
        *args,
    )
    return [ZoneResponse(**dict(row)) for row in rows]


async def get_zone_choropleth(
    db: asyncpg.Connection,
    zone_id: int,
) -> ZoneChoropleth | None:
    row = await db.fetchrow(
        """
        SELECT
            z.id,
            z.name,
            ST_AsGeoJSON(z.geom)::text         AS geom_json,
            ST_Area(z.geom::geography) / 1e6   AS area_km2,
            COUNT(o.id)                         AS observation_count,
            COUNT(DISTINCT o.species_id)        AS species_count
        FROM geographic_zones z
        LEFT JOIN observations o ON o.zone_id = z.id
        WHERE z.id = $1
        GROUP BY z.id
        """,
        zone_id,
    )
    if row is None:
        return None

    area_km2: float = row["area_km2"] or 0.0
    obs_count: int = row["observation_count"]
    density = obs_count / area_km2 if area_km2 > 0 else 0.0

    return ZoneChoropleth(
        id=row["id"],
        name=row["name"],
        geom=json.loads(row["geom_json"]),
        observation_count=obs_count,
        observation_density=round(density, 6),
        species_count=row["species_count"],
    )
