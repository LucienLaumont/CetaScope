from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from cetascope_shared.models.species import IUCNStatus

AssessmentScope = Literal["global", "regional"]


class ConservationHistory(BaseModel):
    """Modèle complet — utilisé pour les upserts en base."""

    species_id: int
    year: int = Field(ge=1963)
    iucn_status: IUCNStatus
    scope: AssessmentScope = "global"


class ConservationHistoryDB(ConservationHistory):
    """Modèle retourné depuis la base de données."""

    id: int
    created_at: datetime
