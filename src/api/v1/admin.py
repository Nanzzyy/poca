from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete, update
from datetime import datetime, timedelta

from src.api.deps import get_db, require_admin
from src.domain.models.user import User
from src.domain.models.destination import Category, Destination
from src.domain.models.post import Post
from src.domain.models.page_view import PageView
from src.repositories.destination_repo import DestinationRepository

router = APIRouter(prefix="/admin", tags=["admin"])

admin = Depends(require_admin)

# ── Dashboard ──

@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async def count(tbl, *where):
        q = select(func.count()).select_from(tbl)
        for w in where:
            q = q.where(w)
        return (await db.execute(q)).scalar() or 0

    total_users = await count(User, User.is_active == True)
    total_dests = await count(Destination, Destination.is_active == True)
    total_posts = await count(Post)
    total_views_today = await count(PageView, PageView.created_at >= today_start)

    weekly_views = await db.execute(
        select(
            func.date(PageView.created_at),
            func.count()
        ).where(
            PageView.created_at >= week_ago
        ).group_by(
            func.date(PageView.created_at)
        ).order_by(func.date(PageView.created_at))
    )
    views_chart = [{"date": str(d), "count": c} for d, c in weekly_views.all()]

    new_users = await count(User, User.created_at >= week_ago)

    top_paths = await db.execute(
        select(PageView.path, func.count().label("c"))
        .where(PageView.created_at >= week_ago)
        .group_by(PageView.path)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_pages = [{"path": p, "count": c} for p, c in top_paths.all()]

    return {
        "total_users": total_users,
        "total_destinations": total_dests,
        "total_posts": total_posts,
        "total_views_today": total_views_today,
        "weekly_views": views_chart,
        "new_users_week": new_users,
        "top_pages": top_pages,
    }


# ── Destinations CRUD ──

@router.get("/destinations")
async def admin_list_destinations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str = Query(""),
    category_id: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    items, total = await DestinationRepository(db).search(
        q=q.strip() or None, category_id=category_id or None, page=page, size=size,
    )
    return {
        "items": [
            {"id": str(d.id), "name": d.name, "slug": d.slug, "category": d.category.name if d.category else None,
             "city": d.city, "price_level": d.price_level, "rating_avg": d.rating_avg,
             "is_active": d.is_active, "latitude": d.latitude, "longitude": d.longitude,
             "country": d.country, "address": d.address, "tags": d.tags or [],
             "description": d.description}
            for d in items
        ],
        "total": total, "page": page, "size": size,
    }

@router.post("/destinations", status_code=status.HTTP_201_CREATED)
async def admin_create_destination(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    import uuid, re
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, detail="Name required")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    # check unique slug
    existing = (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    dest = Destination(
        name=name,
        slug=slug,
        category_id=body.get("category_id"),
        latitude=body.get("latitude", 0),
        longitude=body.get("longitude", 0),
        country=body.get("country", "Indonesia"),
        city=body.get("city"),
        address=body.get("address"),
        description=body.get("description"),
        images=body.get("images", []),
        tags=body.get("tags", []),
        price_level=body.get("price_level", "mid"),
        rating_avg=body.get("rating_avg", 0),
        is_active=body.get("is_active", True),
    )
    db.add(dest)
    await db.flush()
    return {"id": str(dest.id), "name": dest.name, "slug": dest.slug}

@router.put("/destinations/{dest_id}")
async def admin_update_destination(
    dest_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    repo = DestinationRepository(db)
    dest = await repo.get_by_id(dest_id)
    if not dest:
        raise HTTPException(404, detail="Not found")
    for field in ("name", "slug", "category_id", "latitude", "longitude", "country", "city",
                  "address", "description", "price_level", "rating_avg", "images", "tags", "is_active"):
        if field in body:
            setattr(dest, field, body[field])
    await db.flush()
    return {"ok": True}

@router.delete("/destinations/{dest_id}")
async def admin_delete_destination(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    repo = DestinationRepository(db)
    dest = await repo.get_by_id(dest_id)
    if not dest:
        raise HTTPException(404)
    dest.is_active = False
    await db.flush()
    return {"ok": True}

@router.post("/destinations/bulk")
async def admin_bulk_import(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    items = body.get("items", [])
    if not items:
        raise HTTPException(400, detail="No items provided")
    import uuid, re
    count = 0
    for item in items:
        name = item.get("name", "").strip()
        if not name:
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        existing = (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none()
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        dest = Destination(
            name=name, slug=slug,
            category_id=item.get("category_id"),
            latitude=item.get("latitude", 0), longitude=item.get("longitude", 0),
            country=item.get("country", "Indonesia"), city=item.get("city"),
            address=item.get("address"), description=item.get("description"),
            images=item.get("images", []), tags=item.get("tags", []),
            price_level=item.get("price_level", "mid"), rating_avg=item.get("rating_avg", 0),
        )
        db.add(dest)
        count += 1
    await db.flush()
    return {"imported": count}


# ── Users ──

@router.get("/users")
async def admin_list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    stmt = select(User)
    if q:
        stmt = stmt.where(User.email.ilike(f"%{q}%") | User.username.ilike(f"%{q}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [{"id": str(u.id), "email": u.email, "username": u.username, "role": u.role,
                    "is_active": u.is_active, "created_at": u.created_at.isoformat()} for u in rows],
        "total": total, "page": page, "size": size,
    }

@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404)
    if "role" in body and body["role"] in ("user", "admin"):
        user.role = body["role"]
    if "is_active" in body and isinstance(body["is_active"], bool):
        user.is_active = body["is_active"]
    await db.flush()
    return {"ok": True}


# ── Categories ──

@router.get("/categories")
async def admin_list_categories(
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> list[dict]:
    rows = (await db.execute(select(Category).order_by(Category.id))).scalars().all()
    return [{"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon, "parent_id": c.parent_id} for c in rows]

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def admin_create_category(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400)
    slug = body.get("slug", name.lower().replace(" ","-"))
    cat = Category(name=name, slug=slug, icon=body.get("icon"))
    db.add(cat)
    await db.flush()
    return {"id": cat.id, "name": cat.name, "slug": cat.slug}

@router.put("/categories/{cat_id}")
async def admin_update_category(
    cat_id: int, body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    cat = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(404)
    for f in ("name", "slug", "icon"):
        if f in body:
            setattr(cat, f, body[f])
    await db.flush()
    return {"ok": True}

@router.delete("/categories/{cat_id}")
async def admin_delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    cat = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(404)
    # check if used
    cnt = (await db.execute(select(func.count()).select_from(Destination).where(Destination.category_id == cat_id))).scalar()
    if cnt:
        raise HTTPException(400, detail=f"Cannot delete: {cnt} destinations use this category")
    await db.delete(cat)
    await db.flush()
    return {"ok": True}


# ── Traffic ──

@router.get("/traffic")
async def admin_traffic(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    stmt = select(PageView).order_by(PageView.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.offset((page - 1) * size).limit(size))).scalars().all()
    return {
        "items": [{"id": str(r.id), "path": r.path, "user_id": str(r.user_id) if r.user_id else None,
                    "ip": r.ip, "created_at": r.created_at.isoformat()} for r in rows],
        "total": total, "page": page, "size": size,
    }
