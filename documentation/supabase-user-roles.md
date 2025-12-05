# Assigning User Roles in Supabase

## Problem
Users created via magic link don't have a `role` assigned in their `user_metadata`, which causes the role-based redirect to fail.

## Solution

You need to assign roles to users in the Supabase database. There are two approaches:

### Option 1: Update via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Find your user (test.dev.g6@gmail.com)
4. Click on the user to edit
5. In the **User Metadata** section, add:
   ```json
   {
     "role": "user"
   }
   ```
   Or for admin:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save the changes

### Option 2: Update via SQL

Run this SQL in the Supabase SQL Editor:

```sql
-- Update user metadata to add role
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "user"}'::jsonb
WHERE email = 'test.dev.g6@gmail.com';
```

For admin role:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'test.dev.g6@gmail.com';
```

For super_admin role:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'test.dev.g6@gmail.com';
```

### Option 3: Set Default Role on Signup

To automatically assign roles to new users, create a database trigger:

```sql
-- Function to set default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default role to 'user' if not already set
  IF NEW.raw_user_meta_data->>'role' IS NULL THEN
    NEW.raw_user_meta_data = NEW.raw_user_meta_data || '{"role": "user"}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Verification

After assigning the role, you can verify it by:

1. Logging out completely
2. Requesting a new magic link
3. Clicking the magic link
4. Checking the browser console for the JWT token - it should now contain `"user_metadata":{"role":"user"}`

## Role Values

Valid role values are:
- `user` - Regular user (redirects to `/dashboard`)
- `admin` - Administrator (redirects to `/admin`)
- `super_admin` - Super administrator (redirects to `/admin` with full access)
