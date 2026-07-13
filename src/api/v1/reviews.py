from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.domain.models.review import Review
from src.domain.models.user import User
from src.domain.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewSummaryResponse,
    ReviewUpdate,
)
from src.domain.schemas.destination import PaginatedResponse
from src.repositories.review_repo import ReviewRepository
from src.services.review_service import ReviewService

router = APIRouter(tags=["reviews"])


@router.get("/destinations/{dest_id}/reviews")
async def list_reviews(
    dest_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: str = "created_at",
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    repo = ReviewRepository(db)
    items, total = await repo.get_by_destination(dest_id, page, size, sort)
    result = []
    for r in items:
        d = ReviewResponse.model_validate(r)
        d.username = r.user.username if r.user else None
        d.avatar_url = r.user.avatar_url if r.user else None
        result.append(d)
    return PaginatedResponse(
        items=result, total=total, page=page, size=size,
        pages=(total + size - 1) // size,
    )


@router.post("/destinations/{dest_id}/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(
    dest_id: str,
    body: ReviewCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = Review(
        user_id=user.id,
        destination_id=dest_id,
        rating=body.rating,
        title=body.title,
        content=body.content,
        photos=body.photos,
        visit_date=body.visit_date,
        actual_spending=body.actual_spending or {},
        travel_tips=body.travel_tips,
    )
    repo = ReviewRepository(db)
    review = await repo.create(review)

    svc = ReviewService(db)
    await svc.on_review_created(dest_id)

    result = ReviewResponse.model_validate(review)
    result.username = user.username
    result.avatar_url = user.avatar_url
    return result


@router.put("/reviews/{review_id}")
async def update_review(
    review_id: str,
    body: ReviewUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    repo = ReviewRepository(db)
    review = await repo.get_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if str(review.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.rating is not None:
        review.rating = body.rating
    if body.title is not None:
        review.title = body.title
    if body.content is not None:
        review.content = body.content
    if body.photos is not None:
        review.photos = body.photos
    if body.travel_tips is not None:
        review.travel_tips = body.travel_tips
    review.updated_at = datetime.utcnow()

    await repo.update(review)
    result = ReviewResponse.model_validate(review)
    result.username = user.username
    result.avatar_url = user.avatar_url
    return result


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = ReviewRepository(db)
    review = await repo.get_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if str(review.user_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    await repo.delete(review)


@router.post("/reviews/{review_id}/helpful")
async def mark_helpful(
    review_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = ReviewRepository(db)
    try:
        count = await repo.toggle_helpful(review_id)
        return {"helpful_count": count}
    except ValueError:
        raise HTTPException(status_code=404, detail="Review not found")


@router.get("/destinations/{dest_id}/review-summary")
async def get_review_summary(
    dest_id: str,
    db: AsyncSession = Depends(get_db),
) -> ReviewSummaryResponse:
    repo = ReviewRepository(db)
    summary = await repo.get_summary(dest_id)
    avg_rating, count = await repo.get_review_stats(dest_id)

    return ReviewSummaryResponse(
        destination_id=dest_id,
        summary_text=summary.summary_text if summary else None,
        positive_topics=summary.positive_topics if summary else [],
        negative_topics=summary.negative_topics if summary else [],
        sentiment_score=summary.sentiment_score if summary else None,
        generated_at=summary.generated_at if summary else None,
        review_count=count,
        avg_rating=round(avg_rating, 1),
    )
