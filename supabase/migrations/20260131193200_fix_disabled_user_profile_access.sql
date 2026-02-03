-- Migration: Fix Disabled User Profile Access
-- Description: Allow users to always read their OWN profile even when disabled.
--              This fixes the redirect loop where disabled users couldn't see /account-disabled
--              because they couldn't fetch their own profile to know they're disabled.

-- Drop existing policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Create fixed policy: users can always read their own profile, 
-- but need is_enabled() to read others' profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR is_enabled());

-- Note: This change ensures:
-- 1. Disabled users can read their OWN profile → get isEnabled=false → redirect to /account-disabled
-- 2. Disabled users cannot read OTHER users' profiles (security preserved)
-- 3. Enabled users can read all profiles (existing behavior preserved)
