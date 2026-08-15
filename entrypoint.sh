#!/bin/bash
set -e
echo "=== Poca entrypoint ==="

# Run migrations (Jika gagal karena tabel sudah ada, paksa stamp ke versi terbaru)
cd /app
PYTHONPATH=. python -m alembic upgrade head || (echo "Migration failed (likely tables already exist). Stamping head..." && PYTHONPATH=. python -m alembic stamp head)

# Seed categories + destinations if DB is empty
DEST_COUNT=$(PYTHONPATH=. python -c "
from src.core.database import engine
from sqlalchemy import text
import asyncio
async def count():
    async with engine.connect() as c:
        r = await c.execute(text('SELECT count(*) FROM destinations'))
        return r.scalar()
print(asyncio.run(count()))
" 2>/dev/null || echo 0)

if [ "$DEST_COUNT" -eq 0 ] 2>/dev/null; then
    echo "=== Seeding initial data ==="
    PYTHONPATH=. python -m seed.seed_destinations
    PYTHONPATH=. python -m seed.seed_templates
else
    echo "=== DB sudah ada $DEST_COUNT destinasi, skip seed ==="
fi

echo "=== Starting uvicorn ==="
exec uvicorn src.main:app --host 0.0.0.0 --port 8008
