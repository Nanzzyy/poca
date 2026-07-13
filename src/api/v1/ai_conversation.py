from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.domain.models.conversation import Conversation, Message
from src.domain.models.user import User
from src.domain.schemas.conversation import (
    ConversationCreate,
    ConversationListItem,
    ConversationResponse,
    MessageResponse,
    MessageSend,
)
from src.repositories.conversation_repo import ConversationRepository
from src.services.ai_conversation_service import AIConversationService

router = APIRouter(prefix="/ai/conversations", tags=["ai"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    conv = Conversation(
        user_id=user.id,
        trip_id=body.trip_id,
    )
    repo = ConversationRepository(db)
    conv = await repo.create(conv)
    return ConversationResponse.model_validate(conv)


@router.get("")
async def list_conversations(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationListItem]:
    repo = ConversationRepository(db)
    convs, _ = await repo.get_by_user(user.id)
    result = []
    for c in convs:
        result.append(ConversationListItem(
            id=str(c.id),
            summary=c.summary,
            message_count=len(c.messages) if hasattr(c, "messages") else 0,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))
    return result


@router.get("/{conv_id}")
async def get_conversation(
    conv_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if str(conv.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return ConversationResponse.model_validate(conv)


@router.post("/{conv_id}/messages")
async def send_message(
    conv_id: str,
    body: MessageSend,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if str(conv.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save user message
    user_msg = Message(conversation_id=conv_id, role="user", content=body.content)
    await repo.add_message(user_msg)

    # Generate AI response
    ai_service = AIConversationService(db)
    try:
        ai_content = await ai_service.generate_response(conv_id, body.content)
    except Exception as e:
        ai_content = f"Sorry, I encountered an error: {str(e)}"

    # Save AI message
    ai_msg = Message(conversation_id=conv_id, role="assistant", content=ai_content)
    await repo.add_message(ai_msg)

    return MessageResponse.model_validate(ai_msg)


@router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = ConversationRepository(db)
    conv = await repo.get_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if str(conv.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    await repo.delete(conv_id)
