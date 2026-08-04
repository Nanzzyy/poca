import os
import uuid as _uuid
import re

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, delete, update
from datetime import datetime, timedelta

from src.api.deps import get_db, require_admin
from src.core.config import settings
from src.domain.models.user import User
from src.domain.models.destination import Category, Destination, DestinationSection
from src.domain.models.template import PageTemplate
from src.domain.models.asset import Asset
from src.domain.models.post import Post
from src.domain.models.page_view import PageView
from src.domain.section_types import SECTION_TYPES
from src.domain.schemas.admin import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    SectionCreate, SectionUpdate, SectionReorder, SectionResponse,
    AssetUpdate, AssetResponse, AssetBulkTag,
    DestinationFromTemplate,
)
from src.repositories.destination_repo import DestinationRepository
from src.repositories.knowledge_repo import KnowledgeRepository
from src.domain.models.knowledge import AIKnowledgeDocument
from src.domain.schemas.knowledge import KnowledgeCreate, KnowledgeUpdate, knowledge_item
from src.services.knowledge_service import KnowledgeService
from src.services.ai_conversation_service import AIConversationService
from src.services.free_places_service import FreePlacesService
from src.repositories.conversation_repo import ConversationRepository
from src.domain.models.conversation import Conversation
import json
import io
import zipfile


def _extract_uploaded_text(filename: str, content: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(('.txt', '.md', '.csv', '.json')):
        return content.decode('utf-8-sig')
    if name.endswith('.docx'):
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            xml = archive.read('word/document.xml').decode('utf-8')
        return re.sub(r'<[^>]+>', ' ', xml)
    raise HTTPException(400, detail="Only TXT, Markdown, CSV, JSON, and DOCX files are supported")


def _knowledge_payload(doc: AIKnowledgeDocument) -> dict:
    data = knowledge_item(doc)
    data.pop("content", None)
    return data


def _knowledge_patch(doc: AIKnowledgeDocument, body: KnowledgeUpdate) -> dict:
    values = body.model_dump(exclude_unset=True)
    if "source_url" in values and values["source_url"] is not None:
        values["source_url"] = str(values["source_url"])
    if "metadata" in values:
        values["metadata_json"] = values.pop("metadata")
    return values


router = APIRouter(prefix="/admin", tags=["admin"])

admin = Depends(require_admin)


# ── AI Knowledge ──

@router.get("/knowledge")
async def admin_list_knowledge(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"), q: str = Query(""),
    topic: str | None = None, db: AsyncSession = Depends(get_db), _u: User = admin,
):
    rows, total = await KnowledgeRepository(db).list(
        page=page, size=size, status=status_filter, q=q.strip() or None, topic=topic,
    )
    return {"items": [_knowledge_payload(d) for d in rows], "total": total, "page": page, "size": size}


@router.post("/knowledge", status_code=status.HTTP_201_CREATED)
async def admin_create_knowledge(body: KnowledgeCreate, db: AsyncSession = Depends(get_db), _u: User = admin):
    values = body.model_dump()
    values["source_url"] = str(values["source_url"]) if values.get("source_url") else None
    values["metadata_json"] = values.pop("metadata")
    doc = await KnowledgeService(db).create_draft(actor_id=_u.id, **values)
    return knowledge_item(doc)


@router.get("/knowledge/{knowledge_id}")
async def admin_get_knowledge(knowledge_id: str, db: AsyncSession = Depends(get_db), _u: User = admin):
    doc = await KnowledgeRepository(db).get(knowledge_id)
    if not doc:
        raise HTTPException(404, detail="Knowledge not found")
    data = knowledge_item(doc)
    data["revisions"] = [
        {"id": str(r.id), "version": r.version, "title": r.title, "content": r.content,
         "created_at": r.created_at.isoformat()}
        for r in await KnowledgeRepository(db).revisions(knowledge_id)
    ]
    return data


@router.put("/knowledge/{knowledge_id}")
async def admin_update_knowledge(knowledge_id: str, body: KnowledgeUpdate, db: AsyncSession = Depends(get_db), _u: User = admin):
    doc = await KnowledgeRepository(db).get(knowledge_id)
    if not doc:
        raise HTTPException(404, detail="Knowledge not found")
    try:
        await KnowledgeService(db).update_draft(doc, actor_id=_u.id, **_knowledge_patch(doc, body))
    except ValueError as exc:
        raise HTTPException(409, detail=str(exc))
    return knowledge_item(doc)


@router.post("/knowledge/{knowledge_id}/publish")
async def admin_publish_knowledge(knowledge_id: str, db: AsyncSession = Depends(get_db), _u: User = admin):
    doc = await KnowledgeRepository(db).get(knowledge_id)
    if not doc:
        raise HTTPException(404, detail="Knowledge not found")
    try:
        await KnowledgeService(db).publish(doc, _u.id)
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc))
    return knowledge_item(doc)


