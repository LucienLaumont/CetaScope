import asyncpg

from app.models.species import IUCNStatusCount, SpeciesDetail, SpeciesListItem
from cetascope_shared.models.conservation_history import ConservationHistoryDB


async def search_species(
    db: asyncpg.Connection,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[SpeciesListItem], int]:
    where = ""
    args: list[object] = []

    if q:
        where = """
            WHERE s.scientific_name ILIKE $1
               OR s.common_name_fr  ILIKE $1
               OR s.common_name_en  ILIKE $1
        """
        args.append(f"%{q}%")

    count_row = await db.fetchrow(f"SELECT COUNT(*) FROM species s {where}", *args)
    total: int = count_row["count"]

    pagination_args = args + [limit, offset]
    limit_placeholder = f"${len(pagination_args) - 1}"
    offset_placeholder = f"${len(pagination_args)}"

    rows = await db.fetch(
        f"""
        SELECT
            s.id,
            s.scientific_name,
            s.common_name_fr,
            s.common_name_en,
            s.iucn_status,
            s.population_trend,
            s.habitat_type,
            COUNT(o.id) AS observation_count
        FROM species s
        LEFT JOIN observations o ON o.species_id = s.id
        {where}
        GROUP BY s.id
        ORDER BY s.scientific_name
        LIMIT {limit_placeholder} OFFSET {offset_placeholder}
        """,
        *pagination_args,
    )

    items = [SpeciesListItem(**dict(row)) for row in rows]
    return items, total


async def get_species_by_id(
    db: asyncpg.Connection,
    species_id: int,
) -> SpeciesDetail | None:
    row = await db.fetchrow(
        """
        SELECT
            s.*,
            COUNT(o.id) AS observation_count
        FROM species s
        LEFT JOIN observations o ON o.species_id = s.id
        WHERE s.id = $1
        GROUP BY s.id
        """,
        species_id,
    )
    if row is None:
        return None
    return SpeciesDetail(**dict(row))


async def get_conservation_history(
    db: asyncpg.Connection,
    species_id: int,
) -> list[ConservationHistoryDB]:
    rows = await db.fetch(
        """
        SELECT id, species_id, year, iucn_status, scope, created_at
        FROM conservation_history
        WHERE species_id = $1
        ORDER BY year ASC
        """,
        species_id,
    )
    return [ConservationHistoryDB(**dict(row)) for row in rows]


async def get_iucn_distribution(
    db: asyncpg.Connection,
) -> list[IUCNStatusCount]:
    total_row = await db.fetchrow("SELECT COUNT(*) FROM species")
    total: int = total_row["count"]

    rows = await db.fetch(
        """
        SELECT iucn_status, COUNT(*) AS species_count
        FROM species
        GROUP BY iucn_status
        ORDER BY species_count DESC
        """
    )
    return [
        IUCNStatusCount(
            iucn_status=row["iucn_status"],
            species_count=row["species_count"],
            percentage=round(row["species_count"] / total * 100, 1) if total else 0.0,
        )
        for row in rows
    ]
