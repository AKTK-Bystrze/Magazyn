-- Seed file for test data
-- This creates test users that integration tests can use
-- Run: npx supabase db seed

-- Create test user 1
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
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
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'testuser1@example.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, username, role, credit_balance, is_enabled)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'testuser1@example.com',
  'testuser1',
  'user',
  100000,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create test user 2  
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
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
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'testuser2@example.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, username, role, credit_balance, is_enabled)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'testuser2@example.com',
  'testuser2',
  'admin',
  100000,
  true
) ON CONFLICT (id) DO NOTHING;
