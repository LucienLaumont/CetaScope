from typing import Literal

from pydantic import BaseModel

ChatResponseType = Literal[
    "map",
    "choropleth",
    "time_series",
    "profile",
    "top_species",
    "conservation",
    "text",
]


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    type: ChatResponseType
    data: dict | list | None = None
    message: str
