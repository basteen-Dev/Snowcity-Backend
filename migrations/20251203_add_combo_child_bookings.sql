-- Migration to support combo child bookings
BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS parent_booking_id bigint NULL,
  ADD CONSTRAINT bookings_parent_booking_id_fkey FOREIGN KEY (parent_booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_parent_booking_id ON bookings(parent_booking_id);

COMMIT;
