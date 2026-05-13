from datetime import datetime

from pydantic import BaseModel


class ZoneResponse(BaseModel):
    id: int
    name: str
    name_fr: str | None = None
    zone_type: str
    created_at: datetime
    observation_count: int = 0


class ZoneChoropleth(BaseModel):
    id: int
    name: str
    name_fr: str | None = None
    geom: dict  # GeoJSON MultiPolygon geometry
    observation_count: int
    observation_density: float  # observations par km²
    species_count: int
