-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 5/6/7 — CUSTOMER ENGINE + SCORE ENGINE + TIMELINE ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_customers          — CRM de clientes de la vertical Servicios
--   • service_customer_scores    — score 0-100 con 9 tiers (upsert by engine)
--   • service_customer_timeline  — log append-only de eventos del cliente
--
--   service_customers:
--     • full_name GENERATED ALWAYS AS (trim(first_name || ' ' || coalesce(last_name, '')))
--     • location_id nullable sin FK — forward-compat Enterprise (Fase 16)
--     • global_customer_id nullable — forward-compat Enterprise multi-location (Fase 16)
--     • tags TEXT[] con GIN index para filtrado eficiente
--
--   service_customer_scores:
--     • UNIQUE(restaurant_id, customer_id) — upsert por engine
--     • recalculado por CustomerScoreEngine.ts (app layer)
--
--   service_customer_timeline:
--     • append-only — NO UPDATE expuesto en hooks
--     • metadata JSONB para datos arbitrarios por event_type
--     • actor_type: 'system' | 'owner' | 'client'
--
--   RLS: "owner_all" via auth.uid() — convención del proyecto
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. CLIENTES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_customers (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id      UUID,
  global_customer_id UUID,
  first_name       TEXT        NOT NULL,
  last_name        TEXT,
  full_name        TEXT        GENERATED ALWAYS AS (
                     trim(first_name || ' ' || coalesce(last_name, ''))
                   ) STORED,
  phone            TEXT,
  email            TEXT,
  birth_date       DATE,
  gender           TEXT        CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  avatar_url       TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','inactive','archived','blocked','lead')),
  source           TEXT        NOT NULL DEFAULT 'manual'
                     CHECK (source IN (
                       'instagram','whatsapp','referral','google',
                       'hub','marketplace','manual','booking','import','other'
                     )),
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  notes            TEXT,
  total_bookings   INT         NOT NULL DEFAULT 0,
  last_visit_at    TIMESTAMPTZ,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_customers
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sc_restaurant_created
  ON service_customers(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_restaurant_id
  ON service_customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_sc_phone
  ON service_customers(restaurant_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_email
  ON service_customers(restaurant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tags
  ON service_customers USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_sc_location
  ON service_customers(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_global
  ON service_customers(global_customer_id) WHERE global_customer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION service_customers_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_service_customers_uat
  BEFORE UPDATE ON service_customers
  FOR EACH ROW EXECUTE FUNCTION service_customers_update_updated_at();

-- ─── 2. CUSTOMER SCORES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_customer_scores (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id      UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id        UUID        NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  score              INT         NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  tier               TEXT        NOT NULL DEFAULT 'new'
                       CHECK (tier IN (
                         'new','active','frequent','premium','vip',
                         'at_risk','inactive','lost','ambassador'
                       )),
  completed_bookings INT         NOT NULL DEFAULT 0,
  cancelled_bookings INT         NOT NULL DEFAULT 0,
  no_show_bookings   INT         NOT NULL DEFAULT 0,
  total_revenue      NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, customer_id)
);

ALTER TABLE service_customer_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_customer_scores
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_scs_restaurant_tier
  ON service_customer_scores(restaurant_id, tier);
CREATE INDEX IF NOT EXISTS idx_scs_customer
  ON service_customer_scores(customer_id);

CREATE TRIGGER trg_service_customer_scores_uat
  BEFORE UPDATE ON service_customer_scores
  FOR EACH ROW EXECUTE FUNCTION service_customers_update_updated_at();

-- ─── 3. CUSTOMER TIMELINE ────────────────────────────────────────────────────
--
-- append-only: sin UPDATE ni DELETE expuesto en hooks.
-- actor_type: 'system' (automático), 'owner' (manual), 'client' (portal).
--
CREATE TABLE IF NOT EXISTS service_customer_timeline (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id   UUID        NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  booking_id    UUID,
  actor_type    TEXT        NOT NULL DEFAULT 'system'
                  CHECK (actor_type IN ('system','owner','client')),
  actor_id      UUID,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  event_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_customer_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_customer_timeline
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Índice compuesto optimizado para la query del hook (customer_id + event_date DESC)
CREATE INDEX IF NOT EXISTS idx_sct_customer_date
  ON service_customer_timeline(customer_id, event_date DESC);
-- Índice para RLS filter + queries por restaurant
CREATE INDEX IF NOT EXISTS idx_sct_restaurant_id
  ON service_customer_timeline(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_sct_event_type
  ON service_customer_timeline(restaurant_id, event_type);
