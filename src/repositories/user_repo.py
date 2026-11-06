from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.text_safety import escape_like
from src.domain.models.user import User
from src.repositories._pagination import paginate

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, q: str = "", page: int = 1, size: int = 20) -> tuple[list[User], int]:
        stmt = select(User)
        if q:
            needle = f"%{escape_like(q)}%"
            stmt = stmt.where(User.email.ilike(needle, escape="\\") | User.username.ilike(needle, escape="\\"))
        stmt = stmt.order_by(User.created_at.desc())
        stmt, total = await paginate(self.db, stmt, page, size)
        rows = (await self.db.execute(stmt)).scalars().all()
        return list(rows), total

    async def get_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def update(self, user: User) -> User:
        await self.db.merge(user)
        return user
