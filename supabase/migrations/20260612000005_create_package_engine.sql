-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 9 — PACKAGE ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_package_templates — plantillas reutilizables (análogo a MembershipPlan)
--   • service_packages          — instancias por cliente    (análogo a Membership)
--   • service_package_usages    — registros de consumo      (análogo a MembershipUsage)
--   • consumption_strategy en la plantilla: manual / automatic / hybrid
--   • items almacenados en JSONB [{key, name, catalog_id?, quantity, unit, allowance_type}]
--   • RLS idéntico al resto del proyecto: owner via auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. PLANTILLAS DE PAQUETES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_package_templates (
  id                   UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id        UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name                 TEXT          NOT NULL,
  description          TEXT,
  price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency             TEXT          NOT NULL DEFAULT 'ARS',
  items                JSONB         NOT NULL DEFAULT '[]',
  validity_days        INT,
  consumption_strategy TEXT          NOT NULL DEFAULT 'manual'
                         CHECK (consumption_strategy IN ('manual','automatic','hybrid')),
  status               TEXT          NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive','archived')),
  color                TEXT          NOT NULL DEFAULT '#F4705A',
  icon                 TEXT,
  sort_order           INT           NOT NULL DEFAULT 0,
  metadata             JSONB         NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_package_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_package_templates;
CREATE POLICY "owner_all" ON service_package_templates
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_spt_restaurant
  ON service_package_templates(restaurant_id, status, sort_order);

-- ─── 2. PAQUETES DE CLIENTES (instancias compradas) ──────────────────────────
CREATE TABLE IF NOT EXISTS service_packages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id   UUID        NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  template_id   UUID        REFERENCES service_package_templates(id),
  status        TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','cancelled','pending')),
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  consumption   JSONB       NOT NULL DEFAULT '{}',
  notes         TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_packages;
CREATE POLICY "owner_all" ON service_packages
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sp_restaurant_customer
  ON service_packages(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sp_status
  ON service_packages(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_sp_template
  ON service_packages(template_id) WHERE template_id IS NOT NULL;

-- ─── 3. USOS DE PAQUETES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_package_usages (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  package_id    UUID         NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  customer_id   UUID         NOT NULL REFERENCES service_customers(id),
  item_key      TEXT         NOT NULL,
  booking_id    UUID         REFERENCES service_bookings(id),
  quantity      NUMERIC(8,2) NOT NULL DEFAULT 1,
  notes         TEXT,
  used_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE service_package_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_package_usages;
CREATE POLICY "owner_all" ON service_package_usages
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_spu_package
  ON service_package_usages(package_id);
CREATE INDEX IF NOT EXISTS idx_spu_customer
  ON service_package_usages(customer_id);
CREATE INDEX IF NOT EXISTS idx_spu_booking
  ON service_package_usages(booking_id) WHERE booking_id IS NOT NULL;

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION package_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_spt_updated_at ON service_package_templates;
CREATE TRIGGER trg_spt_updated_at
  BEFORE UPDATE ON service_package_templates
  FOR EACH ROW EXECUTE FUNCTION package_engine_update_updated_at();

DROP TRIGGER IF EXISTS trg_sp_updated_at ON service_packages;
CREATE TRIGGER trg_sp_updated_at
  BEFORE UPDATE ON service_packages
  FOR EACH ROW EXECUTE FUNCTION package_engine_update_updated_at();
