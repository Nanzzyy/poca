"""LOW-04 — cookie_secure defaulted to False with no fail-closed guard,
unlike jwt_secret/cors_origins which both refuse to start on an insecure
value. A deployment that forgot to set COOKIE_SECURE=true in production
would silently send auth cookies over plain HTTP."""
import pytest
from pydantic import ValidationError

from src.core.config import Settings


def _base_kwargs(**overrides) -> dict:
    base = dict(jwt_secret="a" * 32, cors_origins="http://localhost:3000")
    base.update(overrides)
    return base


def test_rejects_insecure_cookies_outside_debug():
    with pytest.raises(ValidationError, match="COOKIE_SECURE must be true"):
        Settings(**_base_kwargs(debug=False, cookie_secure=False))


def test_allows_insecure_cookies_in_debug_mode():
    settings = Settings(**_base_kwargs(debug=True, cookie_secure=False))
    assert settings.cookie_secure is False


def test_allows_secure_cookies_outside_debug():
    settings = Settings(**_base_kwargs(debug=False, cookie_secure=True))
    assert settings.cookie_secure is True
