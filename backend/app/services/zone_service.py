import json

import asyncpg

from app.models.zone import ZoneChoropleth, ZoneResponse


async def list_zones(
    db: asyncpg.Connection,
    q: str | None = None,
) -> list[ZoneResponse]:
    if not q:
        rows = await db.fetch(
            """
            SELECT
                z.id, z.name, z.name_fr, z.zone_type, z.created_at,
                COUNT(o.id) AS observation_count
            FROM geographic_zones z
            LEFT JOIN observations o ON o.zone_id = z.id
            GROUP BY z.id
            ORDER BY z.name
            """
        )
        return [ZoneResponse(**dict(row)) for row in rows]

    # Recherche floue : ILIKE sur name et name_fr + trigramme pour les fautes
    like_q = f"%{q}%"
    rows = await db.fetch(
        """
        SELECT
            z.id, z.name, z.name_fr, z.zone_type, z.created_at,
            COUNT(o.id) AS observation_count
        FROM geographic_zones z
        LEFT JOIN observations o ON o.zone_id = z.id
        WHERE z.name    ILIKE $1
           OR z.name_fr ILIKE $1
           OR similarity(z.name,                   $2) > 0.25
           OR similarity(COALESCE(z.name_fr, ''),  $2) > 0.25
        GROUP BY z.id
        ORDER BY GREATEST(
            similarity(z.name,                  $2),
            similarity(COALESCE(z.name_fr, ''), $2)
        ) DESC
        """,
        like_q,
        q,
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
            z.name_fr,
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
        name_fr=row["name_fr"],
        geom=json.loads(row["geom_json"]),
        observation_count=obs_count,
        observation_density=round(density, 6),
        species_count=row["species_count"],
    )
