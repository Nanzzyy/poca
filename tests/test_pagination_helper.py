"""Tests for the shared paginate() helper (src/repositories/_pagination.py),
which replaced the count+offset+limit pattern that was previously
hand-rolled independently across destination/user/asset/knowledge/
analytics repositories."""
import pytest
from sqlalchemy import select

from src.domain.models.user import User
from src.repositories._pagination import paginate


class _FakeResult:
    def __init__(self, scalar_value):
        self._scalar_value = scalar_value

    def scalar(self):
        return self._scalar_value


class _FakeDB:
    def __init__(self, total: int):
        self.total = total
        self.executed = []

    async def execute(self, stmt):
        self.executed.append(stmt)
        return _FakeResult(self.total)


@pytest.mark.asyncio
async def test_paginate_returns_total_and_slices_with_offset_limit():
    db = _FakeDB(total=42)
    stmt = select(User)

    sliced, total = await paginate(db, stmt, page=3, size=10)

    assert total == 42
    assert sliced._offset_clause is not None
    assert sliced._limit_clause is not None


@pytest.mark.asyncio
async def test_paginate_page_one_offset_is_zero():
    db = _FakeDB(total=5)
    stmt = select(User)

    sliced, _ = await paginate(db, stmt, page=1, size=20)

    compiled = str(sliced.compile(compile_kwargs={"literal_binds": True}))
    assert "OFFSET 0" in compiled
    assert "LIMIT 20" in compiled


@pytest.mark.asyncio
async def test_paginate_offset_scales_with_page():
    db = _FakeDB(total=100)
    stmt = select(User)

    sliced, _ = await paginate(db, stmt, page=3, size=10)

    compiled = str(sliced.compile(compile_kwargs={"literal_binds": True}))
    assert "OFFSET 20" in compiled
