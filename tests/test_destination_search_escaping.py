"""MED-02 — DestinationRepository.search()/semantic_search() used to build
ilike() patterns straight from unescaped user input (q, city, cities),
reachable from the public GET /destinations endpoint and AI chat's location
search. Verifies escape_like() is actually applied to the compiled SQL."""
import pytest

from src.repositories.destination_repo import DestinationRepository


class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _FakeResult:
    def __init__(self, items=None, scalar_value=0):
        self._items = items or []
        self._scalar_value = scalar_value

    def scalar(self):
        return self._scalar_value

    def scalars(self):
        return _FakeScalars(self._items)


class _FakeDB:
    def __init__(self):
        self.compiled_statements: list[str] = []

    async def execute(self, stmt):
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        self.compiled_statements.append(compiled)
        return _FakeResult()


@pytest.mark.asyncio
async def test_search_escapes_like_wildcards_in_q():
    db = _FakeDB()
    repo = DestinationRepository(db)
    await repo.search(q="100%off_deal")

    assert any("100\\%off\\_deal" in stmt for stmt in db.compiled_statements)


@pytest.mark.asyncio
async def test_search_escapes_like_wildcards_in_city():
    db = _FakeDB()
    repo = DestinationRepository(db)
    await repo.search(city="den_pasar")

    assert any("den\\_pasar" in stmt for stmt in db.compiled_statements)


@pytest.mark.asyncio
async def test_search_escapes_like_wildcards_in_cities():
    db = _FakeDB()
    repo = DestinationRepository(db)
    await repo.search(cities=["bal%i"])

    assert any("bal\\%i" in stmt for stmt in db.compiled_statements)
