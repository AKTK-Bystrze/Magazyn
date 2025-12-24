-- Create a secure function to check admin status
-- SECURITY DEFINER allows this function to bypass RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ===========================
-- PROFILES RLS (Fix Recursion)
-- ===========================
DROP POLICY IF EXISTS "Users can view their own profile or admins see all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR
  is_admin()
);

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING (
  is_admin()
);


-- ===========================
-- RESERVATIONS RLS (Expand Access)
-- ===========================
DROP POLICY IF EXISTS "Users can view their own reservations or admins see all" ON public.reservations;
DROP POLICY IF EXISTS "Users can modify their pending reservations or admins modify all" ON public.reservations;
DROP POLICY IF EXISTS "Admins can insert any reservation" ON public.reservations;

-- Allow ALL authenticated users to view ALL reservations
CREATE POLICY "Authenticated users can view all reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (true);

-- Update logic remains: Users can update their own PENDING, Admins can update any
CREATE POLICY "Users modify pending or admins modify all"
ON public.reservations FOR UPDATE
USING (
  (auth.uid() = user_id AND status = 'PENDING')
  OR
  is_admin()
);

-- Insert logic remains similar
CREATE POLICY "Users insert own or admins insert any"
ON public.reservations FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  is_admin()
);

-- Delete: Admins only (explicitly adding for completeness)
CREATE POLICY "Admins can delete reservations"
ON public.reservations FOR DELETE
USING (
  is_admin()
);


-- ===========================
-- EQUIPMENT RLS (Use is_admin)
-- ===========================
DROP POLICY IF EXISTS "Admins can modify equipment" ON public.equipment;
-- "All authenticated users can view equipment" policy is already correct (USING true)

CREATE POLICY "Admins can modify equipment"
ON public.equipment FOR ALL
USING (
  is_admin()
);
