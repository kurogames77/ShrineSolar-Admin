-- Closes schema drift discovered on 2026-08-06: the `products` table and the
-- `order_images` / `product_images` / `installation_images` storage buckets
-- were created directly against the production project (dashboard or ad-hoc
-- SQL) and were never captured in a tracked migration. This file brings
-- supabase/migrations/ back in sync with what's actually running in
-- production, and tightens `products` RLS from a blanket
-- "any authenticated user, full access" policy to the same role-based model
-- used by every other table (view: all authenticated; create/update:
-- manager+; delete: admin+).
--
-- Every statement below is written to be safe to run against a database that
-- already has some or all of these objects (production does), as well as
-- against a fresh database (e.g. `supabase db reset` / a new environment).

-- 7. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products Policies
DROP POLICY IF EXISTS "Allow authenticated users full access to products" ON products;

DROP POLICY IF EXISTS "Products viewable by all authenticated users" ON products;
CREATE POLICY "Products viewable by all authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Products can be created by manager, admin, super_admin" ON products;
CREATE POLICY "Products can be created by manager, admin, super_admin"
ON products FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "Products can be updated by manager, admin, super_admin" ON products;
CREATE POLICY "Products can be updated by manager, admin, super_admin"
ON products FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('manager', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "Products can be deleted by admin, super_admin" ON products;
CREATE POLICY "Products can be deleted by admin, super_admin"
ON products FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('admin', 'super_admin'));

-- --------------------------------------------------------
-- STORAGE BUCKETS
-- --------------------------------------------------------
-- order_images already existed in production. product_images and
-- installation_images back the Products and Installations picture-upload
-- features and previously had no bucket (and, once created, no policies at
-- all — which meant uploads silently failed under RLS).
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('order_images', 'order_images', true),
  ('product_images', 'product_images', true),
  ('installation_images', 'installation_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies — identical shape per bucket: public read, authenticated
-- select/insert/delete.
DROP POLICY IF EXISTS "Public access to order images" ON storage.objects;
CREATE POLICY "Public access to order images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'order_images');
DROP POLICY IF EXISTS "Authenticated users can view order images" ON storage.objects;
CREATE POLICY "Authenticated users can view order images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'order_images');
DROP POLICY IF EXISTS "Authenticated users can upload order images" ON storage.objects;
CREATE POLICY "Authenticated users can upload order images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order_images');
DROP POLICY IF EXISTS "Authenticated users can delete order images" ON storage.objects;
CREATE POLICY "Authenticated users can delete order images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'order_images');

DROP POLICY IF EXISTS "Public access to product images" ON storage.objects;
CREATE POLICY "Public access to product images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product_images');
DROP POLICY IF EXISTS "Authenticated users can view product images" ON storage.objects;
CREATE POLICY "Authenticated users can view product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product_images');
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product_images');
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product_images');

DROP POLICY IF EXISTS "Public access to installation images" ON storage.objects;
CREATE POLICY "Public access to installation images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'installation_images');
DROP POLICY IF EXISTS "Authenticated users can view installation images" ON storage.objects;
CREATE POLICY "Authenticated users can view installation images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'installation_images');
DROP POLICY IF EXISTS "Authenticated users can upload installation images" ON storage.objects;
CREATE POLICY "Authenticated users can upload installation images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'installation_images');
DROP POLICY IF EXISTS "Authenticated users can delete installation images" ON storage.objects;
CREATE POLICY "Authenticated users can delete installation images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'installation_images');
