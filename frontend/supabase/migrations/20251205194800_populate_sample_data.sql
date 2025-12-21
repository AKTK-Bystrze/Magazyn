-- Migration: Populate Sample Data
-- Description: Populates the database with sample equipment
-- Created: 2025-12-05
-- Note: Super admin user must be created via magic link authentication

-- 1. Insert Equipment Types
-- Map old types to new equipment_types table
INSERT INTO equipment_types (name, credit_cost_per_day) VALUES
  ('kayak', 4),
  ('paddle', 2)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Equipment Items
-- Map old items table to new equipment table
WITH kayak_type AS (
  SELECT id FROM equipment_types WHERE name = 'kayak'
),
paddle_type AS (
  SELECT id FROM equipment_types WHERE name = 'paddle'
)
INSERT INTO equipment (internal_id, type_id, name, description, status) VALUES
  -- Kayaks
  ('B102', (SELECT id FROM kayak_type), 'Perception MrClean', 'Playboat - pomarańczowy', 'ok'),
  ('B18', (SELECT id FROM kayak_type), 'Blisstick MiniMistick', 'Creek - żółty', 'ok'),
  ('B21', (SELECT id FROM kayak_type), 'Necky Witch', 'Playboat - żółto-szary', 'ok'),
  ('B3', (SELECT id FROM kayak_type), 'Jackson All Star', 'Freestyle - czerwony', 'ok'),
  ('B1', (SELECT id FROM kayak_type), 'Outlaw Riverrunner', 'żółto-pomarańczowy', 'broken'),
  
  -- Paddles
  ('W11', (SELECT id FROM paddle_type), 'DrKajak żółte', 'symetryczne', 'ok'),
  ('W15', (SELECT id FROM paddle_type), 'DrKajak Czerwone', 'symetryczne', 'ok'),
  ('W13', (SELECT id FROM paddle_type), 'DrKajak żółte', 'niesymetryczne', 'broken'),
  ('NW113', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW114', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW115', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW116', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW117', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW118', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok'),
  ('NW119', (SELECT id FROM paddle_type), 'Rapa nizinna', 'zielona', 'ok')
ON CONFLICT (type_id, internal_id) DO NOTHING;

-- 3. Update Super Admin User (if exists)
-- Note: User must first sign up via magic link at the login page
-- After signing up, run this to upgrade them to super_admin:

DO $$
DECLARE
  super_admin_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO super_admin_id
  FROM auth.users
  WHERE email = 'appbystrze@gmail.com';

  IF super_admin_id IS NOT NULL THEN
    -- User exists, update their role and metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb
    WHERE id = super_admin_id;

    UPDATE profiles
    SET role = 'super_admin',
        credit_balance = 1000
    WHERE id = super_admin_id;

    RAISE NOTICE 'Super admin role assigned to: appbystrze@gmail.com';
  ELSE
    RAISE NOTICE 'User appbystrze@gmail.com not found. Please sign up via magic link first, then re-run this migration.';
  END IF;
END $$;

-- 4. Add some comments for documentation
COMMENT ON TABLE equipment_types IS 'Equipment categories with standardized daily rental costs in credits';
COMMENT ON TABLE equipment IS 'Individual physical items available for rent, identified by internal_id';

-- 5. Instructions for creating super admin
-- To create the super admin user:
-- 1. Go to your login page: http://localhost:4321/login
-- 2. Enter email: appbystrze@gmail.com
-- 3. Click the magic link in your email
-- 4. Re-run this migration to assign super_admin role
-- OR manually run:
--   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb WHERE email = 'appbystrze@gmail.com';
--   UPDATE profiles SET role = 'super_admin', credit_balance = 1000 WHERE email = 'appbystrze@gmail.com';
