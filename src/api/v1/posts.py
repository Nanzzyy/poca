from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.domain.models.post import Comment, Post
from src.domain.models.user import User
from src.domain.schemas.destination import PaginatedResponse
from src.domain.schemas.post import (
    CommentCreate,
    CommentResponse,
    PostCreate,
    PostResponse,
)
from src.repositories.post_repo import CommentRepository, PostRepository

router = APIRouter(tags=["posts"])


def _to_post_response(p: Post) -> PostResponse:
    resp = PostResponse.model_validate(p)
    resp.username = p.user.username if p.user else None
    resp.avatar_url = p.user.avatar_url if p.user else None
    resp.comment_count = len(p.comments) if p.comments else 0
    return resp


@router.get("/posts")
async def list_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    repo = PostRepository(db)
    items, total = await repo.list_feed(page, size)
    return PaginatedResponse(
        items=[_to_post_response(p) for p in items],
        total=total, page=page, size=size,
        pages=(total + size - 1) // size,
    )


@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> PostResponse:
    if not body.content.strip() and not body.media:
        raise HTTPException(status_code=400, detail="Post must have content or media")
    post = Post(
        user_id=user.id,
        destination_id=body.destination_id,
        content=body.content.strip(),
        media=[m.model_dump() for m in body.media],
    )
    repo = PostRepository(db)
    post = await repo.create(post)
    return _to_post_response(post)


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = PostRepository(db)
    try:
        count = await repo.like(post_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"like_count": count}


@router.get("/posts/{post_id}/comments")
async def list_comments(
    post_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[CommentResponse]:
    repo = CommentRepository(db)
    items = await repo.list_by_post(post_id)
    result = []
    for c in items:
        resp = CommentResponse.model_validate(c)
        resp.username = c.user.username if c.user else None
        resp.avatar_url = c.user.avatar_url if c.user else None
        result.append(resp)
    return result


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    body: CommentCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> CommentResponse:
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    post_repo = PostRepository(db)
    if not await post_repo.get_by_id(post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, user_id=user.id, content=body.content.strip())
    repo = CommentRepository(db)
    comment = await repo.create(comment)
    resp = CommentResponse.model_validate(comment)
    resp.username = user.username
    resp.avatar_url = user.avatar_url
    return resp
