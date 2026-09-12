from starlette.requests import Request

from src.middleware.rate_limit import _client_ip


def _request(headers: dict[str, str], client: tuple[str, int] = ("127.0.0.1", 8000)) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
            "client": client,
            "server": ("test", 8000),
            "scheme": "https",
        }
    )


def test_client_ip_prefers_cloudflare_header() -> None:
    request = _request({"CF-Connecting-IP": "203.0.113.42"}, ("172.18.0.4", 8000))
    assert _client_ip(request) == "203.0.113.42"


def test_client_ip_uses_forwarded_for_from_internal_proxy() -> None:
    request = _request({"X-Forwarded-For": "198.51.100.7, 172.18.0.4"}, ("172.18.0.4", 8000))
    assert _client_ip(request) == "198.51.100.7"


def test_client_ip_ignores_forwarded_for_from_public_peer() -> None:
    request = _request({"X-Forwarded-For": "198.51.100.7"}, ("8.8.8.8", 8000))
    assert _client_ip(request) == "8.8.8.8"
