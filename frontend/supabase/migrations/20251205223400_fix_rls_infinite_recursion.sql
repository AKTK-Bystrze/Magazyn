-- Fix infinite recursion in profiles RLS policies
-- The "Admins can view all profiles" policy was querying the profiles table
-- to check user role, which caused infinite recursion.
-- Solution: Create a security definer function that bypasses RLS to get the user's role.

-- Drop the problematic policy
drop policy if exists "Admins can view all profiles" on profiles;

-- Create a security definer function to get the current user's role
-- This function bypasses RLS and directly queries the profiles table
create or replace function public.get_user_role()
returns user_role as $$
declare
  user_role_value user_role;
begin
  select role into user_role_value
  from public.profiles
  where id = auth.uid();
  
  return user_role_value;
end;
$$ language plpgsql security definer stable;

-- Recreate the policy using the security definer function
create policy "Admins can view all profiles"
  on profiles for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

-- Apply the same fix to all other policies that have this recursive pattern

-- Drop and recreate policies that check for admin role
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert equipment types" on equipment_types;
create policy "Admins can insert equipment types"
  on equipment_types for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can update equipment types" on equipment_types;
create policy "Admins can update equipment types"
  on equipment_types for update
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can delete equipment types" on equipment_types;
create policy "Admins can delete equipment types"
  on equipment_types for delete
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert equipment" on equipment;
create policy "Admins can insert equipment"
  on equipment for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can update equipment" on equipment;
create policy "Admins can update equipment"
  on equipment for update
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can delete equipment" on equipment;
create policy "Admins can delete equipment"
  on equipment for delete
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can view all reservations" on reservations;
create policy "Admins can view all reservations"
  on reservations for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert reservations" on reservations;
create policy "Admins can insert reservations"
  on reservations for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can update any reservation" on reservations;
create policy "Admins can update any reservation"
  on reservations for update
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can view all credit history" on credit_history;
create policy "Admins can view all credit history"
  on credit_history for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert credit history" on credit_history;
create policy "Admins can insert credit history"
  on credit_history for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can view all credit requests" on credit_requests;
create policy "Admins can view all credit requests"
  on credit_requests for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "SuperAdmins can update credit requests" on credit_requests;
create policy "SuperAdmins can update credit requests"
  on credit_requests for update
  using (
    public.get_user_role() = 'super_admin'
  );

drop policy if exists "Admins can view maintenance logs" on maintenance_logs;
create policy "Admins can view maintenance logs"
  on maintenance_logs for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert maintenance logs" on maintenance_logs;
create policy "Admins can insert maintenance logs"
  on maintenance_logs for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can view all reservation history" on reservation_history;
create policy "Admins can view all reservation history"
  on reservation_history for select
  using (
    public.get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "Admins can insert reservation history" on reservation_history;
create policy "Admins can insert reservation history"
  on reservation_history for insert
  with check (
    public.get_user_role() in ('admin', 'super_admin')
  );
