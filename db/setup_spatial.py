# /// script
# dependencies = ["asyncpg", "python-dotenv"]
# ///
"""
Exécute la migration PostGIS pour activer les fonctionnalités spatiales.
"""

import asyncio
import os
import sys
from pathlib import Path
import asyncpg
from dotenv import load_dotenv

# Chemins
ROOT = Path(__file__).parent.parent
MIGRATION_PATH = ROOT / "db" / "migrations" / "002_activate_postgis.sql"

async def setup_postgis():
    load_dotenv(ROOT / ".env")
    url = os.environ.get("DATABASE_URL")
    
    if not url:
        print("Erreur : DATABASE_URL non trouvée dans le .env")
        sys.exit(1)

    if not MIGRATION_PATH.exists():
        print(f"Erreur : Le fichier {MIGRATION_PATH} est introuvable.")
        sys.exit(1)

    print(f"[1] Connexion à la base de données...")
    conn = await asyncpg.connect(url)
    
    try:
        print(f"[2] Exécution de : {MIGRATION_PATH.name}...")
        sql = MIGRATION_PATH.read_text(encoding="utf-8")
        
        # On utilise une transaction pour s'assurer que tout passe ou rien ne passe
        async with conn.transaction():
            await conn.execute(sql)
            
        print("[3] PostGIS activé et triggers installés avec succès.")
        
    except Exception as e:
        print(f"Erreur lors de l'exécution du SQL : {e}")
        sys.exit(1)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_postgis())