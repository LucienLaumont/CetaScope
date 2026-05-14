from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.dependencies import create_pool, get_settings
from app.routers import analytics, chat, map, species, zones


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    app.state.db_pool = await create_pool(settings.database_url)
    yield
    await app.state.db_pool.close()


settings = get_settings()

app = FastAPI(title="CetaScope API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


app.include_router(species.router)
app.include_router(zones.router)
app.include_router(map.router)
app.include_router(analytics.router)
app.include_router(chat.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
