"""Shared text-safety helpers for user-supplied content (SEC-03/SEC-12).

Previously duplicated independently in src/api/v1/posts.py (_sanitize_text)
and in src/repositories/knowledge_repo.py + src/api/v1/admin.py
(_escape_like) — centralized here so every write/search path uses the same,
single-source-of-truth behavior.
"""
from __future__ import annotations


def sanitize_html(value: str) -> str:
    """Strip HTML tags and control chars from user content.

    Uses nh3 (ammonia) when available for robust sanitization; falls back to
    a conservative tag-stripping regex so the app still runs without the
    extra dependency.
    """
    try:
        import nh3  # type: ignore
        return nh3.clean(value, tags=set(), attributes={})
    except ImportError:
        import re
        value = re.sub(r"<[^>]*>", "", value)
        value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value)
        return value


def escape_like(q: str) -> str:
    """Escape LIKE/ILIKE wildcards so user input is matched literally."""
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
