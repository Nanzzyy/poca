"""Redis caching layer for AI responses — eliminates repeat DB queries."""

import hashlib
import json
import logging
from typing import Any

from redis.asyncio import Redis

logger = logging.getLogger(__name__)


class CacheService:
    """Async Redis cache for recommendations, plans, and search results."""

    def __init__(self, redis: Redis):
        self.redis = redis
        self._prefix = "poca:"

    # ── Recommendation cache ────────────────────────────────────────

    async def get_recommendations(
        self, location: str, category: str, keywords: list[str]
    ) -> list[dict] | None:
        key = self._key("rec", location, category, *keywords)
        return await self._get_json(key)

    async def set_recommendations(
        self,
        location: str,
        category: str,
        keywords: list[str],
        data: list[dict],
        ttl: int = 3600,
    ) -> None:
        key = self._key("rec", location, category, *keywords)
        await self._set_json(key, data, ttl)

    # ── Plan cache ──────────────────────────────────────────────────

    async def get_plan(
        self, location: str, days: int, people: int, budget: int | None,
        kw: str | None = None, excluded: list[str] | None = None,
    ) -> dict | None:
        key = self._key(
            "plan-v2", location, str(days), str(people), str(budget or 0),
            kw or "", *(sorted(excluded or [])),
        )
        plan = await self._get_json(key)
        if plan and plan.get("budget_requested") != budget:
            return None
        return plan

    async def set_plan(
        self,
        location: str,
        days: int,
        people: int,
        budget: int | None,
        data: dict,
        ttl: int = 86400,
        kw: str | None = None,
        excluded: list[str] | None = None,
    ) -> None:
        key = self._key(
            "plan-v2", location, str(days), str(people), str(budget or 0),
            kw or "", *(sorted(excluded or [])),
        )
        await self._set_json(key, data, ttl)

    # ── Search cache ────────────────────────────────────────────────

    async def get_search(self, query: str, cities: list[str] | None) -> list[dict] | None:
        key = self._key("search", query, *(cities or []))
        return await self._get_json(key)

    async def set_search(
        self,
        query: str,
        cities: list[str] | None,
        data: list[dict],
        ttl: int = 1800,
    ) -> None:
        key = self._key("search", query, *(cities or []))
        await self._set_json(key, data, ttl)

    # ── Invalidation ────────────────────────────────────────────────

    async def invalidate_all(self) -> int:
        """Invalidate all cached data. Called when destinations change."""
        patterns = [f"{self._prefix}rec:*", f"{self._prefix}search:*"]
        total = 0
        for pattern in patterns:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                total += len(keys)
                await self.redis.delete(*keys)
        logger.info("Cache invalidated: %d keys", total)
        return total

    async def invalidate_region(self, region: str) -> int:
        """Invalidate cache for a specific region."""
        pattern = f"{self._prefix}*:{region}:*"
        keys = []
        async for key in self.redis.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await self.redis.delete(*keys)
        return len(keys)

    # ── Internal helpers ────────────────────────────────────────────

    def _key(self, *parts: str) -> str:
        raw = ":".join(str(p).lower().strip() for p in parts)
        h = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return f"{self._prefix}{parts[0]}:{h}"

    async def _get_json(self, key: str) -> Any | None:
        try:
            raw = await self.redis.get(key)
            if raw:
                logger.debug("Cache HIT: %s", key)
                return json.loads(raw)
            logger.debug("Cache MISS: %s", key)
            return None
        except Exception:
            logger.warning("Cache read error for key: %s", key, exc_info=True)
            return None

    async def _set_json(self, key: str, data: Any, ttl: int) -> None:
        try:
            await self.redis.set(key, json.dumps(data, default=str), ex=ttl)
            logger.debug("Cache SET: %s (ttl=%d)", key, ttl)
        except Exception:
            logger.warning("Cache write error for key: %s", key, exc_info=True)
