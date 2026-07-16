from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models.post import Comment, Post


class PostRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_feed(self, page: int = 1, size: int = 20) -> tuple[list[Post], int]:
        query = (
            select(Post)
            .options(selectinload(Post.user), selectinload(Post.comments))
            .order_by(Post.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
        query = query.offset((page - 1) * size).limit(size)
        items = list((await self.db.execute(query)).scalars().all())
        return items, total

    async def create(self, post: Post) -> Post:
        self.db.add(post)
        await self.db.flush()
        # reload user for response serialization
        await self.db.refresh(post, attribute_names=["user"])
        return post

    async def get_by_id(self, post_id: str) -> Post | None:
        stmt = (
            select(Post)
            .where(Post.id == post_id)
            .options(selectinload(Post.user), selectinload(Post.comments))
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def like(self, post_id: str) -> int:
        post = await self.get_by_id(post_id)
        if not post:
            raise ValueError("Post not found")
        post.like_count += 1
        await self.db.flush()
        return post.like_count


class CommentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_post(self, post_id: str) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.post_id == post_id)
            .options(selectinload(Comment.user))
            .order_by(Comment.created_at.asc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def create(self, comment: Comment) -> Comment:
        self.db.add(comment)
        await self.db.flush()
        await self.db.refresh(comment, attribute_names=["user"])
        return comment
