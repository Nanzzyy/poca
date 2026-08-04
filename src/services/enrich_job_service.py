"""Background job coordinator for large free-image enrichment batches."""
from __future__ import annotations

import asyncio
import json
import logging
import math
import uuid
from typing import Any

from src.core.database import async_session_factory
from src.core.redis import get_redis
from src.repositories.destination_repo import DestinationRepository
from src.services.free_places_service import FreePlacesService

logger = logging.getLogger(__name__)

JOB_TTL = 24 * 60 * 60
JOB_BATCH_SIZE = 100
_active_job_id: str | None = None
_tasks: dict[str, asyncio.Task] = {}
_memory_jobs: dict[str, dict[str, Any]] = {}


def _key(job_id: str) -> str:
    return f"poca:enrich-job:{job_id}"


async def _set_job(job_id: str, data: dict[str, Any]) -> None:
    _memory_jobs[job_id] = data
    redis = get_redis()
    if redis:
        try:
            await redis.set(_key(job_id), json.dumps(data, default=str), ex=JOB_TTL)
        except Exception:
            logger.debug("Could not persist enrich job %s", job_id, exc_info=True)


async def get_enrich_job(job_id: str) -> dict[str, Any] | None:
    redis = get_redis()
    if redis:
        try:
            raw = await redis.get(_key(job_id))
            if raw:
                return json.loads(raw)
        except Exception:
            logger.debug("Could not read enrich job %s", job_id, exc_info=True)
    return _memory_jobs.get(job_id)


async def _run_enrich_job(job_id: str) -> None:
    global _active_job_id
    try:
        async with async_session_factory() as db:
            repo = DestinationRepository(db)
            _, total = await repo.search(page=1, size=1)

        pages = math.ceil(total / JOB_BATCH_SIZE) if total else 0
        state: dict[str, Any] = {
            "job_id": job_id,
            "status": "running",
            "total": total,
            "pages": pages,
            "page": 0,
            "processed": 0,
            "updated": 0,
            "failed": 0,
        }
        await _set_job(job_id, state)

        for page in range(1, pages + 1):
            async with async_session_factory() as db:
                async with FreePlacesService(db) as svc:
                    items = await svc.enrich_all_without_images(JOB_BATCH_SIZE, page=page)

            state["page"] = page
            state["processed"] += len(items)
            state["updated"] += sum(1 for item in items if item.get("image_added"))
            state["failed"] += sum(1 for item in items if item.get("status") == "error")
            await _set_job(job_id, state)

        state["status"] = "completed"
        await _set_job(job_id, state)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Enrich job %s failed", job_id)
        await _set_job(job_id, {
            "job_id": job_id,
            "status": "failed",
            "error": str(exc),
        })
    finally:
        _tasks.pop(job_id, None)
        _active_job_id = None


async def start_enrich_job() -> dict[str, Any]:
    global _active_job_id
    if _active_job_id:
        active = await get_enrich_job(_active_job_id)
        if active and active.get("status") in {"queued", "running"}:
            return active

    job_id = str(uuid.uuid4())
    _active_job_id = job_id
    await _set_job(job_id, {"job_id": job_id, "status": "queued"})
    _tasks[job_id] = asyncio.create_task(_run_enrich_job(job_id), name=f"enrich-{job_id}")
    return await get_enrich_job(job_id) or {"job_id": job_id, "status": "queued"}
