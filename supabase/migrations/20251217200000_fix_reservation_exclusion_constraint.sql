-- Migration: Fix Reservation Exclusion Constraint
-- Description: Updates the exclusion constraint on the reservations table to ignore CANCELLED and DENIED reservations.
-- This allows re-booking of slots that were previously cancelled or denied.

-- Drop the existing constraint
-- Note: The name 'reservations_equipment_id_daterange_excl' comes from the error log. 
-- We try to drop by finding the name or generic pattern if possible, but identifying by name is standard.
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_equipment_id_daterange_excl;

-- Also try to drop the constraint if it was named differently in some environments (e.g. implicitly named)
-- Use a DO block to find and drop it if checking strictly by columns is needed, 
-- but explicitly dropping the known name from logs is safest first.

-- Re-create the constraint with the WHERE clause
ALTER TABLE reservations
ADD CONSTRAINT reservations_equipment_id_overlap_excl
EXCLUDE USING gist (
  equipment_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('PENDING', 'RENTED'));
