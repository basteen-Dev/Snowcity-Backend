BEGIN;

-- Add missing columns to combos table (idempotent)
DO $$
BEGIN
    -- Check and add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'name') THEN
        ALTER TABLE combos ADD COLUMN name VARCHAR(200) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'attraction_ids') THEN
        ALTER TABLE combos ADD COLUMN attraction_ids BIGINT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'attraction_prices') THEN
        ALTER TABLE combos ADD COLUMN attraction_prices JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'total_price') THEN
        ALTER TABLE combos ADD COLUMN total_price NUMERIC(10,2) DEFAULT 0 CHECK (total_price >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'image_url') THEN
        ALTER TABLE combos ADD COLUMN image_url VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'combos' AND column_name = 'create_slots') THEN
        ALTER TABLE combos ADD COLUMN create_slots BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Make old columns nullable for backward compatibility
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'combos' AND column_name = 'attraction_1_id' AND is_nullable = 'NO') THEN
        ALTER TABLE combos ALTER COLUMN attraction_1_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'combos' AND column_name = 'attraction_2_id' AND is_nullable = 'NO') THEN
        ALTER TABLE combos ALTER COLUMN attraction_2_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'combos' AND column_name = 'combo_price' AND is_nullable = 'NO') THEN
        ALTER TABLE combos ALTER COLUMN combo_price DROP NOT NULL;
    END IF;
END $$;

-- Drop old constraints that are no longer needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_combo_pair') THEN
        ALTER TABLE combos DROP CONSTRAINT chk_combo_pair;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_combo_pair') THEN
        ALTER TABLE combos DROP CONSTRAINT uq_combo_pair;
    END IF;
END $$;

-- Add new constraint for minimum attractions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_min_attractions') THEN
        ALTER TABLE combos ADD CONSTRAINT chk_min_attractions 
        CHECK (array_length(attraction_ids, 1) IS NULL OR array_length(attraction_ids, 1) >= 2);
    END IF;
END $$;

-- Create or replace combo_details view
DROP VIEW IF EXISTS combo_details;

CREATE OR REPLACE VIEW combo_details AS
SELECT 
    c.combo_id,
    c.name,
    c.attraction_ids,
    c.attraction_prices,
    c.total_price,
    c.image_url,
    c.discount_percent,
    c.active,
    c.create_slots,
    c.created_at,
    c.updated_at,
    -- Legacy fields for backward compatibility
    c.attraction_1_id,
    c.attraction_2_id,
    c.combo_price,
    -- Get attraction details from combo_attractions
    COALESCE(
        json_agg(
            json_build_object(
                'attraction_id', ca.attraction_id,
                'title', a.title,
                'price', ca.attraction_price,
                'image_url', a.image_url,
                'slug', a.slug,
                'position_in_combo', ca.position_in_combo
            )
        ) FILTER (WHERE ca.attraction_id IS NOT NULL), 
        '[]'::json
    ) as attractions
FROM combos c
LEFT JOIN combo_attractions ca ON c.combo_id = ca.combo_id
LEFT JOIN attractions a ON ca.attraction_id = a.attraction_id
GROUP BY c.combo_id, c.name, c.attraction_ids, c.attraction_prices, c.total_price, 
         c.image_url, c.discount_percent, c.active, c.create_slots, c.created_at, c.updated_at,
         c.attraction_1_id, c.attraction_2_id, c.combo_price;

COMMIT;
