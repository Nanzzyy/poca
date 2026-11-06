"""Regression test for the auth cookies' CSRF-relevant attributes.

Auth is cookie-only (no Authorization header), so SameSite=Lax is the
primary CSRF defense — it blocks the cookie from being sent on cross-site
POST/PUT/DELETE requests. A future edit that loosens this (e.g. switching to
SameSite=None for some integration) would silently reopen CSRF, so pin it
here."""
from fastapi import Response

from src.api.v1.users import _set_auth_cookies
from src.core.config import settings


def _set_cookie_headers(response: Response) -> list[str]:
    return [v.decode() for k, v in response.raw_headers if k == b"set-cookie"]


def test_auth_cookies_are_httponly_and_samesite_lax():
    resp = Response()
    _set_auth_cookies(resp, "00000000-0000-0000-0000-000000000000")

    headers = _set_cookie_headers(resp)
    assert len(headers) == 2
    for header in headers:
        assert "HttpOnly" in header
        assert "SameSite=lax" in header


def test_auth_cookies_respect_cookie_secure_setting(monkeypatch):
    monkeypatch.setattr(settings, "cookie_secure", True)
    resp = Response()
    _set_auth_cookies(resp, "00000000-0000-0000-0000-000000000000")

    headers = _set_cookie_headers(resp)
    for header in headers:
        assert "secure" in header.lower()
