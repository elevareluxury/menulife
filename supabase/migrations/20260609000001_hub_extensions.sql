-- Hub extensions: new restaurant columns + gallery/featured-product/reviews tables

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS hub_about              text,
  ADD COLUMN IF NOT EXISTS hub_about_en           text,
  ADD COLUMN IF NOT EXISTS hub_category_tags      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hub_category_tags_en   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hub_enabled            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hub_bottom_nav         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS google_rating          numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_review_count    integer,
  ADD COLUMN IF NOT EXISTS google_review_url      text;

-- ── hub_gallery ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_gallery (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  url           text        NOT NULL,
  type          text        NOT NULL DEFAULT 'image',   -- 'image' | 'video'
  caption       text,
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hub_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_gallery_owner_all" ON hub_gallery
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

CREATE POLICY "hub_gallery_public_select" ON hub_gallery
  FOR SELECT TO anon USING (is_active = true);

-- ── hub_featured_product ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_featured_product (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  price         numeric(10,2),
  image_url     text,
  tag           text,
  cta_text      text,
  cta_url       text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hub_featured_product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_fp_owner_all" ON hub_featured_product
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

CREATE POLICY "hub_fp_public_select" ON hub_featured_product
  FOR SELECT TO anon USING (is_active = true);

-- ── hub_reviews ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_reviews (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  author_name    text        NOT NULL,
  author_initial text,
  profile_color  text        DEFAULT '#F59E0B',
  rating         integer     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text           text        NOT NULL,
  relative_time  text        DEFAULT 'Hace poco',
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hub_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_reviews_owner_all" ON hub_reviews
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

CREATE POLICY "hub_reviews_public_select" ON hub_reviews
  FOR SELECT TO anon USING (true);
