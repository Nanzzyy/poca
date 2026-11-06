"""Regression test: the demo/dev-only login must never be creatable outside
debug mode (CRIT-01 — a hardcoded demo-admin account used to auto-seed on any
fresh deploy, including production)."""
import pytest

from src.core.config import settings
from seed import seed_destinations


@pytest.mark.asyncio
async def test_seed_demo_user_noop_when_not_debug(monkeypatch):
    monkeypatch.setattr(settings, "debug", False)

    def _fail_if_called(*args, **kwargs):
        raise AssertionError("seed_demo_user must not touch the database when debug=False")

    monkeypatch.setattr(seed_destinations, "create_async_engine", _fail_if_called)

    await seed_destinations.seed_demo_user()


def test_demo_user_is_never_seeded_as_admin():
    """Static guard: the demo account, if it is ever created, must be role=user."""
    import inspect

    source = inspect.getsource(seed_destinations.seed_demo_user)
    assert 'role="user"' in source
    assert 'role="admin"' not in source


def test_seed_function_does_not_create_demo_user():
    """seed() backs the admin-triggered /admin/seed endpoint (reachable in any
    environment) — it must never create the demo login, regardless of debug."""
    import inspect

    source = inspect.getsource(seed_destinations.seed)
    assert "demo@poca.app" not in source
