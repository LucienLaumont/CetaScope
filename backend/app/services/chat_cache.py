"""
TTL+LRU cache pour les réponses du chatbot.

Justification : chaque appel `/chat` invoque Gemini et exécute plusieurs
requêtes DB (1–3 secondes). Les données OBIS/IUCN ne bougent qu'à la
sync mensuelle, donc une question identique a la même réponse pendant
des heures. Garder ça en mémoire RAM (pas de Redis) suffit largement
pour un déploiement single-process.

Le cache vit dans le module — il s'évapore au redémarrage de l'app
(typique sur HuggingFace Spaces) ce qui sert de purge implicite quand
le code change.
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from typing import Awaitable, Callable, Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    """LRU cache borné en taille + TTL par entrée. Thread/async safe."""

    def __init__(self, maxsize: int = 256, ttl_seconds: int = 86_400) -> None:
        self._store: OrderedDict[str, tuple[float, T]] = OrderedDict()
        self._lock = asyncio.Lock()
        self.maxsize = maxsize
        self.ttl = ttl_seconds
        self.hits = 0
        self.misses = 0

    def _normalize(self, key: str) -> str:
        return " ".join(key.lower().split())

    async def get_or_compute(
        self,
        key: str,
        factory: Callable[[], Awaitable[T]],
    ) -> T:
        norm = self._normalize(key)
        async with self._lock:
            entry = self._store.get(norm)
            if entry is not None:
                ts, value = entry
                if time.monotonic() - ts < self.ttl:
                    self._store.move_to_end(norm)
                    self.hits += 1
                    return value
                # expired
                del self._store[norm]

        # Cache miss (or expired): compute outside the lock to avoid
        # serializing concurrent requests on different keys.
        value = await factory()

        async with self._lock:
            self._store[norm] = (time.monotonic(), value)
            self._store.move_to_end(norm)
            while len(self._store) > self.maxsize:
                self._store.popitem(last=False)
            self.misses += 1
        return value

    def stats(self) -> dict[str, int]:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self._store),
            "maxsize": self.maxsize,
            "ttl_seconds": self.ttl,
            "hit_ratio_pct": round(self.hits / total * 100, 1) if total else 0,
        }


# Cache singleton du chatbot. 256 entrées × 24h.
chat_cache: TTLCache = TTLCache(maxsize=256, ttl_seconds=86_400)
