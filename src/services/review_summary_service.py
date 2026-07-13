import json

from litellm import acompletion
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.repositories.review_repo import ReviewRepository


class ReviewSummaryService:
    def __init__(self, db: AsyncSession):
        self.repo = ReviewRepository(db)

    async def generate_summary(self, destination_id: str) -> str | None:
        reviews, _ = await self.repo.get_by_destination(destination_id, size=50, sort="created_at")
        if not reviews:
            return None

        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        total = len(reviews)
        ratings_breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for r in reviews:
            ratings_breakdown[r.rating] = ratings_breakdown.get(r.rating, 0) + 1

        # Collect common topics from review content
        topics_positive = set()
        topics_negative = set()
        for r in reviews:
            if r.content:
                content_lower = r.content.lower()
                for word, topic in [("sunset", "sunset"), ("indah", "scenery"), ("ramah", "friendly staff"),
                                     ("murah", "affordable"), ("bersih", "cleanliness"), ("enak", "food"),
                                     ("macet", "traffic"), ("ramai", "crowded"), ("mahal", "expensive"),
                                     ("panas", "hot weather")]:
                    if word in content_lower:
                        if r.rating >= 4:
                            topics_positive.add(topic)
                        elif r.rating <= 2:
                            topics_negative.add(topic)

        # Try AI summary if API key available
        if settings.ai_api_key:
            review_text = "\n".join(
                f"- [{r.rating}/5] {r.title or ''}: {(r.content or '')[:200]}"
                for r in reviews[:20]
            )
            prompt = f"""Summarize these tourism destination reviews.
Average rating: {avg_rating:.1f}/5
Reviews ({total} total):
{review_text}
Return JSON: {{"summary":"...", "positive_topics":["..."], "negative_topics":["..."], "sentiment_score":0.0-1.0}}"""

            try:
                response = await acompletion(
                    model=settings.ai_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300, temperature=0.3,
                )
                return response.choices[0].message.content or None
            except Exception:
                pass

        # Template-based summary (zero cost)
        sentiment_score = round(avg_rating / 5, 2)
        if avg_rating >= 4:
            tone = "sangat baik"
            sentiment = "positif"
            opening = "Pengunjung sangat menyukai tempat ini!"
        elif avg_rating >= 3:
            tone = "cukup baik"
            sentiment = "campuran"
            opening = "Pengalaman pengunjung cukup bervariasi."
        else:
            tone = "kurang"
            sentiment = "negatif"
            opening = "Banyak pengunjung yang kecewa."

        summary = (
            f"⭐ **{avg_rating:.1f}/5** dari {total} ulasan. {opening}\n\n"
            f"Distribusi rating: "
            + ", ".join(f"{k}★: {v} ulasan" for k, v in sorted(ratings_breakdown.items(), reverse=True) if v > 0)
        )
        if topics_positive:
            summary += f"\n\n👍 **Yang disukai:** " + ", ".join(sorted(topics_positive))
        if topics_negative:
            summary += f"\n\n👎 **Yang dikeluhkan:** " + ", ".join(sorted(topics_negative))

        return f'{{"summary": {json.dumps(summary)}, "positive_topics": {json.dumps(sorted(topics_positive))}, "negative_topics": {json.dumps(sorted(topics_negative))}, "sentiment_score": {sentiment_score}}}'
