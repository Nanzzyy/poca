"""Seed embeddings for all destinations.

Run: PYTHONPATH=. python -m src.ai.seed_embeddings

Computes 384-dim embeddings for all destinations using sentence-transformers
and stores them in the database for pgvector semantic search.
"""

import asyncio
import json
import sys

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory
from src.domain.models.destination import Destination
from src.ai.local.embedder import get_embedder, destination_to_text


async def seed_embeddings():
    embedder = get_embedder()
    if not embedder:
        print("ERROR: Embedder not available. Install sentence-transformers:")
        print("  pip install sentence-transformers")
        sys.exit(1)

    async with async_session_factory() as db:
        # Fetch all active destinations with category
        stmt = select(Destination).where(Destination.is_active == True)
        result = await db.execute(stmt)
        destinations = result.scalars().all()

        if not destinations:
            print("No destinations found in database.")
            return

        print(f"Computing embeddings for {len(destinations)} destinations...")

        # Prepare texts for batch embedding
        texts = []
        dest_list = []
        for dest in destinations:
            cat_name = dest.category.name if dest.category else None
            text = destination_to_text(
                name=dest.name,
                city=dest.city,
                category=cat_name,
                description=dest.description,
                tags=dest.tags or [],
                price_level=dest.price_level,
            )
            texts.append(text)
            dest_list.append(dest)

        # Batch compute embeddings
        embeddings = embedder.embed_batch(texts)
        print(f"Computed {len(embeddings)} embeddings (dim={len(embeddings[0]) if embeddings else 0})")

        # Update database
        for dest, emb in zip(dest_list, embeddings):
            # Store as JSON string (TEXT column)
            dest.embedding = json.dumps(emb)

        await db.commit()
        print(f"Saved {len(embeddings)} embeddings to database.")

        # Verify
        count_stmt = select(Destination).where(Destination.embedding.isnot(None))
        count_result = await db.execute(count_stmt)
        count = len(count_result.scalars().all())
        print(f"Total destinations with embeddings: {count}")


if __name__ == "__main__":
    asyncio.run(seed_embeddings())
