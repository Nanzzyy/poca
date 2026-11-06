"""Tests for the centralized text-safety helpers (src/core/text_safety.py).

Supersedes the duplication that used to exist independently in
src/api/v1/posts.py (_sanitize_text) and src/repositories/knowledge_repo.py +
src/api/v1/admin.py (_escape_like) — both now re-export from here, so this
is the single source of truth for both behaviors."""
import inspect

from src.api.v1 import reviews
from src.core.text_safety import escape_like, sanitize_html


def test_sanitize_html_strips_tags():
    assert sanitize_html("<script>alert(1)</script>hello") == "hello"


def test_sanitize_html_strips_img_onerror():
    assert "onerror" not in sanitize_html('<img src=x onerror=alert(1)>')


def test_sanitize_html_passthrough_plain_text():
    assert sanitize_html("Pantai yang indah!") == "Pantai yang indah!"


def test_escape_like_escapes_wildcards():
    assert escape_like("100%") == "100\\%"
    assert escape_like("a_b") == "a\\_b"


def test_escape_like_escapes_backslash_first():
    assert escape_like(r"a\%") == r"a\\\%"


def test_escape_like_passthrough_plain():
    assert escape_like("bali") == "bali"


def test_review_create_and_update_sanitize_user_content():
    """MED-01 — reviews were the only user-content write path that skipped
    HTML sanitization (posts/comments already used it). Static check so the
    sanitize_html(...) wrapper can't be silently dropped from these handlers."""
    create_source = inspect.getsource(reviews.create_review)
    update_source = inspect.getsource(reviews.update_review)

    for field in ("title", "content", "travel_tips"):
        assert f"sanitize_html(body.{field})" in create_source
        assert f"sanitize_html(body.{field})" in update_source
