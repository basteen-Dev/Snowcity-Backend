-- Migration: Add Buy X Get Y Offer Support
-- Description: Adds columns to offer_rules table and updates offer_rule_type enum
-- Created: 2025-12-12
-- Author: SnowCity Dev

-- Step 1: Add 'buy_x_get_y' to the offer_rule_type ENUM
-- Note: In PostgreSQL, you cannot directly ALTER an ENUM, so we rename the old type and create a new one

ALTER TYPE public.offer_rule_type RENAME TO offer_rule_type_old;

CREATE TYPE public.offer_rule_type AS ENUM (
    'holiday',
    'happy_hour',
    'weekday_special',
    'dynamic_pricing',
    'date_slot_pricing',
    'buy_x_get_y'
);

-- Update the offers table to use the new enum type
ALTER TABLE public.offers
    ALTER COLUMN rule_type TYPE public.offer_rule_type USING rule_type::text::public.offer_rule_type;

-- Drop the old enum type
DROP TYPE public.offer_rule_type_old;

-- Step 2: Add Buy X Get Y columns to offer_rules table
-- These columns store the "get" side of the buy_x_get_y promotion

ALTER TABLE public.offer_rules
    ADD COLUMN IF NOT EXISTS buy_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_target_type character varying(32) DEFAULT 'attraction',
    ADD COLUMN IF NOT EXISTS get_target_id integer,
    ADD COLUMN IF NOT EXISTS get_discount_type character varying(20),
    ADD COLUMN IF NOT EXISTS get_discount_value numeric(10,2);

-- Step 3: Add check constraints for the new columns
ALTER TABLE public.offer_rules
    ADD CONSTRAINT offer_rules_buy_qty_check CHECK ((buy_qty >= 1)),
    ADD CONSTRAINT offer_rules_get_qty_check CHECK ((get_qty >= 1)),
    ADD CONSTRAINT offer_rules_get_target_type_check CHECK ((get_target_type::text = ANY (ARRAY['attraction'::character varying, 'combo'::character varying]::text[]))),
    ADD CONSTRAINT offer_rules_get_discount_type_check CHECK ((get_discount_type IS NULL OR get_discount_type::text = ANY (ARRAY['percent'::character varying, 'amount'::character varying]::text[])));

-- Step 4: Add comments documenting the new columns
COMMENT ON COLUMN public.offer_rules.buy_qty IS 'Quantity to buy (X in "Buy X Get Y")';
COMMENT ON COLUMN public.offer_rules.get_qty IS 'Quantity to get (Y in "Buy X Get Y")';
COMMENT ON COLUMN public.offer_rules.get_target_type IS 'Type of item to get: attraction or combo';
COMMENT ON COLUMN public.offer_rules.get_target_id IS 'ID of specific attraction or combo to get; NULL means applies to all of get_target_type';
COMMENT ON COLUMN public.offer_rules.get_discount_type IS 'Discount type on the "get" items: percent, amount, or NULL for free';
COMMENT ON COLUMN public.offer_rules.get_discount_value IS 'Discount value (percentage or amount) applied to "get" items';

-- Step 5: Create a view or helper for displaying offer summaries (optional, for reporting)
-- This view makes it easy for the API to fetch offer details with formatted summaries
CREATE OR REPLACE VIEW offer_summary AS
SELECT
    o.offer_id,
    o.title,
    o.description,
    o.image_url,
    o.rule_type,
    o.discount_type,
    o.discount_value,
    o.valid_from,
    o.valid_to,
    o.active,
    COUNT(r.rule_id) as rule_count,
    MAX(r.created_at) as last_updated
FROM public.offers o
LEFT JOIN public.offer_rules r ON o.offer_id = r.offer_id
GROUP BY
    o.offer_id,
    o.title,
    o.description,
    o.image_url,
    o.rule_type,
    o.discount_type,
    o.discount_value,
    o.valid_from,
    o.valid_to,
    o.active;

-- Step 6: Verify the schema changes (informational, will not execute in migration)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'offer_rules' AND column_name IN (
--     'buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value'
-- );
