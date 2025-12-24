BEGIN;

-- Create combo_details view for backward compatibility and easier queries
CREATE OR REPLACE VIEW combo_details AS
SELECT 
    c.combo_id,
    c.name,
    c.slug,
    c.attraction_ids,
    c.attraction_prices,
    c.total_price,
    c.image_url,
    c.discount_percent,
    c.active,
    c.create_slots,
    c.meta_title,
    c.created_at,
    c.updated_at,
    -- Legacy fields for backward compatibility
    c.attraction_1_id,
    c.attraction_2_id,
    c.combo_price,
    -- Get attraction details using existing combo_attractions table structure
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
GROUP BY c.combo_id, c.name, c.slug, c.attraction_ids, c.attraction_prices, c.total_price, 
         c.image_url, c.discount_percent, c.active, c.create_slots, c.meta_title, c.created_at, c.updated_at,
         c.attraction_1_id, c.attraction_2_id, c.combo_price;

COMMIT;
