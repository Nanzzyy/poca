"""Tests for password strength validation and pageview schema (SEC-05/SEC-07)."""
import pytest
from pydantic import ValidationError

from src.domain.schemas.user import TrackPageviewRequest, UserCreate


def test_weak_password_rejected_short():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", username="u", password="1")


def test_weak_password_rejected_no_upper():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", username="u", password="lowercase123")


def test_weak_password_rejected_no_lower():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", username="u", password="UPPERCASE123")


def test_weak_password_rejected_no_digit():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", username="u", password="PasswordNoDigit")


def test_strong_password_accepted():
    u = UserCreate(email="a@b.com", username="u", password="StrongPass1")
    assert u.password == "StrongPass1"


def test_track_pageview_requires_path():
    with pytest.raises(ValidationError):
        TrackPageviewRequest(path="   ")


def test_track_pageview_truncates_path():
    r = TrackPageviewRequest(path="x" * 1000)
    assert len(r.path) == 500
