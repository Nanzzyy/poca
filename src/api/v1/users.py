from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, get_current_user, require_user
from src.core.config import settings
from src.domain.models.page_view import PageView
from src.domain.models.user import User
from src.domain.schemas.user import (
    PublicProfileResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPreferencesUpdate,
    UserResponse,
)
from src.domain.schemas.destination import DestinationList, PaginatedResponse
from src.repositories.destination_repo import DestinationRepository
from src.repositories.user_repo import UserRepository
from src.domain.models.follower import Follower
from src.domain.models.notification import Notification
from src.domain.models.post import Post
from src.domain.models.trip import Trip
from src.domain.models.review import Review
from src.domain.schemas.notification import NotificationResponse
from src.repositories.notification_repo import NotificationRepository
from src.services.notification_service import create_notification
from sqlalchemy import func, select, delete

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
router = APIRouter(tags=["users"])


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/auth/register")
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    repo = UserRepository(db)
    if await repo.get_by_email(body.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if await repo.get_by_username(body.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
    )
    user = await repo.create(user)
    token = create_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/auth/login")
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    repo = UserRepository(db)
    user = await repo.get_by_email(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/users/me")
async def get_me(
    user: User = Depends(require_user),
) -> UserResponse:
    return UserResponse.model_validate(user)


# ── TRAFFIC (public write path for /admin/traffic + dashboard) ──
@router.post("/analytics/track")
async def track_pageview(
    body: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Fire-and-forget page-view log. No auth — anonymous page hits allowed."""
    path = (body.get("path") or "").strip()[:500]
    if not path:
        raise HTTPException(400, detail="path required")
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]
    db.add(PageView(id=uuid.uuid4(), path=path, ip=ip, user_agent=ua, created_at=datetime.utcnow()))
    await db.flush()
    return {"ok": True}


@router.put("/users/me")
async def update_me(
    body: UserPreferencesUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user.preferences = body.preferences
    repo = UserRepository(db)
    await repo.update(user)
    return UserResponse.model_validate(user)


@router.put("/users/me/preferences")
async def update_preferences(
    body: UserPreferencesUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user.preferences = body.preferences
    repo = UserRepository(db)
    await repo.update(user)
    return UserResponse.model_validate(user)


# Favorites stored on user.preferences.favorite_ids (zero-migration, account-bound).
@router.post("/users/me/favorites/{dest_id}")
async def toggle_favorite(
    dest_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    prefs: dict = dict(user.preferences or {})
    favs: list[str] = list(prefs.get("favorite_ids") or [])
    if dest_id in favs:
        favs = [f for f in favs if f != dest_id]
        favorited = False
    else:
        favs.append(dest_id)
        favorited = True
    prefs["favorite_ids"] = favs
    user.preferences = prefs
    repo = UserRepository(db)
    await repo.update(user)
    return {"favorited": favorited, "favorite_ids": favs}


# Return full destination data for user's saved (favorited) destinations.
@router.get("/users/me/favorites")
async def get_my_favorites(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[DestinationList]:
    prefs: dict = dict(user.preferences or {})
    fav_ids: list[str] = list(prefs.get("favorite_ids") or [])
    if not fav_ids:
        return []
    repo = DestinationRepository(db)
    dests = await repo.get_by_ids(fav_ids)
    return [DestinationList.model_validate(d) for d in dests]


# ═══════════ PUBLIC PROFILES + FOLLOW ═══════════

@router.get("/users/{user_id}")
async def get_public_profile(
    user_id: str,
    viewer: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PublicProfileResponse:
    repo = UserRepository(db)
    target = await repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    counts = {}
    for tbl, col in [(Follower, Follower.followee_id), (Follower, Follower.follower_id)]:
        c = (await db.execute(select(func.count()).select_from(tbl).where(col == user_id))).scalar() or 0
        if col is Follower.followee_id:
            counts["followers_count"] = c
        else:
            counts["following_count"] = c
    counts["posts_count"] = (await db.execute(select(func.count()).select_from(Post).where(Post.user_id == user_id))).scalar() or 0
    counts["trips_count"] = (await db.execute(select(func.count()).select_from(Trip).where(Trip.user_id == user_id))).scalar() or 0
    counts["reviews_count"] = (await db.execute(select(func.count()).select_from(Review).where(Review.user_id == user_id))).scalar() or 0

    is_following = False
    if viewer:
        if str(viewer.id) == user_id:
            is_following = False  # self — meaningless
        else:
            edge = await db.execute(
                select(Follower).where(Follower.follower_id == viewer.id, Follower.followee_id == user_id)
            )
            is_following = edge.scalar_one_or_none() is not None

    return PublicProfileResponse(
        id=target.id,
        username=target.username,
        avatar_url=target.avatar_url,
        level=target.level,
        xp_total=target.xp_total,
        is_verified=target.is_verified,
        created_at=target.created_at,
        followers_count=counts["followers_count"],
        following_count=counts["following_count"],
        posts_count=counts["posts_count"],
        trips_count=counts["trips_count"],
        reviews_count=counts["reviews_count"],
        is_following=is_following,
        is_self=bool(viewer and str(viewer.id) == user_id),
    )


@router.post("/users/{user_id}/follow")
async def toggle_follow(
    user_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if str(user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    repo = UserRepository(db)
    target = await repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    edge = await db.execute(
        select(Follower).where(Follower.follower_id == user.id, Follower.followee_id == user_id)
    )
    existing = edge.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()
        following = False
    else:
        db.add(Follower(follower_id=user.id, followee_id=user_id))
        await db.flush()
        following = True
        await create_notification(
            db,
            user_id=user_id,
            type="follow",
            title=f"{user.username} mulai mengikutimu",
            actor_id=user.id,
            meta={"follower_id": str(user.id)},
        )
    return {"following": following}


@router.get("/users/{user_id}/posts")
async def get_user_posts(
    user_id: str,
    page: int = 1,
    size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    repo = UserRepository(db)
    if not await repo.get_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = list((await db.execute(stmt)).scalars().all())
    total = (await db.execute(select(func.count()).select_from(Post).where(Post.user_id == user_id))).scalar() or 0
    return PaginatedResponse(
        items=[{"id": str(p.id), "content": p.content, "media": p.media, "like_count": p.like_count, "created_at": p.created_at} for p in items],
        total=total, page=page, size=size, pages=(total + size - 1) // size,
    )


# ═══════════ NOTIFICATIONS ═══════════

@router.get("/notifications")
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationResponse]:
    repo = NotificationRepository(db)
    items = await repo.list_for_user(str(user.id), limit)
    result = []
    for n in items:
        resp = NotificationResponse.model_validate(n)
        if n.actor:
            resp.actor_username = n.actor.username
            resp.actor_avatar_url = n.actor.avatar_url
        result.append(resp)
    return result


@router.get("/notifications/unread-count")
async def get_unread_count(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = NotificationRepository(db)
    return {"count": await repo.unread_count(str(user.id))}


@router.post("/notifications/read-all")
async def mark_all_read(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = NotificationRepository(db)
    await repo.mark_all_read(str(user.id))
    return {"ok": True}


# ═══════════ GOOGLE OAUTH ═══════════
@router.post("/auth/google")
async def google_auth(
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Sign in/up with a Google ID token. Creates user on first login."""
    credential = body.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="Missing Google credential")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        if settings.google_client_id:
            info = id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.google_client_id
            )
        else:
            # Client ID not configured — verify signature only (no audience check).
            info = id_token.verify_oauth2_token(
                credential, google_requests.Request(), clock_skew_in_seconds=10
            )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    google_id = info.get("sub")
    email = info.get("email")
    name = info.get("name", "")
    picture = info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    repo = UserRepository(db)
    user = await repo.get_by_email(email)
    if not user:
        # Create new user from Google profile
        username = (name or email.split("@")[0]).replace(" ", "").lower()[:100]
        # Ensure unique username
        base = username
        n = 1
        while await repo.get_by_username(username):
            n += 1
            username = f"{base}{n}"
        user = User(
            email=email,
            username=username,
            hashed_password="",  # Google users have no password
            avatar_url=picture,
        )
        user = await repo.create(user)

    token = create_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
