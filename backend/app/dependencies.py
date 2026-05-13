from functools import lru_cache
from typing import AsyncGenerator

import asyncpg
from fastapi import Depends, Request
from google import genai
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": (".env", "../.env"), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


async def create_pool(database_url: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )


async def get_db(
    request: Request,
) -> AsyncGenerator[asyncpg.Connection, None]:
    pool: asyncpg.Pool = request.app.state.db_pool
    async with pool.acquire() as connection:
        yield connection


def get_gemini_client(
    settings: Settings = Depends(get_settings),
) -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)
