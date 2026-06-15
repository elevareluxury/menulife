-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 12 — QUOTES ENGINE (Motor de Conversión Comercial)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_quote_templates — plantillas reutilizables
--   • service_quotes          — cotizaciones emitidas (entidad principal)
--   • service_quote_items     — ítems de cada cotización (motor universal)
--   • service_quote_events    — auditoría del ciclo de vida
--
--   STATUS: draft → sent → viewed → accepted | rejected | expired | converted | cancelled
--   RLS idéntico al resto del proyecto: owner via auth.uid()
--
--   ENTERPRISE READY: sales_owner_id, conversion_target_type/id, source
--   PUBLIC LINK READY: token (UUID generado en insert)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. PLANTILLAS DE COTIZACIONES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_quote_templates (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','archived')),
  currency        TEXT        NOT NULL DEFAULT 'ARS',
  expiration_days INT,
  color           TEXT        NOT NULL DEFAULT '#F4705A',
  icon            TEXT,
  sort_order      INT         NOT NULL DEFAULT 0,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_quote_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_quote_templates;
CREATE POLICY "owner_all" ON service_quote_templates
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sqtpl_restaurant
  ON service_quote_templates(restaurant_id, status, sort_order);

-- ─── 2. COTIZACIONES (entidad principal) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_quotes (
  id                     UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id          UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id            UUID          NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  template_id            UUID          REFERENCES service_quote_templates(id),

  -- Identificación
  quote_number           TEXT          NOT NULL,
  title                  TEXT          NOT NULL,
  description            TEXT,

  -- Estado
  status                 TEXT          NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired','converted','cancelled')),

  -- Financiero
  subtotal               NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency               TEXT          NOT NULL DEFAULT 'ARS',

  -- Ciclo de vida
  expires_at             TIMESTAMPTZ,
  sent_at                TIMESTAMPTZ,
  viewed_at              TIMESTAMPTZ,
  accepted_at            TIMESTAMPTZ,
  rejected_at            TIMESTAMPTZ,
  converted_at           TIMESTAMPTZ,

  -- Aceptación (preparado para portal cliente)
  accepted_ip            TEXT,
  accepted_user_agent    TEXT,
  accepted_by            TEXT,
  token                  TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,

  -- Enterprise ready
  sales_owner_id         UUID,
  conversion_target_type TEXT          CHECK (conversion_target_type IN ('membership','package','booking','pos_sale','custom')),
  conversion_target_id   UUID,
  source                 TEXT          NOT NULL DEFAULT 'manual'
                           CHECK (source IN ('manual','hub','form','crm','portal','api')),

  notes                  TEXT,
  metadata               JSONB         NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (restaurant_id, quote_number)
);

ALTER TABLE service_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_quotes;
CREATE POLICY "owner_all" ON service_quotes
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sq_restaurant_customer
  ON service_quotes(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sq_status
  ON service_quotes(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_sq_template
  ON service_quotes(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sq_expires
  ON service_quotes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sq_token
  ON service_quotes(token);

-- ─── 3. ÍTEMS DE COTIZACIÓN (motor universal) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS service_quote_items (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id      UUID          NOT NULL REFERENCES service_quotes(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  description   TEXT,
  quantity      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order    INT           NOT NULL DEFAULT 0,
  metadata      JSONB         NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_quote_items;
CREATE POLICY "owner_all" ON service_quote_items
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM service_quotes
      WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_sqi_quote
  ON service_quote_items(quote_id, sort_order);

-- ─── 4. EVENTOS DE COTIZACIÓN (auditoría) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_quote_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id    UUID        NOT NULL REFERENCES service_quotes(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  description TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_quote_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_quote_events;
CREATE POLICY "owner_all" ON service_quote_events
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM service_quotes
      WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_sqe_quote
  ON service_quote_events(quote_id, created_at DESC);

-- ─── FUNCIÓN: quote_number auto-generado ──────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  INT;
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    SELECT COALESCE(
      MAX(
        CASE
          WHEN quote_number ~ ('^QT-' || v_year || '-[0-9]+$')
          THEN CAST(SPLIT_PART(quote_number, '-', 3) AS INT)
          ELSE 0
        END
      ), 0
    ) + 1
    INTO v_seq
    FROM service_quotes
    WHERE restaurant_id = NEW.restaurant_id;

    NEW.quote_number := 'QT-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sq_quote_number ON service_quotes;
CREATE TRIGGER trg_sq_quote_number
  BEFORE INSERT ON service_quotes
  FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION quotes_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sqtpl_updated_at ON service_quote_templates;
CREATE TRIGGER trg_sqtpl_updated_at
  BEFORE UPDATE ON service_quote_templates
  FOR EACH ROW EXECUTE FUNCTION quotes_engine_update_updated_at();

DROP TRIGGER IF EXISTS trg_sq_updated_at ON service_quotes;
CREATE TRIGGER trg_sq_updated_at
  BEFORE UPDATE ON service_quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_engine_update_updated_at();
