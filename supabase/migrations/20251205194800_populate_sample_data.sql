-- Migration: Populate Sample Data
-- Description: Populates the database with sample equipment and creates super admin user
-- Created: 2025-12-05

-- Note: This migration assumes the user role migration has been applied

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

-- 3. Create Super Admin User in auth.users
-- Note: This creates a user entry that can be used with magic link authentication
-- The user will need to request a magic link to set up their session

DO $$
DECLARE
  super_admin_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO super_admin_id
  FROM auth.users
  WHERE email = 'appbystrze@gmail.com';

  -- If user doesn't exist, create them
  IF super_admin_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'appbystrze@gmail.com',
      crypt('', gen_salt('bf')), -- No password, will use magic link
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"role": "super_admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO super_admin_id;

    -- The profile will be created automatically by the handle_new_user trigger
    -- But we need to update the role to super_admin
    UPDATE profiles
    SET role = 'super_admin',
        credit_balance = 1000
    WHERE id = super_admin_id;

    RAISE NOTICE 'Super admin user created: appbystrze@gmail.com';
  ELSE
    -- User exists, just update their role and metadata
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
    WHERE id = super_admin_id;

    UPDATE profiles
    SET role = 'super_admin',
        credit_balance = 1000
    WHERE id = super_admin_id;

    RAISE NOTICE 'Super admin user already exists, updated role: appbystrze@gmail.com';
  END IF;
END $$;

-- 4. Add some comments for documentation
COMMENT ON TABLE equipment_types IS 'Equipment categories with standardized daily rental costs in credits';
COMMENT ON TABLE equipment IS 'Individual physical items available for rent, identified by internal_id';
