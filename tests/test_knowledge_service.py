"""Tests for global AI knowledge system."""

import pytest
import hashlib
from unittest.mock import patch, MagicMock

from src.services.knowledge_service import (
    normalize_content, content_hash, cosine_similarity, KnowledgeService,
)


def test_normalize_content_strips_whitespace():
    assert normalize_content("  hello  ") == "hello"
    assert normalize_content("a\n\n\nb") == "a\n\nb"
    assert normalize_content("a\t\tb") == "a b"
    assert normalize_content("a\r\nb") == "a\nb"


def test_normalize_content_rejects_empty():
    with pytest.raises(ValueError, match="required"):
        KnowledgeService(db=None).validate_content("   ")


def test_content_hash_deterministic():
    assert content_hash("hello") == content_hash("hello")
    assert content_hash("hello") != content_hash("world")


def test_cosine_similarity():
    assert cosine_similarity([1, 0], [1, 0]) == pytest.approx(1.0)
    assert cosine_similarity([1, 0], [0, 1]) == pytest.approx(0.0)
    assert cosine_similarity([], [1, 0]) == 0.0
    assert cosine_similarity([1, 0], []) == 0.0


def test_content_hash_is_sha256():
    expected = hashlib.sha256(b"test").hexdigest()
    assert content_hash("test") == expected
