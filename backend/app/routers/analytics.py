from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_db
from app.models.observation import ObservationCountBySpecies, ObservationCountByYear
from app.models.species import IUCNStatusCount
from app.services import observation_service, species_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/time-series/{species_id}", response_model=list[ObservationCountByYear])
async def get_time_series(
    species_id: int,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
) -> list[ObservationCountByYear]:
    return await observation_service.get_time_series(db, species_id)


@router.get("/top-species", response_model=list[ObservationCountBySpecies])
async def get_top_species(
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    zone_id: Annotated[int | None, Query(description="Filtrer par zone géographique")] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[ObservationCountBySpecies]:
    return await observation_service.get_top_species(db, zone_id, limit)


@router.get("/conservation-status", response_model=list[IUCNStatusCount])
async def get_conservation_status(
    db: Annotated[asyncpg.Connection, Depends(get_db)],
) -> list[IUCNStatusCount]:
    return await species_service.get_iucn_distribution(db)
