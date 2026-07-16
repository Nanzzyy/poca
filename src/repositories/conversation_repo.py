from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.domain.models.conversation import Conversation, Message

class ConversationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, conversation: Conversation) -> Conversation:
        self.db.add(conversation)
        await self.db.flush()
        result = await self.get_by_id(conversation.id)
        return result or conversation

    async def get_by_id(self, conv_id: str) -> Conversation | None:
        stmt = (
            select(Conversation)
            .where(Conversation.id == conv_id)
            .options(selectinload(Conversation.messages))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str, page: int = 1, size: int = 20) -> tuple[list[Conversation], int]:
        query = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.updated_at.desc())
        )
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        query = query.offset((page - 1) * size).limit(size)
        result = await self.db.execute(query)
        items = list(result.scalars().all())
        return items, total

    async def add_message(self, message: Message) -> Message:
        self.db.add(message)
        await self.db.flush()
        return message

    async def get_messages(self, conv_id: str) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conv_id)
            .order_by(Message.created_at)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_context(self, conv_id: str, context_data: dict) -> None:
        stmt = update(Conversation).where(Conversation.id == conv_id).values(context_data=context_data)
        await self.db.execute(stmt)

    async def update_summary(self, conv_id: str, summary: str) -> None:
        stmt = update(Conversation).where(Conversation.id == conv_id).values(summary=summary)
        await self.db.execute(stmt)

    async def delete(self, conv_id: str) -> None:
        stmt = select(Conversation).where(Conversation.id == conv_id)
        result = await self.db.execute(stmt)
        conv = result.scalar_one_or_none()
        if conv:
            await self.db.delete(conv)
