from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_db
from app.models.common import PaginatedResponse
from app.models.species import SpeciesDetail, SpeciesListItem
from app.services import species_service
from cetascope_shared.models.conservation_history import ConservationHistoryDB

router = APIRouter(prefix="/species", tags=["species"])


@router.get("", response_model=PaginatedResponse[SpeciesListItem])
async def search_species(
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    q: Annotated[str | None, Query(description="Recherche par nom commun ou scientifique")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedResponse[SpeciesListItem]:
    items, total = await species_service.search_species(db, q, limit, offset)
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{species_id}", response_model=SpeciesDetail)
async def get_species(
    species_id: int,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
) -> SpeciesDetail:
    species = await species_service.get_species_by_id(db, species_id)
    if species is None:
        raise HTTPException(status_code=404, detail="Espèce introuvable")
    return species


@router.get("/{species_id}/conservation-history", response_model=list[ConservationHistoryDB])
async def get_conservation_history(
    species_id: int,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
) -> list[ConservationHistoryDB]:
    return await species_service.get_conservation_history(db, species_id)
