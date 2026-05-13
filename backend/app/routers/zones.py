from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_db
from app.models.zone import ZoneChoropleth, ZoneResponse
from app.services import zone_service

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=list[ZoneResponse])
async def list_zones(
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    q: Annotated[str | None, Query(description="Recherche par nom de zone")] = None,
) -> list[ZoneResponse]:
    return await zone_service.list_zones(db, q)


@router.get("/{zone_id}/choropleth", response_model=ZoneChoropleth)
async def get_zone_choropleth(
    zone_id: int,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
) -> ZoneChoropleth:
    choropleth = await zone_service.get_zone_choropleth(db, zone_id)
    if choropleth is None:
        raise HTTPException(status_code=404, detail="Zone introuvable")
    return choropleth
