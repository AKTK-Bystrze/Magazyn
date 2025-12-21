-- Migration: Rename admin_id to author_id in credit_history
-- Description: Simple column rename to clarify the field tracks who performed the action.

-- Rename the column
ALTER TABLE credit_history RENAME COLUMN admin_id TO author_id;
