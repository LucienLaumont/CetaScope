"""
Analyse les codes IUCN bruts retournés pour toutes les espèces en base.
Identifie les codes non couverts par _LEGACY ni les codes modernes connus.

Usage :
    cd scripts && uv run analyse_iucn_codes.py
"""

import asyncio
import os
import sys
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.api_clients import IUCNClient
from utils.db_connector import get_connection, get_species_names

_MODERN = {"EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE"}
_LEGACY = {"E", "V", "R", "I", "K", "LR/cd", "LR/lc", "LR/nt"}
_EXCLUDE = {"N/A", "NA"}


async def main() -> None:
    load_dotenv(Path(__file__).parent.parent.parent / ".env")

    iucn_token = os.environ.get("IUCN_API_KEY")
    if not iucn_token:
        raise RuntimeError("IUCN_API_KEY manquante dans .env")

    conn = await get_connection()
    names = await get_species_names(conn)
    await conn.close()

    print(f"{len(names)} espèces à analyser…\n")

    iucn = IUCNClient(token=iucn_token)
    all_codes: Counter[str] = Counter()
    not_found: list[str] = []

    for i, name in enumerate(names, 1):
        data = await iucn.get_species(name)
        print(f"  [{i}/{len(names)}] {name}", flush=True)

        if not data:
            not_found.append(name)
            continue

        # Code de l'évaluation courante
        if data.get("iucn_status"):
            all_codes[data["iucn_status"]] += 1

        # Codes de tout l'historique
        for a in data.get("global_assessments", []):
            if a.get("iucn_status"):
                all_codes[a["iucn_status"]] += 1

    # --- Rapport ---
    print("\n" + "=" * 50)
    print("CODES RENCONTRÉS")
    print("=" * 50)

    unknown: list[tuple[str, int]] = []
    for code, count in sorted(all_codes.items(), key=lambda x: -x[1]):
        if code in _MODERN:
            category = "moderne ✓"
        elif code in _LEGACY:
            category = "legacy  ✓"
        elif code in _EXCLUDE:
            category = "exclu   ~"
        else:
            category = "INCONNU ✗"
            unknown.append((code, count))
        print(f"  {code:<12} {count:>4}x   {category}")

    print(f"\nEspèces non trouvées dans IUCN ({len(not_found)}) :")
    for name in not_found:
        print(f"  - {name}")

    if unknown:
        print(f"\n⚠ Codes non couverts ({len(unknown)}) — à ajouter dans _LEGACY ou _EXCLUDE :")
        for code, count in unknown:
            print(f"  '{code}': ???,   # {count} occurrence(s)")
    else:
        print("\n✓ Tous les codes sont couverts.")


if __name__ == "__main__":
    asyncio.run(main())
