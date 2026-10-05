-- Test script to manually call bulk_update_reservations
-- Create a simple test reservation first, then try bulk update

-- Assuming you have a test user ID and equipment ID from your local database
-- Replace these with actual IDs from your database

SELECT bulk_update_reservations(
  ARRAY['some-uuid-here']::UUID[],
  'DENIED',
  'admin-uuid-here'::UUID
);
