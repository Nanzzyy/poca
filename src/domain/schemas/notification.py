from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    actor_id: Optional[UUID] = None
    type: str
    title: str
    subtitle: Optional[str] = None
    meta: dict[str, Any] = {}
    is_read: bool = False
    created_at: datetime
    actor_username: Optional[str] = None
    actor_avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}
