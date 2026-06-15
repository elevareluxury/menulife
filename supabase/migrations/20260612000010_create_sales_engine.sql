-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 13 — POS & PAYMENTS ENGINE (Motor Financiero Universal)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_payment_methods — métodos de cobro configurables por restaurante
--   • service_sales           — transacción comercial principal
--   • service_sale_items      — ítems universales de cada venta
--   • service_payments        — pagos registrados contra una venta
--   • service_refunds         — reembolsos (preparados)
--
--   SALE STATUS:   draft → pending → paid | partially_paid | cancelled | refunded
--   PAYMENT STATUS: pending → paid | failed | cancelled | refunded
--
--   ENTERPRISE READY: balance_due, sale_channel, multi-currency
--   PROVIDER READY:   external_provider, payment_intent_id, provider_customer_id, provider_payload
--   INTEGRATIONS:     quote_id, booking_id, membership_id, package_id
--   RLS: owner via auth.uid()
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. MÉTODOS DE PAGO (configurables por negocio) ──────────────────────────
CREATE TABLE IF NOT EXISTS service_payment_methods (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'cash'
                  CHECK (type IN ('cash','card','transfer','qr','wallet','terminal','other')),
  provider      TEXT        NOT NULL DEFAULT 'manual'
                  CHECK (provider IN ('manual','stripe','mercadopago','paypal','pix','future')),
  status        TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  sort_order    INT         NOT NULL DEFAULT 0,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_payment_methods;
CREATE POLICY "owner_all" ON service_payment_methods
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_spm_restaurant
  ON service_payment_methods(restaurant_id, status, sort_order);

-- ─── 2. VENTAS (transacción principal) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_sales (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id     UUID          REFERENCES service_customers(id),

  -- Identificación
  sale_number     TEXT          NOT NULL,
  title           TEXT,

  -- Estado
  status          TEXT          NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('draft','pending','paid','partially_paid','cancelled','refunded')),

  -- Origen de la venta
  source          TEXT          NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','booking','membership','package','quote','portal','retail','restaurant','future')),
  sale_channel    TEXT          NOT NULL DEFAULT 'presencial'
                    CHECK (sale_channel IN ('presencial','online','portal','marketplace','hub','api','future')),

  -- Financiero (multi-currency)
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due     NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT          NOT NULL DEFAULT 'ARS',

  -- Integraciones preparadas
  quote_id        UUID          REFERENCES service_quotes(id),
  booking_id      UUID          REFERENCES service_bookings(id),
  membership_id   UUID          REFERENCES service_memberships(id),
  package_id      UUID          REFERENCES service_packages(id),

  notes           TEXT,
  metadata        JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (restaurant_id, sale_number)
);

ALTER TABLE service_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_sales;
CREATE POLICY "owner_all" ON service_sales
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ss_restaurant_customer
  ON service_sales(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_ss_status
  ON service_sales(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_ss_source
  ON service_sales(restaurant_id, source);
CREATE INDEX IF NOT EXISTS idx_ss_created
  ON service_sales(restaurant_id, created_at DESC);

-- ─── 3. ÍTEMS DE VENTA (motor universal) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_sale_items (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id     UUID          NOT NULL REFERENCES service_sales(id) ON DELETE CASCADE,
  item_type   TEXT          NOT NULL DEFAULT 'service'
                CHECK (item_type IN ('service','tip','package','product','membership','future')),
  item_id     UUID,
  name        TEXT          NOT NULL,
  quantity    NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INT           NOT NULL DEFAULT 0,
  metadata    JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_sale_items;
CREATE POLICY "owner_all" ON service_sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM service_sales
      WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_ssi_sale
  ON service_sale_items(sale_id, sort_order);

-- ─── 4. PAGOS (tabla principal de cobros) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_payments (
  id                      UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id                 UUID          NOT NULL REFERENCES service_sales(id) ON DELETE CASCADE,
  customer_id             UUID          REFERENCES service_customers(id),
  method_id               UUID          REFERENCES service_payment_methods(id),

  amount                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                TEXT          NOT NULL DEFAULT 'ARS',

  status                  TEXT          NOT NULL DEFAULT 'paid'
                            CHECK (status IN ('pending','paid','failed','cancelled','refunded')),

  -- Provider abstraction (Stripe-ready, MercadoPago-ready, PayPal-ready, Pix-ready)
  external_provider       TEXT          NOT NULL DEFAULT 'manual'
                            CHECK (external_provider IN ('manual','stripe','mercadopago','paypal','pix','future')),
  external_transaction_id TEXT,
  payment_intent_id       TEXT,
  provider_customer_id    TEXT,
  provider_payload        JSONB         NOT NULL DEFAULT '{}',

  transaction_reference   TEXT,
  paid_at                 TIMESTAMPTZ,
  notes                   TEXT,
  metadata                JSONB         NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_payments;
CREATE POLICY "owner_all" ON service_payments
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM service_sales
      WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_sp_sale
  ON service_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sp_customer
  ON service_payments(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_provider
  ON service_payments(external_provider, external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- ─── 5. REEMBOLSOS (preparado) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_refunds (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id  UUID          NOT NULL REFERENCES service_payments(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason      TEXT,
  status      TEXT          NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','completed')),
  metadata    JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE service_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_refunds;
CREATE POLICY "owner_all" ON service_refunds
  FOR ALL USING (
    payment_id IN (
      SELECT id FROM service_payments
      WHERE sale_id IN (
        SELECT id FROM service_sales
        WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_sr_payment
  ON service_refunds(payment_id);

-- ─── FUNCIÓN: sale_number auto-generado (VTA-YYYY-NNNN) ──────────────────────
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  INT;
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    SELECT COALESCE(
      MAX(
        CASE
          WHEN sale_number ~ ('^VTA-' || v_year || '-[0-9]+$')
          THEN CAST(SPLIT_PART(sale_number, '-', 3) AS INT)
          ELSE 0
        END
      ), 0
    ) + 1
    INTO v_seq
    FROM service_sales
    WHERE restaurant_id = NEW.restaurant_id;

    NEW.sale_number := 'VTA-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ss_sale_number ON service_sales;
CREATE TRIGGER trg_ss_sale_number
  BEFORE INSERT ON service_sales
  FOR EACH ROW EXECUTE FUNCTION generate_sale_number();

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sales_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ss_updated_at ON service_sales;
CREATE TRIGGER trg_ss_updated_at
  BEFORE UPDATE ON service_sales
  FOR EACH ROW EXECUTE FUNCTION sales_engine_update_updated_at();
