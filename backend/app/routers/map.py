from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_db
from app.services import observation_service

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/observations")
async def get_map_observations(
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    species_id: Annotated[int | None, Query(description="Filtrer par espèce")] = None,
    zone_id: Annotated[int | None, Query(description="Filtrer par zone géographique")] = None,
    year_min: Annotated[int | None, Query(ge=1900, description="Année de début")] = None,
    year_max: Annotated[int | None, Query(ge=1900, description="Année de fin")] = None,
) -> dict:
    return await observation_service.get_map_observations(
        db, species_id, zone_id, year_min, year_max
    )
