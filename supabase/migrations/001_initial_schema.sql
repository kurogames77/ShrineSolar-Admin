-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set up custom claims function (if needed) to access from JWT
-- In Supabase, custom claims are in auth.jwt() -> 'app_metadata' -> 'role'

-- 1. Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'manager', 'viewer')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address_line1 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    order_category TEXT NOT NULL,
    product_details TEXT,
    size_or_qty NUMERIC,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'PHP',
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Installation Tracking Table
CREATE TABLE installation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    installation_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (installation_status IN ('scheduled', 'site_survey', 'in_progress', 'inspection', 'completed', 'on_hold')),
    scheduled_date DATE,
    completion_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Activity Log Table
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_name TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installation_tracking_updated_at BEFORE UPDATE ON installation_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'viewer' -- default role, update manually to super_admin for the first user
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate order number (SS-XXXXXX)
CREATE SEQUENCE order_number_seq START 100000;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'SS-' || nextval('order_number_seq')::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper functions for JWT claims check
-- This avoids querying the profiles table and uses the JWT token data
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.app_metadata', true)::jsonb->>'role', '')::text;
$$ LANGUAGE sql STABLE;

-- Profiles Policies
-- Users can read all profiles if they are super_admin or admin
CREATE POLICY "Profiles are viewable by super_admin and admin"
ON profiles FOR SELECT
TO authenticated
USING (public.get_user_role() IN ('super_admin', 'admin') OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
ON profiles FOR ALL
TO authenticated
USING (public.get_user_role() = 'super_admin');

-- Customers Policies
CREATE POLICY "Customers viewable by all authenticated users"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Customers can be created by manager, admin, super_admin"
ON customers FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Customers can be updated by manager, admin, super_admin"
ON customers FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Customers can be deleted by admin, super_admin"
ON customers FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Orders Policies
CREATE POLICY "Orders viewable by all authenticated users"
ON orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Orders can be created by manager, admin, super_admin"
ON orders FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Orders can be updated by manager, admin, super_admin"
ON orders FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

CREATE POLICY "Orders can be deleted by admin, super_admin"
ON orders FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('admin', 'super_admin'));

-- Installation Tracking Policies
CREATE POLICY "Installations viewable by all authenticated users"
ON installation_tracking FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Installations manageable by manager, admin, super_admin"
ON installation_tracking FOR ALL
TO authenticated
USING (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

-- Activity Log Policies
CREATE POLICY "Activity log viewable by super_admin, admin, manager"
ON activity_log FOR SELECT
TO authenticated
USING (public.get_user_role() IN ('super_admin', 'admin', 'manager'));

CREATE POLICY "Activity log insertable by all authenticated users"
ON activity_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
