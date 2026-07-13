from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.review_repo import ReviewRepository
from src.repositories.destination_repo import DestinationRepository


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.repo = ReviewRepository(db)
        self.dest_repo = DestinationRepository(db)

    async def on_review_created(self, destination_id: str) -> None:
        """Update destination stats when a review is created."""
        avg_rating, review_count = await self.repo.get_review_stats(destination_id)
        dest = await self.dest_repo.get_by_id(destination_id)
        if dest:
            dest.rating_avg = round(avg_rating, 1)
            dest.review_count = review_count
            await self.dest_repo.db.flush()
