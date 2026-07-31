from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models.post import Comment, Post, PostLike

class PostRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_feed(self, page: int = 1, size: int = 20, viewer_id: str | None = None) -> tuple[list[Post], int]:
        query = (
            select(Post)
            .options(selectinload(Post.user), selectinload(Post.comments))
            .order_by(Post.created_at.desc())
        )
        total = (await self.db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
        query = query.offset((page - 1) * size).limit(size)
        items = list((await self.db.execute(query)).scalars().all())
        if items and viewer_id:
            await self._attach_liked(items, viewer_id)
        return items, total

    async def _attach_liked(self, posts: list[Post], viewer_id: str) -> None:
        ids = [p.id for p in posts]
        if not ids:
            return
        stmt = select(PostLike.post_id).where(PostLike.user_id == viewer_id, PostLike.post_id.in_(ids))
        liked = {row[0] for row in (await self.db.execute(stmt)).all()}
        for p in posts:
            p.liked_by_me = p.id in liked

    async def create(self, post: Post) -> Post:
        self.db.add(post)
        await self.db.flush()
        # reload relationships for response serialization (avoids lazy-load in async)
        await self.db.refresh(post, attribute_names=["user", "comments"])
        return post

    async def get_by_id(self, post_id: str, viewer_id: str | None = None) -> Post | None:
        stmt = (
            select(Post)
            .where(Post.id == post_id)
            .options(selectinload(Post.user), selectinload(Post.comments))
        )
        post = (await self.db.execute(stmt)).scalar_one_or_none()
        if post and viewer_id:
            await self._attach_liked([post], viewer_id)
        return post

    async def toggle_like(self, post_id: str, user_id: str) -> tuple[bool, int]:
        """Toggle like. Returns (liked_now: bool, new_count: int).
        Unique (post,user) constraint makes this safe from double-likes."""
        post = await self.get_by_id(post_id)
        if not post:
            raise ValueError("Post not found")

        existing = await self.db.execute(
            select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user_id)
        )
        like = existing.scalar_one_or_none()

        if like:
            await self.db.delete(like)
            post.like_count = max(0, post.like_count - 1)
            liked_now = False
        else:
            self.db.add(PostLike(post_id=post_id, user_id=user_id))
            post.like_count += 1
            liked_now = True

        await self.db.flush()
        return liked_now, post.like_count

    async def delete(self, post: Post) -> None:
        await self.db.execute(delete(PostLike).where(PostLike.post_id == post.id))
        await self.db.execute(delete(Comment).where(Comment.post_id == post.id))
        await self.db.delete(post)
        await self.db.flush()

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
