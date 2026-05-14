from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

IUCNStatus = Literal["EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE"]
PopulationTrend = Literal["increasing", "decreasing", "stable", "unknown"]
HabitatType = Literal["Oceanic", "Coastal & Oceanic", "Estuarine", "Freshwater"]


class SpeciesTaxonomy(BaseModel):
    scientific_name: str
    worms_id: int
    order_name: str | None = None
    family_name: str | None = None
    genus_name: str | None = None
    common_name_fr: str | None = None
    common_name_en: str | None = None


class SpeciesConservation(BaseModel):
    iucn_id: int | None = None
    iucn_status: IUCNStatus | None = None
    population_trend: PopulationTrend | None = None


class SpeciesMorphology(BaseModel):
    length_m_min: float | None = Field(None, gt=0)
    length_m_max: float | None = Field(None, gt=0)
    weight_kg_min: float | None = Field(None, gt=0)
    weight_kg_max: float | None = Field(None, gt=0)


class SpeciesBiology(BaseModel):
    lifespan_years: int | None = Field(None, gt=0)
    gestation_days: int | None = Field(None, gt=0)
    is_echolocating: bool | None = None
    habitat_type: HabitatType | None = None


class Species(SpeciesTaxonomy, SpeciesConservation, SpeciesMorphology, SpeciesBiology):
    """Modèle complet — utilisé pour les upserts en base."""


class SpeciesDB(Species):
    """Modèle retourné depuis la base de données."""

    id: int
    created_at: datetime
    updated_at: datetime
    image_url: str | None = None
