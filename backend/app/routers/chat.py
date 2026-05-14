from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import errors as genai_errors

from app.dependencies import get_db, get_gemini_client
from app.models.chat import ChatRequest, ChatResponse
from app.services import chat_service
from app.services.chat_cache import chat_cache

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    client: Annotated[genai.Client, Depends(get_gemini_client)],
) -> ChatResponse:
    try:
        return await chat_cache.get_or_compute(
            body.query,
            lambda: chat_service.process_chat(db, client, body.query),
        )
    except genai_errors.ServerError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.get("/cache/stats")
async def cache_stats() -> dict[str, int]:
    """Diagnostic — hit ratio, size, etc. Pratique pour vérifier l'efficacité."""
    return chat_cache.stats()
