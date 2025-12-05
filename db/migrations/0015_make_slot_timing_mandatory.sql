-- Migration: Make slot timing mandatory in bookings table
-- Purpose: Ensure slot_start_time and slot_end_time are always stored for accurate timing display

-- Start transaction
BEGIN;

-- First, update any existing records that have null slot times
-- Use booking_time if available, otherwise set default values
UPDATE bookings 
SET 
    slot_start_time = COALESCE(
        slot_start_time, 
        CASE 
            WHEN booking_time IS NOT NULL AND booking_time != '' THEN booking_time
            ELSE '10:00:00'
        END
    ),
    slot_end_time = COALESCE(
        slot_end_time,
        CASE 
            WHEN booking_time IS NOT NULL AND booking_time != '' THEN 
                (SELECT to_char(
                    (to_date(booking_time, 'HH24:MI:SS') + interval '1 hour'), 
                    'HH24:MI:SS'
                ))
            ELSE '11:00:00'
        END
    )
WHERE slot_start_time IS NULL OR slot_end_time IS NULL;

-- Add constraints to make slot timing mandatory
ALTER TABLE bookings 
ADD CONSTRAINT bookings_slot_start_time_not_null 
CHECK (slot_start_time IS NOT NULL AND slot_start_time != '');

ALTER TABLE bookings 
ADD CONSTRAINT bookings_slot_end_time_not_null 
CHECK (slot_end_time IS NOT NULL AND slot_end_time != '');

-- Add check constraint to ensure end_time is after start_time
ALTER TABLE bookings 
ADD CONSTRAINT bookings_slot_time_valid_range 
CHECK (slot_end_time > slot_start_time);

-- Add comment to document the mandatory nature of slot timing
COMMENT ON COLUMN bookings.slot_start_time IS 'Mandatory: Start time of the booked slot (format: HH24:MI:SS)';
COMMENT ON COLUMN bookings.slot_end_time IS 'Mandatory: End time of the booked slot (format: HH24:MI:SS)';

-- Log the migration
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES (
    '0015', 
    'Make slot_start_time and slot_end_time mandatory in bookings table',
    NOW()
) ON CONFLICT (version) DO NOTHING;

-- Commit transaction
COMMIT;

-- Verify the changes
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN slot_start_time IS NOT NULL THEN 1 END) as bookings_with_start_time,
    COUNT(CASE WHEN slot_end_time IS NOT NULL THEN 1 END) as bookings_with_end_time,
    COUNT(CASE WHEN slot_start_time IS NOT NULL AND slot_end_time IS NOT NULL THEN 1 END) as bookings_with_complete_timing
FROM bookings;

-- Show sample of updated records
SELECT 
    booking_id,
    booking_ref,
    slot_start_time,
    slot_end_time,
    booking_time,
    item_type
FROM bookings 
ORDER BY booking_id DESC 
LIMIT 5;
