from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.redis import init_redis, close_redis
from src.api.v1 import (
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
