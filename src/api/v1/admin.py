import os
import uuid as _uuid
import re

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime, timedelta, timezone

from src.api.deps import get_db, require_admin
from src.core.config import settings
from src.domain.models.user import User
from src.domain.models.destination import Category, Destination, DestinationSection
from src.domain.models.template import PageTemplate
from src.domain.models.post import Post
from src.domain.models.page_view import PageView
from src.domain.section_types import SECTION_TYPES
from src.domain.schemas.admin import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    SectionCreate, SectionUpdate, SectionReorder, SectionResponse,
    AssetUpdate, AssetResponse, AssetBulkTag,
    DestinationFromTemplate,
    AdminUpdateUserRequest, CreateCategoryRequest, UpdateCategoryRequest,
    DestinationCreateRequest, DestinationUpdateRequest,
    BulkDestinationRequest, DestinationFromPlaceRequest,
    TemplateImportRequest, KnowledgePreviewRequest,
)
from src.repositories.destination_repo import DestinationRepository
from src.repositories.knowledge_repo import KnowledgeRepository
from src.domain.models.knowledge import AIKnowledgeDocument
from src.domain.schemas.knowledge import KnowledgeCreate, KnowledgeUpdate, knowledge_item
from src.services.asset_service import AssetService
from src.services.category_service import CategoryService
from src.services.destination_service import DestinationService
from src.services.template_service import TemplateService
from src.services.user_service import UserService
from src.services.knowledge_service import KnowledgeService
from src.services.ai_conversation_service import AIConversationService
from src.services.free_places_service import FreePlacesService
from src.services.enrich_job_service import get_enrich_job, start_enrich_job
from src.services.audit_service import log_audit
from src.repositories.conversation_repo import ConversationRepository
from src.domain.models.conversation import Conversation
from src.domain.models.audit_log import AuditLog
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
async def admin_preview_knowledge(body: KnowledgePreviewRequest, db: AsyncSession = Depends(get_db), _u: User = admin):
    query = body.query.strip()
    if not query:
        raise HTTPException(400, detail="query is required")
    return {"query": query, "evidence": await KnowledgeService(db).retrieve(query, limit=4)}


# ── Dashboard ──

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "static", "uploads", "assets")
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ── Dashboard ──

@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    now = datetime.now(timezone.utc)
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
    body: DestinationCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    template = await db.get(PageTemplate, body.template_id) if body.template_id else None
    dest = await DestinationService(db).admin_create_with_template(
        body, template, actor_id=_u.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )
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

    try:
        dest = await DestinationService(db).create_from_template(body, template)
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return {"id": str(dest.id), "name": dest.name, "slug": dest.slug}


