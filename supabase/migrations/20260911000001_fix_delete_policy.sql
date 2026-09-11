-- Properly set search_path for SECURITY DEFINER function to ensure auth.uid() resolves
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Also update the delete policy just to be 100% sure it's correct
DROP POLICY IF EXISTS "Maintenance requests can be deleted by admin, super_admin" ON maintenance_requests;
CREATE POLICY "Maintenance requests can be deleted by admin, super_admin"
ON maintenance_requests FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
