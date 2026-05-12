import asyncio
import httpx
import cloudscraper


_TRAVERSABLE_RANKS = frozenset({
    "Suborder", "Infraorder", "Parvorder",
    "Superfamily", "Family", "Subfamily",
    "Tribe", "Genus",
})


class WoRMSClient:
    """
    Client pour l'API WoRMS (World Register of Marine Species).
    Pas de clé API requise. Limite : 1 requête/seconde.
    """

    BASE = "https://www.marinespecies.org/rest"
    PAGE_SIZE = 50

    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def _get_children(self, aphia_id: int) -> list[dict]:
        url = f"{self.BASE}/AphiaChildrenByAphiaID/{aphia_id}"
        results = []
        offset = 1
        while True:
            resp = await self.client.get(url, params={"offset": offset})
            await asyncio.sleep(1)  # respect WoRMS rate limit
            if resp.status_code == 204:
                break
            resp.raise_for_status()
            batch = resp.json()
            results.extend(batch)
            if len(batch) < self.PAGE_SIZE:
                break
            offset += self.PAGE_SIZE
        return results

    async def get_all_species(self, taxon_id: int) -> list[dict]:
        """Parcourt récursivement la taxonomie et retourne tous les taxons de rang Species.
        Injecte `_is_echolocating` (True/False/None) dans chaque dict selon le sous-ordre.
        """
        return await self._recurse(taxon_id, depth=0, echolocating=None)

    async def _recurse(
        self, taxon_id: int, depth: int, echolocating: bool | None
    ) -> list[dict]:
        if depth > 12:
            # La taxonomie des cétacés ne dépasse pas 8 niveaux — garde-fou contre un cycle inattendu dans WoRMS
            return []

        species = []
        children = await self._get_children(taxon_id)

        for child in children:
            if child.get("status") != "accepted":
                continue
            rank = child.get("rank", "")
            name = child.get("scientificname", "")

            inherited = echolocating
            if rank == "Suborder":
                if name == "Odontoceti":
                    inherited = True
                elif name == "Mysticeti":
                    inherited = False

            if rank == "Species":
                child["_is_echolocating"] = inherited
                species.append(child)
            elif rank in _TRAVERSABLE_RANKS:
                sub = await self._recurse(child["AphiaID"], depth + 1, inherited)
                species.extend(sub)

        return species