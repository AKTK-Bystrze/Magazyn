-- Migration: Add user enabled flag
-- Description: Adds is_enabled column to profiles table to control user access
-- New users are disabled by default and must be enabled by SuperAdmin
-- Created: 2025-12-05

-- Add is_enabled column to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to be enabled (backward compatibility)
UPDATE public.profiles
SET is_enabled = true;

-- Add index for filtering enabled users
CREATE INDEX profiles_is_enabled_idx ON public.profiles (is_enabled);

-- Update handle_new_user function to create disabled users by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_enabled IS 
  'Controls whether user can access the application. New users are disabled by default and must be enabled by SuperAdmin.';

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a disabled profile for new users. SuperAdmin must enable users before they can access the application.';
