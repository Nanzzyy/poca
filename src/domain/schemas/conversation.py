from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    trip_id: Optional[UUID] = None


class ConversationUpdate(BaseModel):
    summary: str


class MessageSend(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    msg_metadata: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    trip_id: Optional[UUID] = None
    context_data: Optional[dict[str, Any]] = None
    summary: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: UUID
    summary: Optional[str] = None
    message_count: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
