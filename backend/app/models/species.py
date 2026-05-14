from cetascope_shared.models.species import (
    HabitatType,
    IUCNStatus,
    PopulationTrend,
    SpeciesDB,
)
from pydantic import BaseModel


class SpeciesListItem(BaseModel):
    id: int
    scientific_name: str
    common_name_fr: str | None = None
    common_name_en: str | None = None
    iucn_status: IUCNStatus | None = None
    population_trend: PopulationTrend | None = None
    habitat_type: HabitatType | None = None
    observation_count: int = 0
    image_url: str | None = None


class SpeciesDetail(SpeciesDB):
    observation_count: int = 0


class IUCNStatusCount(BaseModel):
    iucn_status: IUCNStatus | None = None
    species_count: int
    percentage: float
