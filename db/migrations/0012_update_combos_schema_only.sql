BEGIN;

-- Add new columns to combos table to support multiple attractions and new features
ALTER TABLE combos ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE combos ADD COLUMN IF NOT EXISTS attraction_ids BIGINT[] DEFAULT '{}';
ALTER TABLE combos ADD COLUMN IF NOT EXISTS attraction_prices JSONB DEFAULT '{}'::jsonb;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0 CHECK (total_price >= 0);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
ALTER TABLE combos ADD COLUMN IF NOT EXISTS create_slots BOOLEAN DEFAULT TRUE;

-- Make old columns nullable for backward compatibility
ALTER TABLE combos ALTER COLUMN attraction_1_id DROP NOT NULL;
ALTER TABLE combos ALTER COLUMN attraction_2_id DROP NOT NULL;
ALTER TABLE combos ALTER COLUMN combo_price DROP NOT NULL;

-- Drop old constraints that are no longer needed
ALTER TABLE combos DROP CONSTRAINT IF EXISTS chk_combo_pair;
ALTER TABLE combos DROP CONSTRAINT IF EXISTS uq_combo_pair;

-- Add constraint to ensure at least 2 attractions for new combos
ALTER TABLE combos ADD CONSTRAINT IF NOT EXISTS chk_min_attractions 
CHECK (array_length(attraction_ids, 1) IS NULL OR array_length(attraction_ids, 1) >= 2);

COMMIT;
