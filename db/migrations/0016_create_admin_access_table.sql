BEGIN;

-- Create admin_access table if missing
CREATE TABLE IF NOT EXISTS admin_access (
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('attraction','combo','banner','page','blog','gallery')),
    resource_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_access_pk PRIMARY KEY (user_id, resource_type, resource_id)
);

-- Ensure updated_at auto-updates
CREATE OR REPLACE FUNCTION touch_admin_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_admin_access ON admin_access;
CREATE TRIGGER trg_touch_admin_access
BEFORE UPDATE ON admin_access
FOR EACH ROW
EXECUTE FUNCTION touch_admin_access_updated_at();

-- Helpful index when querying by user and type
CREATE INDEX IF NOT EXISTS idx_admin_access_user_type
    ON admin_access (user_id, resource_type);


COMMIT;
