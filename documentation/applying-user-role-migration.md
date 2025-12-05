# Applying the User Role Migration

## Migration File
`supabase/migrations/20251205194552_set_default_user_role.sql`

## What This Migration Does

1. **Creates a trigger function** (`handle_new_user()`) that automatically assigns the `user` role to new users during signup
2. **Creates a trigger** that runs before each user insertion
3. **Updates existing users** who don't have a role assigned to have the default `user` role

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended for Remote)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gwamxxqarkcpvgzvpanc
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20251205194552_set_default_user_role.sql`
5. Click **Run** or press `Ctrl+Enter`

### Option 2: Via Supabase CLI (If using local Supabase)

```bash
# Navigate to project root
cd e:\bystrze\Magazyn

# Apply the migration
supabase db push
```

### Option 3: Manual SQL Execution

If you prefer to run it manually, execute this SQL in your Supabase SQL Editor:

```sql
-- Function to set default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing users
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "user"}'::jsonb
WHERE raw_user_meta_data IS NULL 
   OR raw_user_meta_data->>'role' IS NULL;
```

## Verification

After applying the migration:

1. **Check existing users:**
   ```sql
   SELECT email, raw_user_meta_data->>'role' as role 
   FROM auth.users;
   ```
   All users should now have a role.

2. **Test with a new user:**
   - Create a new user via magic link
   - Check their metadata - should automatically have `"role": "user"`

## Creating Admin Users

After the migration, to create admin or super_admin users, you'll need to manually update their role:

```sql
-- Make a user an admin
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';

-- Make a user a super admin
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'superadmin@example.com';
```

## Rollback (If Needed)

To remove the trigger and function:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();
```

Note: This won't remove the roles already assigned to users.
