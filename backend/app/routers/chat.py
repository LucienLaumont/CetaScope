from typing import Annotated

import asyncpg
from fastapi import APIRouter, Depends
from google import genai

from app.dependencies import get_db, get_gemini_client
from app.models.chat import ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Annotated[asyncpg.Connection, Depends(get_db)],
    client: Annotated[genai.Client, Depends(get_gemini_client)],
) -> ChatResponse:
    return await chat_service.process_chat(db, client, body.query)
