-- Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can modify pending reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view their own reservations or admins see all" ON public.reservations;
DROP POLICY IF EXISTS "Users can modify their pending reservations or admins modify all" ON public.reservations;
DROP POLICY IF EXISTS "Admins can insert any reservation" ON public.reservations;

-- Create new policies with admin access for reservations
CREATE POLICY "Users can view their own reservations or admins see all"
ON public.reservations FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Users can modify their pending reservations or admins modify all"
ON public.reservations FOR UPDATE
USING (
  (auth.uid() = user_id AND status = 'PENDING')
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert any reservation"
ON public.reservations FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Equipment Table RLS
DROP POLICY IF EXISTS "All authenticated users can view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins can modify equipment" ON public.equipment;

CREATE POLICY "All authenticated users can view equipment"
ON public.equipment FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can modify equipment"
ON public.equipment FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Profiles Table RLS
DROP POLICY IF EXISTS "Users can view their own profile or admins see all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins see all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