@router.put("/destinations/{dest_id}")
async def admin_update_destination(
    dest_id: str,
    body: DestinationUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await DestinationService(db).admin_update(
            dest_id, body.model_dump(exclude_unset=True), actor_id=_u.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", ""),
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.delete("/destinations/{dest_id}")
async def admin_delete_destination(
    dest_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await DestinationService(db).admin_soft_delete(
            dest_id, actor_id=_u.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", ""),
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.post("/destinations/bulk")
async def admin_bulk_import(
    body: BulkDestinationRequest,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    items = body.items
    if not items:
        raise HTTPException(400, detail="No items provided")
    if len(items) > 500:
        raise HTTPException(400, detail="Maximum 500 items per import")

    template_id = body.template_id
    template = None
    if template_id:
        template = await db.get(PageTemplate, template_id)

    count, errors = await DestinationService(db).bulk_import(items, template)
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
async def admin_create_from_place(body: DestinationFromPlaceRequest, db: AsyncSession = Depends(get_db), _u: User = admin):
    dest = await DestinationService(db).create_from_place(body)
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
async def admin_enrich_free_all(_u: User = admin):
    """Start a non-blocking background enrichment job."""
    return await start_enrich_job()


@router.get("/destinations/enrich-free-all/{job_id}")
async def admin_enrich_free_status(job_id: str, _u: User = admin):
    result = await get_enrich_job(job_id)
    if not result:
        raise HTTPException(404, detail="Enrich job not found")
    return result


@router.post("/seed")
async def admin_seed_all(db: AsyncSession = Depends(get_db), _u: User = admin):
    """Seed destinations + categories + achievements + templates.
    Idempotent — skips if data already exists. Does not create the debug-only
    demo user (see seed.seed_destinations.seed_demo_user)."""
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
    return await TemplateService(db).list_all()


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
    try:
        return await TemplateService(db).get(template_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def admin_create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        template = await TemplateService(db).create(
            id=body.id, name=body.name, description=body.description,
            sections=body.sections, is_default=body.is_default,
        )
    except FileExistsError as exc:
        raise HTTPException(409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return {"id": template.id, "name": template.name}


@router.put("/templates/{template_id}")
async def admin_update_template(
    template_id: str,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await TemplateService(db).update(
            template_id, name=body.name, description=body.description,
            sections=body.sections, is_default=body.is_default,
        )
    except ValueError as exc:
        detail = str(exc)
        raise HTTPException(404 if detail == "Template not found" else 400, detail=detail)
    return {"ok": True}


@router.delete("/templates/{template_id}")
async def admin_delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await TemplateService(db).delete(template_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.post("/templates/import", status_code=status.HTTP_201_CREATED)
async def admin_import_template(
    body: TemplateImportRequest,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    """Import a template from JSON (same format as export)."""
    try:
        template, created = await TemplateService(db).import_template(
            id=body.id.strip(), name=body.name.strip(), description=body.description,
            sections=body.sections, is_default=body.is_default,
        )
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return {"id": template.id, "name": template.name, "created": created, "updated": not created}


@router.get("/templates/{template_id}/export")
async def admin_export_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        return await TemplateService(db).export(template_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))


# ── Sections CRUD (per destination) ──
# Thin router — business logic lives in DestinationService, queries in
# DestinationRepository (see src/services/destination_service.py).
#
# NOTE: /sections/reorder is registered BEFORE /sections/{section_id} on
# purpose. FastAPI/Starlette matches routes in registration order, and
# {section_id} would otherwise capture "reorder" as a literal id — this was
# a real bug (the reorder endpoint was unreachable) before this fix.

def _section_payload(s: DestinationSection) -> dict:
    return {
        "id": str(s.id), "destination_id": str(s.destination_id),
        "section_type": s.section_type, "title": s.title,
        "order": s.order, "visible": s.visible, "data": s.data or {},
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


@router.get("/destinations/{dest_id}/sections")
async def admin_list_sections(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> list[dict]:
    try:
        rows = await DestinationService(db).list_sections(dest_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return [_section_payload(s) for s in rows]


@router.post("/destinations/{dest_id}/sections", status_code=status.HTTP_201_CREATED)
async def admin_create_section(
    dest_id: str,
    body: SectionCreate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        section = await DestinationService(db).create_section(
            dest_id, section_type=body.section_type, title=body.title,
            order=body.order, visible=body.visible, data=body.data,
        )
    except ValueError as exc:
        detail = str(exc)
        raise HTTPException(404 if detail == "Destination not found" else 400, detail=detail)
    return {"id": str(section.id), "section_type": section.section_type}


@router.put("/destinations/{dest_id}/sections/reorder")
async def admin_reorder_sections(
    dest_id: str,
    body: SectionReorder,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await DestinationService(db).reorder_sections(dest_id, body.items)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.put("/destinations/{dest_id}/sections/{section_id}")
async def admin_update_section(
    dest_id: str,
    section_id: str,
    body: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await DestinationService(db).update_section(
            dest_id, section_id, title=body.title, order=body.order,
            visible=body.visible, data=body.data,
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.delete("/destinations/{dest_id}/sections/{section_id}")
async def admin_delete_section(
    dest_id: str,
    section_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await DestinationService(db).delete_section(dest_id, section_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.post("/destinations/{dest_id}/apply-template/{template_id}")
async def admin_apply_template(
    dest_id: str,
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    template = await db.get(PageTemplate, template_id)
    if not template:
        raise HTTPException(404, detail="Template not found")

    try:
        sections_created = await DestinationService(db).apply_template(dest_id, template)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True, "sections_created": sections_created}


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

    parsed_tags = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    base_url = getattr(settings, "asset_base_url", None) or "/static"

    try:
        asset = await AssetService(db).upload(
            content=content, original_filename=file.filename, content_type=file.content_type,
            upload_dir=UPLOAD_DIR, base_url=base_url,
            destination_id=destination_id, section_id=section_id,
            alt_text=alt_text, tags=parsed_tags, uploaded_by=_u.id,
        )
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))

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
    return await AssetService(db).list_assets(
        destination_id=destination_id, section_id=section_id, tag=tag, page=page, size=size,
    )


@router.put("/assets/{asset_id}")
async def admin_update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await AssetService(db).update_asset(
            asset_id, alt_text=body.alt_text, tags=body.tags,
            destination_id=body.destination_id, section_id=body.section_id,
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.delete("/assets/{asset_id}")
async def admin_delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await AssetService(db).delete_asset(asset_id, upload_dir=UPLOAD_DIR)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.post("/assets/bulk-tag")
async def admin_bulk_tag_assets(
    body: AssetBulkTag,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    updated = await AssetService(db).bulk_tag(body.asset_ids, mode=body.mode, tags=body.tags)
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
    return await UserService(db).admin_list(q, page, size)


@router.patch("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await UserService(db).admin_update(
            user_id, actor=_u, role=body.role, is_active=body.is_active, is_verified=body.is_verified,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", ""),
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(400, detail=str(exc))
    return {"ok": True}


@router.patch("/users/{user_id}/verify")
async def admin_toggle_verified(
    user_id: str,
    verified: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        user = await UserService(db).set_verified(user_id, verified)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"id": str(user.id), "is_verified": user.is_verified}


# ── Categories ──

@router.get("/categories")
async def admin_list_categories(
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> list[dict]:
    rows = await CategoryService(db).list_all()
    return [{"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon, "parent_id": c.parent_id} for c in rows]


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def admin_create_category(
    body: CreateCategoryRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    cat = await CategoryService(db).create(
        name=body.name, slug=body.slug, icon=body.icon, parent_id=body.parent_id,
        actor_id=_u.id, ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )
    return {"id": cat.id, "name": cat.name, "slug": cat.slug}


@router.put("/categories/{cat_id}")
async def admin_update_category(
    cat_id: int, body: UpdateCategoryRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await CategoryService(db).update(
            cat_id, body.model_dump(exclude_unset=True), actor_id=_u.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", ""),
        )
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    return {"ok": True}


@router.delete("/categories/{cat_id}")
async def admin_delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    try:
        await CategoryService(db).delete(cat_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(400, detail=str(exc))
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


# ── Audit Logs ──

@router.get("/audit-logs")
async def admin_list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    action: str = Query(""),
    actor_id: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _u: User = admin,
) -> dict:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if actor_id:
        try:
            stmt = stmt.where(AuditLog.actor_id == _uuid.UUID(actor_id))
        except ValueError:
            raise HTTPException(400, detail="Invalid actor_id")
    if date_from:
        try:
            stmt = stmt.where(AuditLog.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
        except ValueError:
            raise HTTPException(400, detail="Invalid date_from (expected ISO 8601)")
    if date_to:
        try:
            stmt = stmt.where(AuditLog.created_at <= datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc))
        except ValueError:
            raise HTTPException(400, detail="Invalid date_to (expected ISO 8601)")

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [{
            "id": str(r.id),
            "actor_id": str(r.actor_id) if r.actor_id else None,
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "meta": r.meta or {},
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows],
        "total": total, "page": page, "size": size,
    }
