from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.domain.models.review import Review, ReviewSummary
from src.domain.models.user import User

class ReviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_destination(self, dest_id: str, page: int = 1, size: int = 20,
                                  sort: str = "created_at") -> tuple[list[Review], int]:
        query = (
            select(Review)
            .where(Review.destination_id == dest_id, Review.moderation_status != "rejected")
            .options(selectinload(Review.user))
        )
        if sort == "rating_high":
            query = query.order_by(Review.rating.desc())
        elif sort == "rating_low":
            query = query.order_by(Review.rating.asc())
        elif sort == "helpful":
            query = query.order_by(Review.helpful_count.desc())
        else:
            query = query.order_by(Review.created_at.desc())

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        query = query.offset((page - 1) * size).limit(size)
        result = await self.db.execute(query)
        items = list(result.scalars().all())
        return items, total

    async def create(self, review: Review) -> Review:
        self.db.add(review)
        await self.db.flush()
        return review

    async def get_by_id(self, review_id: str) -> Review | None:
        stmt = select(Review).where(Review.id == review_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, review: Review) -> Review:
        await self.db.merge(review)
        return review

    async def delete(self, review: Review) -> None:
        await self.db.delete(review)

    async def toggle_helpful(self, review_id: str) -> int:
        stmt = select(Review).where(Review.id == review_id)
        result = await self.db.execute(stmt)
        review = result.scalar_one_or_none()
        if not review:
            raise ValueError("Review not found")
        review.helpful_count += 1
        await self.db.flush()
        return review.helpful_count

    async def get_summary(self, dest_id: str) -> ReviewSummary | None:
        stmt = select(ReviewSummary).where(ReviewSummary.destination_id == dest_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def save_summary(self, summary: ReviewSummary) -> ReviewSummary:
        self.db.add(summary)
        await self.db.flush()
        return summary

    async def update_summary(self, summary: ReviewSummary) -> ReviewSummary:
        await self.db.merge(summary)
        return summary

    async def get_review_stats(self, dest_id: str) -> tuple[float, int]:
        from sqlalchemy import select, func
        stmt = select(
            func.coalesce(func.avg(Review.rating), 0),
            func.count(Review.id)
        ).where(Review.destination_id == dest_id, Review.moderation_status == "approved")
        result = await self.db.execute(stmt)
        row = result.one()
        return float(row[0]), int(row[1])
