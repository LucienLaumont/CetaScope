"""
Upload curé d'images d'espèces vers Supabase Storage et mise à jour de la
colonne `species.image_url`. Idempotent — relancer à volonté.

Workflow :
1. Place tes images dans `data/species_images/` en suivant la convention
   `{nom_scientifique_slug}.{jpg|jpeg|png|webp}`.
   Le slug = nom scientifique lowercase, espaces → underscores.
   Exemples :
       Orcinus orca       → orcinus_orca.jpg
       Balaenoptera musculus → balaenoptera_musculus.jpg
2. Crée (manuellement, une fois) un bucket public `species-images`
   dans la console Supabase Storage. Le script peut aussi le créer.
3. Renseigne dans `.env` :
       SUPABASE_URL=https://<project-ref>.supabase.co
       SUPABASE_SERVICE_KEY=<service_role_key>      # PAS l'anon key
4. Lance : `cd scripts && python upload_species_images.py`

Le script :
  - crée le bucket s'il n'existe pas (public, idempotent),
  - upload chaque fichier en upsert (remplace si déjà présent),
  - met à jour `species.image_url` avec l'URL publique,
  - imprime un résumé (uploadés, sans match, sans image).
"""

import asyncio
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from utils.db_connector import get_connection  # noqa: E402


BUCKET = "species-images"
IMAGES_DIR = Path(__file__).resolve().parents[1] / "data" / "species_images"
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def slug_to_scientific_name(slug: str) -> str:
    """orcinus_orca → 'Orcinus orca' (premier mot capitalisé)."""
    parts = slug.replace("_", " ").split()
    if not parts:
        return slug
    parts[0] = parts[0].capitalize()
    return " ".join(parts)


async def ensure_bucket(client: httpx.AsyncClient, base_url: str, key: str) -> None:
    """Crée le bucket public s'il n'existe pas (sinon noop)."""
    r = await client.post(
        f"{base_url}/storage/v1/bucket",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"id": BUCKET, "name": BUCKET, "public": True},
    )
    if r.status_code in (200, 201):
        print(f"[bucket] créé : {BUCKET}")
    elif r.status_code == 409 or "already exists" in r.text.lower():
        pass  # déjà là
    else:
        raise RuntimeError(f"Création bucket impossible : {r.status_code} {r.text}")


async def upload_file(
    client: httpx.AsyncClient,
    base_url: str,
    key: str,
    path: Path,
) -> str:
    """Upload (upsert) un fichier et renvoie son URL publique."""
    ext = path.suffix.lower()
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")
    object_path = path.name
    with path.open("rb") as f:
        body = f.read()
    r = await client.post(
        f"{base_url}/storage/v1/object/{BUCKET}/{object_path}",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        content=body,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Upload échec ({path.name}) : {r.status_code} {r.text}")
    return f"{base_url}/storage/v1/object/public/{BUCKET}/{object_path}"


async def main() -> None:
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    supabase_url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit(
            "SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans .env."
        )
    if not IMAGES_DIR.exists():
        raise SystemExit(f"Dossier introuvable : {IMAGES_DIR}")

    files = sorted(p for p in IMAGES_DIR.iterdir() if p.suffix.lower() in ALLOWED_EXTS)
    if not files:
        print(f"Aucune image dans {IMAGES_DIR} (extensions acceptées : {', '.join(ALLOWED_EXTS)}).")
        return

    conn = await get_connection()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            await ensure_bucket(client, supabase_url, service_key)

            uploaded = 0
            no_match: list[str] = []
            for path in files:
                slug = path.stem.lower()
                sci_name = slug_to_scientific_name(slug)
                row = await conn.fetchrow(
                    "SELECT id, scientific_name FROM species "
                    "WHERE LOWER(scientific_name) = LOWER($1)",
                    sci_name,
                )
                if row is None:
                    no_match.append(path.name)
                    print(f"[skip] {path.name} → aucune espèce ne correspond à '{sci_name}'")
                    continue
                public_url = await upload_file(client, supabase_url, service_key, path)
                await conn.execute(
                    "UPDATE species SET image_url = $1, updated_at = NOW() WHERE id = $2",
                    public_url,
                    row["id"],
                )
                uploaded += 1
                print(f"[ok]   {row['scientific_name']:<32} ← {path.name}")

        # Résumé
        total_species_row = await conn.fetchrow("SELECT COUNT(*) FROM species")
        with_image_row = await conn.fetchrow(
            "SELECT COUNT(*) FROM species WHERE image_url IS NOT NULL"
        )
        print()
        print(f"Uploadés        : {uploaded}")
        print(f"Sans match DB   : {len(no_match)}")
        if no_match:
            print(f"  → {', '.join(no_match)}")
        print(
            f"Couverture base : {with_image_row['count']} / {total_species_row['count']} "
            f"espèce(s) avec image"
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
