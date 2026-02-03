-- E2E Test Users Setup Script
--
-- PREREQUISITES: Create users in Supabase Auth (Auto Confirm enabled, pwd: TestSecurePassword123!):
-- - test.dev.g6@gmail.com
-- - test.admin.g6@gmail.com
-- - test.superadmin.g6@gmail.com
--
-- USAGE: Run in Supabase SQL Editor. Script is idempotent.
-- DESCRIPTION: Creates/updates profiles with correct roles and credits.
-- See ../docs/e2e-testing.md for details.

-- =====================================================================
-- 1. PRIMARY TEST USER (test.dev.g6@gmail.com)
-- =====================================================================
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

