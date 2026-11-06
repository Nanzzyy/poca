from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def paginate(db: AsyncSession, stmt, page: int, size: int):
    """Count `stmt`'s results, then return (stmt sliced to the page, total).

    `stmt` should already have filtering/ordering applied — this only adds
    the count-then-offset/limit pattern that was previously hand-rolled
    independently in nearly every repository (destination, review, post,
    trip, conversation, knowledge, asset, user, analytics)."""
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    return stmt.offset((page - 1) * size).limit(size), total