@router.post("/knowledge/{knowledge_id}/archive")
async def admin_archive_knowledge(knowledge_id: str, db: AsyncSession = Depends(get_db), _u: User = admin):
    doc = await KnowledgeRepository(db).get(knowledge_id)
    if not doc:
        raise HTTPException(404, detail="Knowledge not found")
    doc.status = "archived"
    await db.flush()
    return knowledge_item(doc)


@router.delete("/knowledge/{knowledge_id}")
async def admin_delete_knowledge(knowledge_id: str, db: AsyncSession = Depends(get_db), _u: User = admin):
    doc = await KnowledgeRepository(db).get(knowledge_id)
    if not doc:
        raise HTTPException(404, detail="Knowledge not found")
    if doc.status != "draft":
        raise HTTPException(409, detail="Only drafts can be deleted")
    await db.delete(doc)
    await db.flush()
    return {"ok": True}


@router.post("/knowledge/upload", status_code=status.HTTP_201_CREATED)
async def admin_upload_knowledge(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _u: User = admin):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, detail="File too large (max 10MB)")
    text = _extract_uploaded_text(file.filename or "", content)
    title = os.path.splitext(file.filename or "Knowledge")[0][:255]
    doc = await KnowledgeService(db).create_draft(
        title=title, content=text, source_name=file.filename, actor_id=_u.id,
    )
    return knowledge_item(doc)


@router.post("/knowledge/preview")
async def admin_preview_knowledge(body: dict, db: AsyncSession = Depends(get_db), _u: User = admin):
    query = str(body.get("query", "")).strip()
    if not query or len(query) > 1000:
        raise HTTPException(400, detail="query is required and must be <= 1000 characters")
    return {"query": query, "evidence": await KnowledgeService(db).retrieve(query, limit=4)}


