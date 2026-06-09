-- Hub extra columns (Fix 1 + Fix 3)
-- Adds missing columns referenced in TabGeneral's SELECT/UPDATE and hub_links image upload

-- ─── restaurants: missing hub columns ─────────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hub_cover_url     TEXT,
  ADD COLUMN IF NOT EXISTS hub_category      TEXT,
  ADD COLUMN IF NOT EXISTS hub_main_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS hub_main_cta_url  TEXT;

-- ─── hub_links: image support ─────────────────────────────────────────────────
ALTER TABLE public.hub_links
  ADD COLUMN IF NOT EXISTS image_url TEXT;
