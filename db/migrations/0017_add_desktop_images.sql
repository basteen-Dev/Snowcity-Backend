BEGIN;

-- Add desktop image column for attractions (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'attractions'
          AND column_name = 'desktop_image_url'
    ) THEN
        ALTER TABLE attractions
            ADD COLUMN desktop_image_url VARCHAR(255);
    END IF;
END $$;

-- Add desktop image column for combos (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'combos'
          AND column_name = 'desktop_image_url'
    ) THEN
        ALTER TABLE combos
            ADD COLUMN desktop_image_url VARCHAR(255);
    END IF;
END $$;

COMMIT;

-- Refresh combo_details view to expose desktop images
BEGIN;

DROP VIEW IF EXISTS combo_details;

CREATE OR REPLACE VIEW combo_details AS
SELECT 
    c.combo_id,
    c.name,
    c.attraction_ids,
    c.attraction_prices,
    c.total_price,
    c.image_url,
    c.desktop_image_url,
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
                'desktop_image_url', a.desktop_image_url,
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
         c.image_url, c.desktop_image_url, c.discount_percent, c.active, c.create_slots, c.created_at, c.updated_at,
         c.attraction_1_id, c.attraction_2_id, c.combo_price;

COMMIT;
