"""Sentence-transformers wrapper for multilingual embeddings.

Model: paraphrase-multilingual-MiniLM-L12-v2
- 384 dimensions
- Supports Bahasa Indonesia natively
- ~180MB model size, loads once at startup
- CPU inference: ~10ms per embedding
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    import numpy as np

# Singleton instance — loaded once at startup
_embedder_instance: "Embedder | None" = None


class Embedder:
    """Wraps sentence-transformers for embedding text to vectors."""

    MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    DIMENSION = 384

    def __init__(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model: %s", self.MODEL_NAME)
            self.model = SentenceTransformer(self.MODEL_NAME)
            logger.info("Embedding model loaded (dim=%d)", self.DIMENSION)
        except ImportError:
            logger.warning("sentence-transformers not installed. Semantic search disabled.")
            self.model = None
        except Exception:
            logger.warning("Failed to load embedding model", exc_info=True)
            self.model = None

    @property
    def available(self) -> bool:
        return self.model is not None

    def embed(self, text: str) -> list[float]:
        """Embed a single text string → 384-dim float vector."""
        if not self.available:
            return []
        vec = self.model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts → list of 384-dim float vectors."""
        if not self.available or not texts:
            return []
        vecs = self.model.encode(texts, normalize_embeddings=True, batch_size=32)
        return [v.tolist() for v in vecs]


def get_embedder() -> Embedder | None:
    """Get or create the singleton Embedder instance."""
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = Embedder()
    return _embedder_instance if _embedder_instance.available else None


def destination_to_text(name: str, city: str | None, category: str | None,
                        description: str | None, tags: list[str] | None,
                        price_level: str | None) -> str:
    """Convert destination fields to embeddable text."""
    parts = [name]
    if city:
        parts.append(f"di {city}")
    if category:
        parts.append(f"Kategori: {category}")
    if description:
        parts.append(description[:200])
    if tags:
        parts.append(f"Tags: {', '.join(tags[:5])}")
    if price_level:
        parts.append(f"Harga: {price_level}")
    return ". ".join(parts)
