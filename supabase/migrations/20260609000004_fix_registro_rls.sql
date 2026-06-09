-- Fix registro self-service:
-- 1. Política INSERT en restaurants para usuarios autenticados
-- 2. Corregir policies hub_gallery/hub_featured_product/hub_reviews
--    que usaban user_id en vez de owner_id

-- ─── 1. restaurants: permitir INSERT propio ────────────────────────────────
CREATE POLICY "restaurants_insert_self"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- ─── 2. hub_gallery: reemplazar policy con user_id → owner_id ─────────────
DROP POLICY IF EXISTS "hub_gallery_owner_all" ON hub_gallery;

CREATE POLICY "hub_gallery_owner_all"
  ON hub_gallery
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ))
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));

-- ─── 3. hub_featured_product: reemplazar policy con user_id → owner_id ────
DROP POLICY IF EXISTS "hub_fp_owner_all" ON hub_featured_product;

CREATE POLICY "hub_fp_owner_all"
  ON hub_featured_product
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ))
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));

-- ─── 4. hub_reviews: reemplazar policy con user_id → owner_id ─────────────
DROP POLICY IF EXISTS "hub_reviews_owner_all" ON hub_reviews;

CREATE POLICY "hub_reviews_owner_all"
  ON hub_reviews
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ))
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));
