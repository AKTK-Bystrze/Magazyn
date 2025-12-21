-- Migration: Refine Reservation Exclusion Constraint
-- Description: Updates the exclusion constraint to strictly check PENDING and RENTED statuses.
-- This fixes the issue where RETURNED reservations were also blocking new reservations.

-- Drop the constraint created in the previous step
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_equipment_id_overlap_excl;

-- Also try to drop the original one just in case 
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_equipment_id_daterange_excl;


-- Re-create the constraint with stricter WHERE clause
ALTER TABLE reservations
ADD CONSTRAINT reservations_equipment_id_overlap_v2_excl
EXCLUDE USING gist (
  equipment_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('PENDING', 'RENTED'));
