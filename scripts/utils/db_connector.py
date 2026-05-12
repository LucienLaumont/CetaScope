import os
import asyncpg
from datetime import datetime, timezone


async def get_connection() -> asyncpg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL manquante dans .env")
    return await asyncpg.connect(url)

async def log_sync(
    conn: asyncpg.Connection,
    *,
    source: str,
    sync_type: str,
    added: int,
    updated: int,
    status: str,
    started_at: datetime,
    error: str | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO sync_logs
            (source, sync_type, records_added, records_updated, status, error_message, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        source,
        sync_type,
        added,
        updated,
        status,
        error,
        started_at,
        datetime.now(timezone.utc),
    )
