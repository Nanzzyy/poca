"""Tests for the LIKE wildcard escaping helpers (SEC-09/SEC-23)."""
from src.api.v1.admin import _escape_like
from src.repositories.knowledge_repo import _escape_like as _repo_escape_like


def test_admin_escape_like_escapes_wildcards():
    assert _escape_like("100%") == "100\\%"
    assert _escape_like("a_b") == "a\\_b"


def test_admin_escape_like_escapes_backslash_first():
    assert _escape_like(r"a\%") == r"a\\\%"


def test_admin_escape_like_passthrough_plain():
    assert _escape_like("bali") == "bali"


def test_repo_escape_like_matches_admin_behavior():
    assert _repo_escape_like("100%") == "100\\%"
    assert _repo_escape_like("x_y") == "x\\_y"
