from cetascope_shared.models.observation import ObservationDB, ObservationSource
from pydantic import BaseModel

ObservationResponse = ObservationDB


class ObservationCountByYear(BaseModel):
    year: int
    count: int


class ObservationCountBySource(BaseModel):
    source: ObservationSource
    count: int


class ObservationCountBySpecies(BaseModel):
    species_id: int
    scientific_name: str
    count: int


class ObservationStats(BaseModel):
    total_count: int
    by_year: list[ObservationCountByYear]
    by_source: list[ObservationCountBySource]
    by_species: list[ObservationCountBySpecies]
