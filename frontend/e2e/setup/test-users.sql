-- E2E Test Users Setup Script
-- Run this in Supabase SQL Editor to ensure all test users are properly configured
-- This script is idempotent and safe to run multiple times

-- =====================================================================
-- 1. PRIMARY TEST USER (test.dev.g6@gmail.com)
-- =====================================================================
-- Ensure primary test user has correct profile
INSERT INTO profiles (id, email, role, is_enabled, username, credit_balance)
SELECT 
    id, 
    email, 
    'user' as role, 
    true as is_enabled, 
    'e2e-tester' as username, 
    100 as credit_balance
FROM auth.users 
WHERE email = 'test.dev.g6@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'user',
    is_enabled = true,
    credit_balance = GREATEST(profiles.credit_balance, 100);

-- =====================================================================
-- 2. ADMIN TEST USER (test.admin.g6@gmail.com)
-- =====================================================================
-- Ensure admin test user has correct profile
INSERT INTO profiles (id, email, role, is_enabled, username, credit_balance)
SELECT 
    id, 
    email, 
    'admin' as role, 
    true as is_enabled, 
    'e2e-admin' as username, 
    100 as credit_balance
FROM auth.users 
WHERE email = 'test.admin.g6@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    is_enabled = true;

-- =====================================================================
-- 3. SUPER ADMIN TEST USER (test.superadmin.g6@gmail.com) - REQUIRED
-- =====================================================================
-- Ensure super admin test user has correct profile
-- This user is REQUIRED for admin panel E2E tests
INSERT INTO profiles (id, email, role, is_enabled, username, credit_balance)
SELECT 
    id, 
    email, 
    'super_admin' as role, 
    true as is_enabled, 
    'e2e-super-admin' as username, 
    100 as credit_balance
FROM auth.users 
WHERE email = 'test.superadmin.g6@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role = 'super_admin',
    is_enabled = true;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
-- Run these to verify all test users are set up correctly

-- Check if all test users exist and have correct roles
SELECT 
    email,
    username,
    role,
    is_enabled,
    credit_balance,
    created_at
FROM profiles
WHERE email IN (
    'test.dev.g6@gmail.com',
    'test.admin.g6@gmail.com',
    'test.superadmin.g6@gmail.com'
)
ORDER BY 
    CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'user' THEN 3
    END;

-- =====================================================================
-- IMPORTANT NOTES
-- =====================================================================
-- 1. These users MUST exist in auth.users FIRST (create via Supabase Auth)
-- 2. All users must have email_confirmed = true
-- 3. Password for all users (from E2E_CONFIG): TestSecurePassword123!
-- 4. If any user is missing from the verification query results:
--    a. Create the user in Supabase Auth UI or via admin API
--    b. Confirm their email
--    c. Re-run this script
