-- 7. Maintenance Requests Table
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    system_details TEXT,
    issue_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'scheduled', 'completed', 'cancelled')),
    preferred_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (since the main website will submit these)
CREATE POLICY "Maintenance requests can be submitted by anyone"
ON maintenance_requests FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to view
CREATE POLICY "Maintenance requests viewable by all authenticated users"
ON maintenance_requests FOR SELECT
TO authenticated
USING (true);

-- Allow admins/managers to update
CREATE POLICY "Maintenance requests can be updated by manager, admin, super_admin"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

-- Allow admins to delete
CREATE POLICY "Maintenance requests can be deleted by admin, super_admin"
ON maintenance_requests FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('admin', 'super_admin'));
