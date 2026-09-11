-- Fix get_user_role function to use profiles table for accurate role checking
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Add address field to maintenance requests
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS address TEXT;

-- Update maintenance requests policies to ensure proper access
DROP POLICY IF EXISTS "Maintenance requests can be submitted by anyone" ON maintenance_requests;
DROP POLICY IF EXISTS "Maintenance requests can be submitted by authenticated users" ON maintenance_requests;

-- Allow anon to insert (from public website)
CREATE POLICY "Maintenance requests can be submitted by anyone"
ON maintenance_requests FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to insert (from admin dashboard)
CREATE POLICY "Maintenance requests can be submitted by authenticated users"
ON maintenance_requests FOR INSERT
TO authenticated
WITH CHECK (true);
