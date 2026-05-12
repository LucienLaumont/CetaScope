# /// script
# dependencies = ["asyncpg", "python-dotenv"]
# ///
"""
Initialise la base de données CetaScope depuis zéro.

Étapes :
    1. Supprime les tables existantes
    2. Rejoue les migrations (db/migrations/*.sql)
    3. Lance fetch_species.py pour peupler les espèces
    4. Rejoue les seeds (db/seeds/*.sql)

Usage :
    cd cetascope
    uv run db/init_db.py
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
MIGRATIONS_DIR = ROOT / "db" / "migrations"
SEEDS_DIR = ROOT / "db" / "seeds"

DROP_TABLES = """
DROP TABLE IF EXISTS sync_logs          CASCADE;
DROP TABLE IF EXISTS conservation_history CASCADE;
DROP TABLE IF EXISTS observations       CASCADE;
DROP TABLE IF EXISTS species            CASCADE;
DROP TABLE IF EXISTS geographic_zones   CASCADE;
"""


async def run_sql_file(conn: asyncpg.Connection, path: Path) -> None:
    print(f"  → {path.name}")
    sql = path.read_text(encoding="utf-8")
    await conn.execute(sql)


async def init_schema(conn: asyncpg.Connection) -> None:
    print("\n[1/4] Suppression des tables existantes…")
    await conn.execute(DROP_TABLES)

    print("[2/4] Application des migrations…")
    for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
        await run_sql_file(conn, migration)


def run_fetch_species() -> None:
    print("\n[3/4] Récupération des espèces depuis WoRMS…")
    result = subprocess.run(
        ["uv", "run", "fetch_species.py"],
        cwd=ROOT / "scripts",
        env={**os.environ},
    )
    if result.returncode != 0:
        print("  ✗ fetch_species.py a échoué — arrêt.")
        sys.exit(1)


async def run_seeds(conn: asyncpg.Connection) -> None:
    print("\n[4/4] Application des seeds…")
    for seed in sorted(SEEDS_DIR.glob("*.sql")):
        await run_sql_file(conn, seed)


async def main() -> None:
    load_dotenv(ROOT / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("Erreur : DATABASE_URL manquante dans .env")
        sys.exit(1)

    conn = await asyncpg.connect(url)
    try:
        await init_schema(conn)
    finally:
        await conn.close()

    run_fetch_species()

    conn = await asyncpg.connect(url)
    try:
        await run_seeds(conn)
    finally:
        await conn.close()

    print("\nInitialisation terminée.")
    print("Prochaine étape : lancer enrich_iucn.py, enrich_morpho.py, enrich_biology.py")


if __name__ == "__main__":
    asyncio.run(main())
