-- Migration to add weekday/weekend/holiday pricing support
BEGIN;

-- First, alter the enum type to add new values
ALTER TYPE public.offer_rule_type ADD VALUE 'dynamic_pricing';
ALTER TYPE public.offer_rule_type ADD VALUE 'date_slot_pricing';

-- Add new columns to offer_rules table for day-based pricing
ALTER TABLE offer_rules
  ADD COLUMN IF NOT EXISTS day_type varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS specific_days integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_holiday boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS specific_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS specific_time time DEFAULT NULL;

-- Add constraints for day_type
ALTER TABLE offer_rules
  ADD CONSTRAINT offer_rules_day_type_check 
    CHECK (day_type IS NULL OR day_type IN ('weekday', 'weekend', 'holiday', 'custom'));

-- Add comments for documentation
COMMENT ON COLUMN offer_rules.day_type IS 'Type of day pricing: weekday, weekend, holiday, or custom';
COMMENT ON COLUMN offer_rules.specific_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) for custom day selection';
COMMENT ON COLUMN offer_rules.is_holiday IS 'Flag to indicate if this rule applies to holidays only';
COMMENT ON COLUMN offer_rules.specific_date IS 'Specific date for date-slot pricing (YYYY-MM-DD)';
COMMENT ON COLUMN offer_rules.specific_time IS 'Specific time for date-slot pricing (HH:MM:SS)';

COMMIT;
