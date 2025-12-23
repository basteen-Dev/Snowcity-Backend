-- Add slug column to combos table (nullable, with unique constraint for non-null values)
ALTER TABLE combos ADD COLUMN IF NOT EXISTS slug CITEXT;

-- Create unique index that allows multiple NULL values but ensures uniqueness for non-null slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_combos_slug_unique ON combos(slug) WHERE slug IS NOT NULL;