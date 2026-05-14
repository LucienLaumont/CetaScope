"""
Upload du logo CetaScope vers Supabase Storage (bucket existant
`species-images`, sous-dossier `brand/`).

Idempotent : relancer remplace l'objet existant grâce à `x-upsert: true`.

Utilisation :
    cd scripts && python upload_logo.py

Pré-requis dans .env :
    SUPABASE_URL=https://<project-ref>.supabase.co
    SUPABASE_SERVICE_KEY=<service_role_key>

Le script imprime l'URL publique à la fin — colle-la dans
`frontend/config.js` sous `logoUrl`.
"""

import asyncio
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

BUCKET = "species-images"
OBJECT_PATH = "brand/logo.png"
SOURCE = Path(__file__).resolve().parents[1] / "data" / "logo" / "cetascope_logo.png"


async def main() -> None:
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    supabase_url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env.")
    if not SOURCE.exists():
        raise SystemExit(f"Fichier introuvable : {SOURCE}")

    body = SOURCE.read_bytes()
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            f"{supabase_url}/storage/v1/object/{BUCKET}/{OBJECT_PATH}",
            headers={
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "image/png",
                "x-upsert": "true",
            },
            content=body,
        )
        if r.status_code not in (200, 201):
            raise SystemExit(f"Upload échec : {r.status_code} {r.text}")

    public_url = f"{supabase_url}/storage/v1/object/public/{BUCKET}/{OBJECT_PATH}"
    print(f"Logo uploadé ({len(body) / 1024:.0f} Ko).")
    print()
    print("URL publique :")
    print(f"  {public_url}")
    print()
    print("→ Colle cette URL dans frontend/config.js sous `logoUrl`.")


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))  # noqa: E402
    asyncio.run(main())
