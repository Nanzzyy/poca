import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.core.database import engine, Base
from src.core.redis import init_redis, close_redis
from src.api.v1 import (
    admin,
    destinations,
    map,
    users,
    recommendations,
    reviews,
    trips,
    ai_conversation,
    gamification,
    places,
    posts,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (idempotent)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed full data on first deploy (categories + destinations + templates + demo admin)
    from sqlalchemy import text
    from src.core.database import async_session_factory
    async with async_session_factory() as db:
        r = await db.execute(text("SELECT count(*) FROM categories"))
        if r.scalar() == 0:
            from seed.seed_destinations import seed as seed_dest
            from seed.seed_templates import seed as seed_tmpl
            await seed_dest()
            await seed_tmpl()

    await init_redis()
    yield
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Mount static files for asset uploads
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(_static_dir, "uploads", "assets"), exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


# Register routers
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(destinations.router, prefix=settings.api_prefix)
app.include_router(map.router, prefix=settings.api_prefix)
app.include_router(recommendations.router, prefix=settings.api_prefix)
app.include_router(reviews.router, prefix=settings.api_prefix)
app.include_router(trips.router, prefix=settings.api_prefix)
app.include_router(ai_conversation.router, prefix=settings.api_prefix)
app.include_router(gamification.router, prefix=settings.api_prefix)
app.include_router(places.router, prefix=settings.api_prefix)
app.include_router(posts.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
