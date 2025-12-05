-- Migration: Set default user role on signup
-- Description: Automatically assigns 'user' role to new users if no role is specified
-- Created: 2025-12-05

-- Function to set default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Create trigger to run before user insertion
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing users without a role to have 'user' role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb
WHERE raw_user_meta_data IS NULL 
   OR raw_user_meta_data->>'role' IS NULL;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically assigns default role (user) to new users during signup if no role is specified in user_metadata';