# ── Dashboard ──

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "static", "uploads", "assets")
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "video/mp4"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


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
    include_inactive: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    items, total = await DestinationRepository(db).search(
        q=q.strip() or None, category_id=category_id or None, page=page, size=size,
        include_inactive=include_inactive,
    )
    return {
        "items": [
            {"id": str(d.id), "name": d.name, "slug": d.slug, "category": d.category.name if d.category else None,
             "city": d.city, "price_level": d.price_level, "rating_avg": d.rating_avg,
             "is_active": d.is_active, "latitude": d.latitude, "longitude": d.longitude,
             "country": d.country, "address": d.address, "tags": d.tags or [],
             "description": d.description, "images": d.images or []}
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
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, detail="Name required")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    existing = (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none()
    if existing:
        slug = f"{slug}-{_uuid.uuid4().hex[:6]}"
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

    # Apply template if provided
    template_id = body.get("template_id")
    if template_id:
        template = await db.get(PageTemplate, template_id)
        if template:
            for s in template.sections:
                section = DestinationSection(
                    destination_id=dest.id,
                    section_type=s.get("type", ""),
                    title=s.get("title"),
                    order=s.get("order", 0),
                    data=s.get("defaults", {}),
                )
                db.add(section)
            await db.flush()

    return {"id": str(dest.id), "name": dest.name, "slug": dest.slug}


@router.post("/destinations/from-template", status_code=status.HTTP_201_CREATED)
async def admin_create_from_template(
    body: DestinationFromTemplate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    template = await db.get(PageTemplate, body.template_id)
    if not template:
        raise HTTPException(404, detail="Template not found")

    name = body.name.strip()
    if not name:
        raise HTTPException(400, detail="Name required")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    existing = (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none()
    if existing:
        slug = f"{slug}-{_uuid.uuid4().hex[:6]}"

    dest = Destination(
        name=name, slug=slug,
        category_id=body.category_id,
        latitude=body.latitude, longitude=body.longitude,
        country=body.country, city=body.city,
        address=body.address, description=body.description,
        images=body.images, tags=body.tags,
        price_level=body.price_level,
    )
    db.add(dest)
    await db.flush()

    for idx, s in enumerate(template.sections):
        section_key = s.get("type", "") + f"_{idx}"
        override = body.section_overrides.get(section_key, {})
        section = DestinationSection(
            destination_id=dest.id,
            section_type=s.get("type", ""),
            title=s.get("title"),
            order=s.get("order", idx),
            data={**s.get("defaults", {}), **override},
        )
        db.add(section)
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
                  "address", "description", "price_level", "rating_avg", "tags", "is_active",
                  "opening_hours", "best_visiting_hours", "local_tips", "seasonal_info"):
        if field in body:
            setattr(dest, field, body[field])
    if "images" in body:
        # Cap at 3 per destination — enforced in app layer (service + admin + FE).
        dest.images = (body["images"] or [])[:3]
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
    if len(items) > 500:
        raise HTTPException(400, detail="Maximum 500 items per import")

    template_id = body.get("template_id")
    template = None
    if template_id:
        template = await db.get(PageTemplate, template_id)

    count = 0
    errors: list[dict] = []
    for i, item in enumerate(items):
        name = (item.get("name") or "").strip() if isinstance(item, dict) else ""
        if not name:
            errors.append({"index": i, "name": "", "error": "missing or empty 'name'"})
            continue
        try:
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            existing = (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none()
            if existing:
                slug = f"{slug}-{_uuid.uuid4().hex[:6]}"
            dest_id = _uuid.uuid4()
            dest = Destination(
                id=dest_id, name=name, slug=slug,
                category_id=item.get("category_id"),
                latitude=item.get("latitude", 0), longitude=item.get("longitude", 0),
                country=item.get("country", "Indonesia"), city=item.get("city"),
                address=item.get("address"), description=item.get("description"),
                images=item.get("images", []), tags=item.get("tags", []),
                price_level=item.get("price_level", "mid"), rating_avg=item.get("rating_avg", 0),
            )
            db.add(dest)

            if template:
                for s in template.sections:
                    db.add(DestinationSection(
                        destination_id=dest_id,
                        section_type=s.get("type", ""),
                        title=s.get("title"),
                        order=s.get("order", 0),
                        data=s.get("defaults", {}),
                    ))

            count += 1
        except Exception as e:  # per-item construction error — record, don't abort batch
            errors.append({"index": i, "name": name, "error": str(e)})

    await db.flush()
    return {"imported": count, "skipped": len(errors), "errors": errors[:50]}


# ── Free POI source (Wikidata/Nominatim/Wikipedia — no API key) ──

@router.get("/places/search")
async def admin_search_places(q: str = Query(..., min_length=2), lat: float | None = None, lng: float | None = None, limit: int = Query(8, ge=1, le=20), _u: User = admin):
    """Search free POI candidates (coords + image) for admin import."""
    if not q.strip():
        raise HTTPException(400, detail="q is required")
    async with FreePlacesService(None) as svc:
        return {"items": await svc.search_places(q.strip(), lat, lng, limit)}


@router.post("/destinations/from-place", status_code=status.HTTP_201_CREATED)
async def admin_create_from_place(body: dict, db: AsyncSession = Depends(get_db), _u: User = admin):
    name = (body.get("name") or "").strip()
    if not name or body.get("lat") is None or body.get("lng") is None:
        raise HTTPException(400, detail="name, lat, lng required")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if (await db.execute(select(Destination).where(Destination.slug == slug))).scalar_one_or_none():
        slug = f"{slug}-{_uuid.uuid4().hex[:6]}"
    images = [body["image_url"]] if body.get("image_url") else []
    dest = Destination(
        name=name, slug=slug,
        latitude=float(body["lat"]), longitude=float(body["lng"]),
        country=body.get("country", "Indonesia"), city=body.get("city"),
        address=body.get("address"), description=body.get("description"),
        images=images, tags=body.get("tags", []) or ["wisata"],
        price_level=body.get("price_level", "mid"),
    )
    db.add(dest)
    await db.flush()
    return {"id": str(dest.id), "name": dest.name, "slug": dest.slug}


@router.post("/destinations/{dest_id}/enrich-free")
async def admin_enrich_free(dest_id: str, db: AsyncSession = Depends(get_db), _u: User = admin):
    """Resolve coords + image from free sources for one destination."""
    async with FreePlacesService(db) as svc:
        try:
            return await svc.enrich_destination(dest_id)
        except ValueError as exc:
            raise HTTPException(404, detail=str(exc))


@router.post("/destinations/enrich-free-all")
async def admin_enrich_free_all(size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _u: User = admin):
    async with FreePlacesService(db) as svc:
        return {"items": await svc.enrich_all_without_images(size)}


@router.post("/seed")
async def admin_seed_all(db: AsyncSession = Depends(get_db), _u: User = admin):
    """Seed destinations + categories + demo user + achievements + templates.
    Idempotent — skips if data already exists."""
    from seed.seed_destinations import seed as seed_dest
    from seed.seed_templates import seed as seed_tmpl
    result = {"destinations": "skipped", "templates": "skipped"}
    from sqlalchemy import text
    r = await db.execute(text("SELECT count(*) FROM destinations"))
    if r.scalar() == 0:
        await seed_dest()
        result["destinations"] = "seeded"
    r = await db.execute(text("SELECT count(*) FROM page_templates"))
    if r.scalar() == 0:
        await seed_tmpl()
        result["templates"] = "seeded"
    return result


@router.post("/destinations/fix-coords")
async def admin_fix_coords(db: AsyncSession = Depends(get_db), _u: User = admin):
    """Re-geocode every destination whose coords are missing or a known generic
    placeholder (e.g. the Bali-center point the seed used). Returns per-destination
    results so callers can see which ones OSM resolved."""
    from src.services.free_places_service import coords_suspicious
    repo = DestinationRepository(db)
    rows = (await db.execute(select(Destination).order_by(Destination.name))).scalars().all()
    targets = [d for d in rows if coords_suspicious(d.latitude, d.longitude)]
    results = []
    async with FreePlacesService(db) as svc:
        for d in targets:
            before = (d.latitude, d.longitude)
            res = await svc.enrich_destination(str(d.id))
            results.append({
                "id": str(d.id), "name": d.name, "city": d.city,
                "before": list(before), "after": [d.latitude, d.longitude],
                "coords_resolved": res.get("coords_resolved"),
            })
    await db.commit()
    return {"total": len(targets), "items": results}


# ── Templates CRUD ──

@router.get("/templates")
async def admin_list_templates(
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> list[dict]:
    rows = (await db.execute(select(PageTemplate).order_by(PageTemplate.id))).scalars().all()
    return [
        {
            "id": t.id, "name": t.name, "description": t.description,
            "sections": t.sections, "is_default": t.is_default,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in rows
    ]


@router.get("/templates/section-types")
async def admin_section_types(
    _u: User = admin,
) -> dict:
    return SECTION_TYPES


@router.get("/templates/{template_id}")
async def admin_get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    t = await db.get(PageTemplate, template_id)
    if not t:
        raise HTTPException(404)
    return {
        "id": t.id, "name": t.name, "description": t.description,
        "sections": t.sections, "is_default": t.is_default,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def admin_create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    existing = await db.get(PageTemplate, body.id)
    if existing:
        raise HTTPException(409, detail="Template ID already exists")

    # Validate section types
    for s in body.sections:
        if s.type not in SECTION_TYPES:
            raise HTTPException(400, detail=f"Unknown section type: {s.type}")

    template = PageTemplate(
        id=body.id,
        name=body.name,
        description=body.description,
        sections=[s.model_dump() for s in body.sections],
        is_default=body.is_default,
    )
    db.add(template)

    # If marking as default, unset others
    if body.is_default:
        await db.execute(
            update(PageTemplate).where(PageTemplate.is_default == True).values(is_default=False)
        )

    await db.flush()
    return {"id": template.id, "name": template.name}


@router.put("/templates/{template_id}")
async def admin_update_template(
    template_id: str,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    t = await db.get(PageTemplate, template_id)
    if not t:
        raise HTTPException(404)

    if body.name is not None:
        t.name = body.name
    if body.description is not None:
        t.description = body.description
    if body.sections is not None:
        for s in body.sections:
            if s.type not in SECTION_TYPES:
                raise HTTPException(400, detail=f"Unknown section type: {s.type}")
        t.sections = [s.model_dump() for s in body.sections]
    if body.is_default is not None:
        if body.is_default:
            await db.execute(
                update(PageTemplate).where(PageTemplate.is_default == True).values(is_default=False)
            )
        t.is_default = body.is_default

    await db.flush()
    return {"ok": True}


@router.delete("/templates/{template_id}")
async def admin_delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    t = await db.get(PageTemplate, template_id)
    if not t:
        raise HTTPException(404)
    await db.delete(t)
    await db.flush()
    return {"ok": True}


@router.post("/templates/import", status_code=status.HTTP_201_CREATED)
async def admin_import_template(
    body: dict,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    """Import a template from JSON (same format as export)."""
    template_id = body.get("id", "").strip()
    name = body.get("name", "").strip()
    if not template_id or not name:
        raise HTTPException(400, detail="id and name required")

    sections = body.get("sections", [])
    for s in sections:
        stype = s.get("type", "")
        if stype not in SECTION_TYPES:
            raise HTTPException(400, detail=f"Unknown section type: {stype}")

    existing = await db.get(PageTemplate, template_id)
    if existing:
        # Overwrite existing
        existing.name = name
        existing.description = body.get("description")
        existing.sections = sections
        existing.is_default = body.get("is_default", False)
        await db.flush()
        return {"id": existing.id, "name": existing.name, "updated": True}

    template = PageTemplate(
        id=template_id, name=name,
        description=body.get("description"),
        sections=sections,
        is_default=body.get("is_default", False),
    )
    db.add(template)
    await db.flush()
    return {"id": template.id, "name": template.name, "created": True}


@router.get("/templates/{template_id}/export")
async def admin_export_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    t = await db.get(PageTemplate, template_id)
    if not t:
        raise HTTPException(404)
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "sections": t.sections,
        "is_default": t.is_default,
    }


# ── Sections CRUD (per destination) ──

@router.get("/destinations/{dest_id}/sections")
async def admin_list_sections(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> list[dict]:
    dest = await db.get(Destination, dest_id)
    if not dest:
        raise HTTPException(404)

    stmt = (
        select(DestinationSection)
        .where(DestinationSection.destination_id == dest_id)
        .order_by(DestinationSection.order)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(s.id), "destination_id": str(s.destination_id),
            "section_type": s.section_type, "title": s.title,
            "order": s.order, "visible": s.visible, "data": s.data or {},
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in rows
    ]


@router.post("/destinations/{dest_id}/sections", status_code=status.HTTP_201_CREATED)
async def admin_create_section(
    dest_id: str,
    body: SectionCreate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    dest = await db.get(Destination, dest_id)
    if not dest:
        raise HTTPException(404)
    if body.section_type not in SECTION_TYPES:
        raise HTTPException(400, detail=f"Unknown section type: {body.section_type}")

    section = DestinationSection(
        destination_id=dest_id,
        section_type=body.section_type,
        title=body.title,
        order=body.order,
        visible=body.visible,
        data=body.data,
    )
    db.add(section)
    await db.flush()
    return {"id": str(section.id), "section_type": section.section_type}


@router.put("/destinations/{dest_id}/sections/{section_id}")
async def admin_update_section(
    dest_id: str,
    section_id: str,
    body: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    section = (await db.execute(
        select(DestinationSection).where(
            DestinationSection.id == section_id,
            DestinationSection.destination_id == dest_id,
        )
    )).scalar_one_or_none()
    if not section:
        raise HTTPException(404)

    if body.title is not None:
        section.title = body.title
    if body.order is not None:
        section.order = body.order
    if body.visible is not None:
        section.visible = body.visible
    if body.data is not None:
        section.data = body.data
    await db.flush()
    return {"ok": True}


@router.delete("/destinations/{dest_id}/sections/{section_id}")
async def admin_delete_section(
    dest_id: str,
    section_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    section = (await db.execute(
        select(DestinationSection).where(
            DestinationSection.id == section_id,
            DestinationSection.destination_id == dest_id,
        )
    )).scalar_one_or_none()
    if not section:
        raise HTTPException(404)
    await db.delete(section)
    await db.flush()
    return {"ok": True}


@router.put("/destinations/{dest_id}/sections/reorder")
async def admin_reorder_sections(
    dest_id: str,
    body: SectionReorder,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    dest = await db.get(Destination, dest_id)
    if not dest:
        raise HTTPException(404)

    for item in body.items:
        section = (await db.execute(
            select(DestinationSection).where(
                DestinationSection.id == item.id,
                DestinationSection.destination_id == dest_id,
            )
        )).scalar_one_or_none()
        if section:
            section.order = item.order

    await db.flush()
    return {"ok": True}


@router.post("/destinations/{dest_id}/apply-template/{template_id}")
async def admin_apply_template(
    dest_id: str,
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    dest = (await db.execute(
        select(Destination).where(Destination.id == dest_id)
    )).scalar_one_or_none()
    if not dest:
        raise HTTPException(404, detail="Destination not found")

    template = await db.get(PageTemplate, template_id)
    if not template:
        raise HTTPException(404, detail="Template not found")

    # Get existing sections to preserve data
    existing = (await db.execute(
        select(DestinationSection).where(DestinationSection.destination_id == dest_id)
    )).scalars().all()
    existing_by_type = {s.section_type: s for s in existing}

    # Remove sections not in template
    template_types = {s.get("type") for s in template.sections}
    for s in existing:
        if s.section_type not in template_types:
            await db.delete(s)

    # Create or update sections from template
    for idx, ts in enumerate(template.sections):
        stype = ts.get("type", "")
        if stype in existing_by_type:
            # Update order, keep existing data
            existing_section = existing_by_type[stype]
            existing_section.order = ts.get("order", idx)
            if ts.get("title"):
                existing_section.title = ts["title"]
        else:
            section = DestinationSection(
                destination_id=dest_id,
                section_type=stype,
                title=ts.get("title"),
                order=ts.get("order", idx),
                data=ts.get("defaults", {}),
            )
            db.add(section)

    await db.flush()
    return {"ok": True, "sections_created": len(template.sections)}


# ── Assets ──

@router.post("/assets/upload", status_code=status.HTTP_201_CREATED)
async def admin_upload_asset(
    file: UploadFile = File(...),
    destination_id: str = Query(None),
    section_id: str = Query(None),
    alt_text: str = Query(""),
    tags: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, detail=f"File type not allowed: {file.content_type}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, detail="File too large (max 10MB)")

    ext = os.path.splitext(file.filename or "file")[1] or ".bin"
    asset_uuid = _uuid.uuid4()
    filename = f"{asset_uuid.hex}{ext}"

    # Determine subdirectory
    subdir = destination_id or "general"
    dest_dir = os.path.join(UPLOAD_DIR, subdir)
    os.makedirs(dest_dir, exist_ok=True)

    file_path = os.path.join(dest_dir, filename)
    with open(file_path, "wb") as f:
        f.write(content)

    relative_path = f"uploads/assets/{subdir}/{filename}"
    base_url = getattr(settings, "asset_base_url", None) or f"/static"
    url = f"{base_url}/{relative_path}"

    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    asset = Asset(
        id=asset_uuid,
        filename=filename,
        original_name=file.filename or "upload",
        mime_type=file.content_type,
        size_bytes=len(content),
        path=relative_path,
        url=url,
        destination_id=destination_id,
        section_id=section_id,
        alt_text=alt_text or None,
        tags=parsed_tags,
        uploaded_by=_u.id,
    )
    db.add(asset)
    await db.flush()

    return {
        "id": str(asset.id),
        "filename": asset.filename,
        "url": asset.url,
        "mime_type": asset.mime_type,
        "size_bytes": asset.size_bytes,
    }


@router.get("/assets")
async def admin_list_assets(
    destination_id: str = Query(None),
    section_id: str = Query(None),
    tag: str = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    stmt = select(Asset)
    if destination_id:
        stmt = stmt.where(Asset.destination_id == destination_id)
    if section_id:
        stmt = stmt.where(Asset.section_id == section_id)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    stmt = stmt.order_by(Asset.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for a in rows:
        if tag and tag not in (a.tags or []):
            continue
        items.append({
            "id": str(a.id), "filename": a.filename, "original_name": a.original_name,
            "url": a.url, "mime_type": a.mime_type, "size_bytes": a.size_bytes,
            "destination_id": str(a.destination_id) if a.destination_id else None,
            "section_id": str(a.section_id) if a.section_id else None,
            "alt_text": a.alt_text, "tags": a.tags or [],
            "uploaded_by": str(a.uploaded_by) if a.uploaded_by else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"items": items, "total": total, "page": page, "size": size}


@router.put("/assets/{asset_id}")
async def admin_update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )).scalar_one_or_none()
    if not asset:
        raise HTTPException(404)

    if body.alt_text is not None:
        asset.alt_text = body.alt_text
    if body.tags is not None:
        asset.tags = body.tags
    if body.destination_id is not None:
        asset.destination_id = body.destination_id
    if body.section_id is not None:
        asset.section_id = body.section_id
    await db.flush()
    return {"ok": True}


@router.delete("/assets/{asset_id}")
async def admin_delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    asset = (await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )).scalar_one_or_none()
    if not asset:
        raise HTTPException(404)

    # Delete file from disk
    full_path = os.path.join(os.path.dirname(UPLOAD_DIR), "..", asset.path)
    try:
        if os.path.isfile(full_path):
            os.remove(full_path)
    except OSError:
        pass

    await db.delete(asset)
    await db.flush()
    return {"ok": True}


@router.post("/assets/bulk-tag")
async def admin_bulk_tag_assets(
    body: AssetBulkTag,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    updated = 0
    for asset_id in body.asset_ids:
        asset = (await db.execute(
            select(Asset).where(Asset.id == asset_id)
        )).scalar_one_or_none()
        if not asset:
            continue
        if body.mode == "replace":
            asset.tags = body.tags
        else:
            existing = set(asset.tags or [])
            existing.update(body.tags)
            asset.tags = list(existing)
        updated += 1

    await db.flush()
    return {"updated": updated}


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
                    "is_verified": u.is_verified, "is_active": u.is_active,
                    "created_at": u.created_at.isoformat()} for u in rows],
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
    if "is_verified" in body and isinstance(body["is_verified"], bool):
        user.is_verified = body["is_verified"]
    await db.flush()
    return {"ok": True}


@router.patch("/users/{user_id}/verify")
async def admin_toggle_verified(
    user_id: str,
    verified: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_verified = verified
    await db.flush()
    return {"id": str(user.id), "is_verified": user.is_verified}


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
    slug = body.get("slug", name.lower().replace(" ", "-"))
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
