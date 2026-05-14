import asyncpg

from app.models.species import IUCNStatusCount, SpeciesDetail, SpeciesListItem
from cetascope_shared.models.conservation_history import ConservationHistoryDB


async def search_species(
    db: asyncpg.Connection,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[SpeciesListItem], int]:
    if not q:
        count_row = await db.fetchrow("SELECT COUNT(*) FROM species")
        total: int = count_row["count"]
        rows = await db.fetch(
            """
            SELECT
                s.id, s.scientific_name, s.common_name_fr, s.common_name_en,
                s.iucn_status, s.population_trend, s.habitat_type,
                s.image_url,
                COUNT(o.id) AS observation_count
            FROM species s
            LEFT JOIN observations o ON o.species_id = s.id
            GROUP BY s.id
            ORDER BY s.scientific_name
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset,
        )
        return [SpeciesListItem(**dict(row)) for row in rows], total

    # Recherche floue : ILIKE (sous-chaîne) + trigramme (fautes de frappe)
    like_q = f"%{q}%"
    count_row = await db.fetchrow(
        """
        SELECT COUNT(*) FROM species s
        WHERE s.scientific_name ILIKE $1
           OR s.common_name_fr  ILIKE $1
           OR s.common_name_en  ILIKE $1
           OR similarity(s.scientific_name,        $2) > 0.3
           OR similarity(COALESCE(s.common_name_fr, ''), $2) > 0.3
           OR similarity(COALESCE(s.common_name_en, ''), $2) > 0.3
        """,
        like_q,
        q,
    )
    total = count_row["count"]

    rows = await db.fetch(
        """
        SELECT
            s.id, s.scientific_name, s.common_name_fr, s.common_name_en,
            s.iucn_status, s.population_trend, s.habitat_type,
            s.image_url,
            COUNT(o.id) AS observation_count
        FROM species s
        LEFT JOIN observations o ON o.species_id = s.id
        WHERE s.scientific_name ILIKE $1
           OR s.common_name_fr  ILIKE $1
           OR s.common_name_en  ILIKE $1
           OR similarity(s.scientific_name,             $2) > 0.3
           OR similarity(COALESCE(s.common_name_fr, ''), $2) > 0.3
           OR similarity(COALESCE(s.common_name_en, ''), $2) > 0.3
        GROUP BY s.id
        ORDER BY GREATEST(
            similarity(s.scientific_name,             $2),
            similarity(COALESCE(s.common_name_fr, ''), $2),
            similarity(COALESCE(s.common_name_en, ''), $2)
        ) DESC
        LIMIT $3 OFFSET $4
        """,
        like_q,
        q,
        limit,
        offset,
    )
    return [SpeciesListItem(**dict(row)) for row in rows], total


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
