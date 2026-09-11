-- Fix the UPDATE policy to use inline role check (same pattern as delete fix)
DROP POLICY IF EXISTS "Maintenance requests can be updated by manager, admin, super_admin" ON maintenance_requests;
CREATE POLICY "Maintenance requests can be updated by manager, admin, super_admin"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin', 'super_admin')
);

-- Also fix the SELECT policy to use inline check
DROP POLICY IF EXISTS "Maintenance requests viewable by all authenticated users" ON maintenance_requests;
CREATE POLICY "Maintenance requests viewable by all authenticated users"
ON maintenance_requests FOR SELECT
TO authenticated
USING (true);
