-- Create test users for integration tests
-- Run this after database reset to populate test data

-- First, create test users in auth.users (Supabase auth table)
-- Note: In local Supabase, you can create users directly

-- Create User 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'testuser1@example.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', -- dummy hash
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create User 2  
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'testuser2@example.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', -- dummy hash
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create profiles for these users
INSERT INTO profiles (id, email, username, role, credit_balance, is_enabled)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'testuser1@example.com',
  'testuser1',
  'user',
  100000,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, username, role, credit_balance, is_enabled)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'testuser2@example.com',
  'testuser2',
  'admin',
  100000,
  true
) ON CONFLICT (id) DO NOTHING;

SELECT 'Test users created successfully!' AS status;
