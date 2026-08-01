-- Hub theming: add theme + accent_color columns to hub_config
-- Parte del sistema de temas Fase 1 (dark / light / warm / blue)
-- NULL theme = legacy user → preserves exact current look (zero regression)

ALTER TABLE public.hub_config
  ADD COLUMN IF NOT EXISTS theme        TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accent_color TEXT    DEFAULT '#F4705A';

-- Public read (anon) already covered by existing hub_config policy.
-- No new policy needed — upsert goes through authenticated owner policy.
