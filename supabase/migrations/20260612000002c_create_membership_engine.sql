-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 8 — MEMBERSHIP ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_membership_plans   — plantillas de membresía con benefits (JSONB)
--   • service_memberships        — instancias activas por cliente
--   • service_membership_usage   — registro de consumo de benefits
--
--   service_membership_plans:
--     • benefits JSONB: array de Allowance objects (key, allowance_type, limit, unit, reset_cycle)
--     • billing_cycle: 'monthly'|'quarterly'|'semiannual'|'annual'|'custom'
--     • visibility: 'all_locations'|'specific_locations'
--     • location_scope JSONB nullable — Enterprise Fase 16 (ALTER TABLE aplicado después)
--
--   service_memberships:
--     • health: 'healthy'|'warning'|'critical' — calculado en app layer
--     • renewal_strategy: 'manual'|'auto'|'external'
--     • location_id nullable — Enterprise Fase 16 (ALTER TABLE aplicado después)
--
--   service_membership_usage:
--     • tabla SIN 's' al final del nombre (diferente a convención de packages)
--     • benefit_key identifica qué benefit se consumió del plan
--
--   RLS: policies con nombres 'smp_owner'/'sm_owner'/'smu_owner'
--        (no siguen la convención "owner_all" del resto — mantener como están en DB)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. PLANES DE MEMBRESÍA ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_membership_plans (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency      TEXT          NOT NULL DEFAULT 'ARS',
  billing_cycle TEXT          NOT NULL DEFAULT 'monthly'
                  CHECK (billing_cycle IN ('monthly','quarterly','semiannual','annual','custom')),
  status        TEXT          NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','archived')),
  benefits      JSONB         NOT NULL DEFAULT '[]',
  color         TEXT,
  icon          TEXT,
  sort_order    INT           NOT NULL DEFAULT 0,
  visibility    TEXT          NOT NULL DEFAULT 'all_locations'
                  CHECK (visibility IN ('all_locations','specific_locations')),
  location_scope JSONB,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smp_owner" ON service_membership_plans
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_smp_restaurant
  ON service_membership_plans(restaurant_id, status, sort_order);

CREATE OR REPLACE FUNCTION membership_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_smp_uat
  BEFORE UPDATE ON service_membership_plans
  FOR EACH ROW EXECUTE FUNCTION membership_engine_update_updated_at();

-- ─── 2. MEMBRESÍAS (instancias por cliente) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS service_memberships (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id      UUID          NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  plan_id          UUID          NOT NULL REFERENCES service_membership_plans(id) ON DELETE RESTRICT,
  status           TEXT          NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','expired','cancelled','pending')),
  starts_at        TIMESTAMPTZ   NOT NULL,
  ends_at          TIMESTAMPTZ,
  renewal_date     TIMESTAMPTZ,
  auto_renew       BOOLEAN       NOT NULL DEFAULT false,
  renewal_strategy TEXT          NOT NULL DEFAULT 'manual'
                     CHECK (renewal_strategy IN ('manual','auto','external')),
  health           TEXT          NOT NULL DEFAULT 'healthy'
                     CHECK (health IN ('healthy','warning','critical')),
  notes            TEXT,
  location_id      UUID,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_owner" ON service_memberships
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sm_restaurant_customer
  ON service_memberships(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sm_restaurant_status
  ON service_memberships(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_sm_customer
  ON service_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_sm_plan
  ON service_memberships(plan_id);
CREATE INDEX IF NOT EXISTS idx_sm_location
  ON service_memberships(location_id) WHERE location_id IS NOT NULL;

CREATE TRIGGER trg_sm_uat
  BEFORE UPDATE ON service_memberships
  FOR EACH ROW EXECUTE FUNCTION membership_engine_update_updated_at();

-- ─── 3. USO DE MEMBRESÍA ─────────────────────────────────────────────────────
--
-- Nombre de tabla: service_membership_usage (SIN 's' al final)
-- Registra consumos de benefits individuales (sesiones, horas, créditos, etc.)
--
CREATE TABLE IF NOT EXISTS service_membership_usage (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  membership_id UUID          NOT NULL REFERENCES service_memberships(id) ON DELETE CASCADE,
  customer_id   UUID          NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  benefit_key   TEXT          NOT NULL,
  quantity      NUMERIC(8,2)  NOT NULL DEFAULT 1,
  notes         TEXT,
  used_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_membership_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smu_owner" ON service_membership_usage
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_smu_membership
  ON service_membership_usage(membership_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_smu_customer
  ON service_membership_usage(restaurant_id, customer_id, used_at DESC);
