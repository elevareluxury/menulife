-- Add new settings columns to restaurants table
-- Run this in the Supabase SQL Editor before using the Business Settings page

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS website        TEXT,
  ADD COLUMN IF NOT EXISTS country        TEXT DEFAULT 'Argentina',
  ADD COLUMN IF NOT EXISTS province       TEXT,
  ADD COLUMN IF NOT EXISTS address_extra  TEXT,
  ADD COLUMN IF NOT EXISTS postal_code    TEXT,
  ADD COLUMN IF NOT EXISTS directions     TEXT,
  ADD COLUMN IF NOT EXISTS social_links   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS menu_accent_color  TEXT DEFAULT '#FF6B7A',
  ADD COLUMN IF NOT EXISTS menu_card_style    TEXT DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS show_prices        BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_descriptions  BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calories      BOOLEAN DEFAULT false;

-- Create storage bucket for restaurant logos (run once)
-- In Supabase Dashboard > Storage > New bucket > "restaurant-logos" (public)
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to restaurant-logos
CREATE POLICY IF NOT EXISTS "Owners can upload restaurant logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'restaurant-logos');

CREATE POLICY IF NOT EXISTS "Restaurant logos are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'restaurant-logos');

CREATE POLICY IF NOT EXISTS "Owners can update restaurant logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'restaurant-logos');

CREATE POLICY IF NOT EXISTS "Owners can delete restaurant logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'restaurant-logos');
