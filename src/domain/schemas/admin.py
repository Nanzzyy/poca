from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Template Schemas ──

class TemplateSectionDef(BaseModel):
    type: str
    order: int = 0
    required: bool = False
    title: Optional[str] = None
    defaults: dict[str, Any] = {}


class TemplateCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9-]+$", max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    sections: list[TemplateSectionDef] = []
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    sections: Optional[list[TemplateSectionDef]] = None
    is_default: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    sections: list[dict[str, Any]]
    is_default: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ── Section Schemas ──

class SectionCreate(BaseModel):
    section_type: str
    title: Optional[str] = None
    order: int = 0
    visible: bool = True
    data: dict[str, Any] = {}


class SectionUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    visible: Optional[bool] = None
    data: Optional[dict[str, Any]] = None


class SectionReorderItem(BaseModel):
    id: str
    order: int


class SectionReorder(BaseModel):
    items: list[SectionReorderItem]


class SectionResponse(BaseModel):
    id: str
    destination_id: str
    section_type: str
    title: Optional[str]
    order: int
    visible: bool
    data: dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ── Asset Schemas ──

class AssetUpdate(BaseModel):
    alt_text: Optional[str] = None
    tags: Optional[list[str]] = None
    destination_id: Optional[str] = None
    section_id: Optional[str] = None


class AssetResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    url: str
    mime_type: str
    size_bytes: int
    destination_id: Optional[str]
    section_id: Optional[str]
    alt_text: Optional[str]
    tags: list[str]
    uploaded_by: Optional[str]
    created_at: Optional[str] = None


class AssetBulkTag(BaseModel):
    asset_ids: list[str]
    tags: list[str]
    mode: str = "add"  # "add" or "replace"


# ── Destination from Template ──

class DestinationFromTemplate(BaseModel):
    template_id: str
    name: str
    category_id: Optional[int] = None
    latitude: float = 0
    longitude: float = 0
    country: str = "Indonesia"
    city: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    price_level: str = "mid"
    images: list[str] = []
    tags: list[str] = []
    section_overrides: dict[str, dict[str, Any]] = {}
