# Poca — Agent Rules & Conventions

## Project Overview

Poca is an AI Tourism Companion for Indonesia, built with:
- **Backend:** Python 3.12 + FastAPI (async), SQLAlchemy 2.x (asyncpg), Alembic, Redis, LiteLLM
- **Frontend:** Next.js 14 (App Router), React, TypeScript, TailwindCSS, React Query, Zustand
- **Database:** PostgreSQL 16, Redis 7
- **Deployment:** Docker Compose, Coolify

## Architecture

```
src/
├── api/v1/        # FastAPI route handlers (thin controllers)
├── core/          # Config, database, redis, dependencies
├── domain/
│   ├── models/    # SQLAlchemy ORM models
│   └── schemas/   # Pydantic schemas (request/response)
├── repositories/  # Data access layer (SQL queries)
├── services/      # Business logic layer
└── workers/       # Background task workers

frontend/src/
├── app/           # Next.js App Router pages
├── components/    # React components (layout, ui, chat, etc.)
├── hooks/         # Custom React hooks
├── lib/           # API client, queries, utilities
├── stores/        # Zustand state management
└── types/         # TypeScript type definitions
```

## Security Rules (MANDATORY)

1. **NEVER hardcode secrets** — All secrets (JWT_SECRET, API keys, DB passwords) must come from environment variables. Never use default values in source code that are predictable.
2. **Always use Pydantic schemas** for request validation — Never accept `body: dict` in endpoints. Create proper Pydantic models.
3. **Always escape LIKE wildcards** — When using `ilike()` or `like()` in SQLAlchemy, always escape `%` and `_` characters from user input.
4. **Always require authentication** on state-changing endpoints — Use `require_user` or `require_admin` from `src.api.deps`.
5. **Never allow SVG uploads** — SVG files can contain JavaScript (Stored XSS). Remove `image/svg+xml` from all allowed MIME sets.
6. **Validate file paths** — Always sanitize `destination_id` and file extensions in upload endpoints. Use UUID validation and `os.path.basename()`.
7. **CORS must be specific** — Never use `CORS_ORIGINS=*`. Always set to specific domain(s).
8. **Rate limit sensitive endpoints** — Login, register, AI chat, and analytics endpoints must have rate limiting.
9. **Sanitize user-generated content** — All post/comment content must be HTML-sanitized before storage using `nh3` or `bleach`.

## Code Quality Rules

1. **Use `datetime.now(timezone.utc)`** — `datetime.utcnow()` is deprecated since Python 3.12. Always use timezone-aware datetime.
2. **Imports at top-level** — Do not import modules inside functions unless there's a circular dependency reason.
3. **No double commits** — The `get_db()` dependency auto-commits. Do not call `db.commit()` inside endpoint handlers unless you've removed auto-commit.
4. **Consistent error messages** — Use English for all API error messages. Indonesian text is for UI only.
5. **Type safety in TypeScript** — Avoid `any` type. Define proper interfaces for all API responses.
6. **Route ordering matters** — In FastAPI, specific routes (e.g., `/categories/all`) must be defined BEFORE parametric routes (e.g., `/{dest_id}`).

## Testing Rules

1. All new endpoints must include at least one integration test.
2. All new services must include unit tests.
3. Run `pytest` before committing to verify no regressions.

## Frontend Accessibility Rules

1. **Never disable zoom** — `userScalable` must be `true` (WCAG 2.1 AA).
2. **Focus indicators** — Use `:focus-visible` for keyboard navigation outlines.
3. **Block scroll when modals open** — Use `document.body.style.overflow = 'hidden'`.
4. **Informative alt text** — Image alt text must describe the content, not just the name.

## Docker & Deployment Rules

1. **Non-root containers** — Always use a non-root `USER` in Dockerfiles.
2. **Pin dependency versions** — Use exact versions in `requirements.txt` (e.g., `fastapi==0.115.0`).
3. **Port consistency** — Backend runs on `8008`. Frontend `.env.local` must match.
