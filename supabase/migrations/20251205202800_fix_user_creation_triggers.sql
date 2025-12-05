-- Migration: Fix user creation triggers
-- Description: Separates role metadata setting from profile creation
-- This fixes the foreign key constraint violation error
-- Created: 2025-12-05

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function 1: Set default role metadata (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.set_user_role_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set default role to 'user' if not already set in user_metadata
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function 2: Create user profile (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user with is_enabled = false by default
  INSERT INTO public.profiles (id, email, username, role, is_enabled)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    false  -- New users are disabled by default
  );
  RETURN NEW;
END;
$$;

-- Trigger 1: Set role metadata BEFORE user is created
CREATE TRIGGER set_user_role_metadata_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_role_metadata();

-- Trigger 2: Create profile AFTER user is created
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- Add comments for documentation
COMMENT ON FUNCTION public.set_user_role_metadata() IS 
  'Sets default role metadata for new users before they are created in auth.users';

COMMENT ON FUNCTION public.create_user_profile() IS 
  'Creates a disabled profile for new users after they are created in auth.users. SuperAdmin must enable users before they can access the application.';
