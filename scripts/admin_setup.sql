-- Poca admin setup — idempotent. Run once after starting db container.
--   docker compose exec -T db psql -U tourism -d tourism < scripts/admin_setup.sql
-- Or from host (pg on :5433):
--   PGPASSWORD=tourism psql -h localhost -p 5433 -U tourism -d tourism -f scripts/admin_setup.sql

-- 1. user role + active flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. page_views traffic table
CREATE TABLE IF NOT EXISTS page_views (
    id         UUID PRIMARY KEY,
    path       VARCHAR(500) NOT NULL,
    user_id    UUID,
    ip         VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_page_views_path       ON page_views (path);
CREATE INDEX IF NOT EXISTS ix_page_views_user_id    ON page_views (user_id);
CREATE INDEX IF NOT EXISTS ix_page_views_created_at ON page_views (created_at);

-- 3. promote the demo account (and any account you wish) to admin
UPDATE users SET role = 'admin' WHERE email = 'demo@poca.app';
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@here';

-- sanity check
SELECT id, email, username, role, is_active FROM users WHERE role = 'admin';
