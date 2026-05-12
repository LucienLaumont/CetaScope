from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ObservationSource = Literal["OBIS", "GBIF"]


class ObservationLocation(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    depth_m: float | None = Field(None, ge=0)
    zone_id: int | None = None


class ObservationEvent(BaseModel):
    species_id: int
    observed_at: date
    individual_count: int | None = Field(None, ge=1)


class ObservationProvenance(BaseModel):
    source: ObservationSource
    source_record_id: str


class Observation(ObservationLocation, ObservationEvent, ObservationProvenance):
    """Modèle complet — utilisé pour les upserts en base."""


class ObservationDB(Observation):
    """Modèle retourné depuis la base de données."""

    id: int
    created_at: datetime
