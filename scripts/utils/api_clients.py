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
    
class IUCNClient:
    """
    Client pour l'API IUCN Red List v4.
    Clé API v4 : https://api.iucnredlist.org/
    Utilise cloudscraper pour passer le bot-filtering Cloudflare.
    """

    BASE = "https://api.iucnredlist.org/api/v4"
    DELAY_BETWEEN = 1.0

    def __init__(self, token: str) -> None:
        self._headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        self._scraper = cloudscraper.create_scraper()

    def _fetch(self, genus: str, species: str) -> dict | None:
        resp = self._scraper.get(
            f"{self.BASE}/taxa/scientific_name",
            headers=self._headers,
            params={"genus_name": genus, "species_name": species},
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def get_species(self, scientific_name: str) -> dict | None:
        """
        Retourne {iucn_id, iucn_status, common_name_en, global_assessments} ou None.
        global_assessments : liste de {year, iucn_status} pour les évaluations
        de périmètre Global (scope code "1"), toutes années confondues.
        """
        parts = scientific_name.split(" ", 1)
        if len(parts) != 2:
            return None
        try:
            data = await asyncio.to_thread(self._fetch, *parts)
        except Exception:
            return None
        finally:
            await asyncio.sleep(self.DELAY_BETWEEN)

        if not data:
            return None

        taxon = data.get("taxon", {})
        assessments = data.get("assessments", [])

        def is_global(a: dict) -> bool:
            return any(s.get("code") == "1" for s in a.get("scopes", []))

        latest = next(
            (a for a in assessments if a.get("latest") and is_global(a)),
            None,
        ) or next((a for a in assessments if a.get("latest")), None)

        common_name_en = next(
            (cn["name"] for cn in taxon.get("common_names", [])
             if cn.get("main") and cn.get("language") == "eng"),
            None,
        )

        global_assessments = [
            {"year": int(a["year_published"]), "iucn_status": a["red_list_category_code"]}
            for a in assessments
            if is_global(a) and a.get("year_published") and a.get("red_list_category_code")
        ]

        return {
            "iucn_id":            taxon.get("sis_id"),
            "iucn_status":        latest.get("red_list_category_code") if latest else None,
            "common_name_en":     common_name_en,
            "global_assessments": global_assessments,
        }
