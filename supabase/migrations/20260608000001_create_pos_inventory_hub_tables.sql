-- ============================================================
-- Pre-launch migration: POS, Inventory, Hub tables + columns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. restaurants: missing columns ────────────────────────

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS setup_step               INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_url               TEXT,
  ADD COLUMN IF NOT EXISTS tax_enabled              BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_percentage           NUMERIC   DEFAULT 21,
  ADD COLUMN IF NOT EXISTS suggested_tip_percentages JSONB    DEFAULT '[10,15,20]',
  ADD COLUMN IF NOT EXISTS enabled_payment_methods  JSONB     DEFAULT '["cash","debit_card","credit_card","transfer","mercadopago","other"]',
  ADD COLUMN IF NOT EXISTS daily_sales_goal         NUMERIC   DEFAULT 50000;

-- ─── 2. cash_registers ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_registers (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id         UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by_name        TEXT        NOT NULL,
  initial_amount        NUMERIC     NOT NULL DEFAULT 0,
  notes                 TEXT,
  status                TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by_name        TEXT,
  closed_at             TIMESTAMPTZ,
  final_counted_amount  NUMERIC,
  expected_amount       NUMERIC,
  difference            NUMERIC,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage cash registers" ON cash_registers;
CREATE POLICY "Owners manage cash registers" ON cash_registers
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 3. cash_movements ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_movements (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id  UUID        NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN ('income', 'expense', 'adjustment')),
  amount            NUMERIC     NOT NULL,
  description       TEXT        NOT NULL,
  category          TEXT,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage cash movements" ON cash_movements;
CREATE POLICY "Owners manage cash movements" ON cash_movements
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 4. financial_transactions ───────────────────────────────

CREATE TABLE IF NOT EXISTS financial_transactions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  reference_type    TEXT,
  reference_id      UUID,
  cash_register_id  UUID        REFERENCES cash_registers(id) ON DELETE SET NULL,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage financial transactions" ON financial_transactions;
CREATE POLICY "Owners manage financial transactions" ON financial_transactions
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 5. tickets ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id         UUID,
  ticket_number    INTEGER     NOT NULL DEFAULT 1,
  table_number     TEXT,
  waiter_name      TEXT,
  customer_name    TEXT,
  payment_method   TEXT        NOT NULL DEFAULT 'cash',
  payment_methods  JSONB       DEFAULT '[]',
  subtotal         NUMERIC     NOT NULL DEFAULT 0,
  tax              NUMERIC     NOT NULL DEFAULT 0,
  tip              NUMERIC     NOT NULL DEFAULT 0,
  discount         NUMERIC     NOT NULL DEFAULT 0,
  courtesy         NUMERIC     NOT NULL DEFAULT 0,
  total            NUMERIC     NOT NULL DEFAULT 0,
  items            JSONB       DEFAULT '[]',
  status           TEXT        NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'voided', 'refunded')),
  correction_of    UUID        REFERENCES tickets(id) ON DELETE SET NULL,
  cash_register_id UUID        REFERENCES cash_registers(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tickets_restaurant_id_idx ON tickets(restaurant_id);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx    ON tickets(created_at DESC);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage tickets" ON tickets;
CREATE POLICY "Owners manage tickets" ON tickets
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 6. refunds ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refunds (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id       UUID,
  ticket_id      UUID        REFERENCES tickets(id) ON DELETE SET NULL,
  amount         NUMERIC     NOT NULL,
  reason         TEXT        NOT NULL,
  authorized_by  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage refunds" ON refunds;
CREATE POLICY "Owners manage refunds" ON refunds
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 7. expenses ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount         NUMERIC     NOT NULL,
  category       TEXT        NOT NULL,
  description    TEXT,
  created_by     TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_restaurant_id_idx ON expenses(restaurant_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage expenses" ON expenses;
CREATE POLICY "Owners manage expenses" ON expenses
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 8. audit_logs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_name      TEXT,
  action         TEXT        NOT NULL,
  entity_type    TEXT,
  entity_id      UUID,
  details        JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_restaurant_id_idx ON audit_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx    ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage audit logs" ON audit_logs;
CREATE POLICY "Owners manage audit logs" ON audit_logs
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 9. product_categories ───────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage product categories" ON product_categories;
CREATE POLICY "Owners manage product categories" ON product_categories
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read product categories" ON product_categories;
CREATE POLICY "Anyone can read product categories" ON product_categories
  FOR SELECT TO public
  USING (is_active = true);

-- ─── 10. products ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id      UUID        REFERENCES product_categories(id) ON DELETE SET NULL,
  name             TEXT        NOT NULL,
  name_en          TEXT,
  description      TEXT,
  description_en   TEXT,
  sku              TEXT,
  barcode          TEXT,
  brand            TEXT,
  image_url        TEXT,
  price_sale       NUMERIC     NOT NULL DEFAULT 0,
  cost             NUMERIC     NOT NULL DEFAULT 0,
  margin_pct       NUMERIC     GENERATED ALWAYS AS (
                     CASE WHEN price_sale > 0
                     THEN ROUND(((price_sale - cost) / price_sale) * 100, 2)
                     ELSE 0 END
                   ) STORED,
  stock_current    INTEGER     NOT NULL DEFAULT 0,
  stock_min        INTEGER     NOT NULL DEFAULT 5,
  tags             JSONB       DEFAULT '[]',
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_restaurant_id_idx ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx   ON products(category_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage products" ON products;
CREATE POLICY "Owners manage products" ON products
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products" ON products
  FOR SELECT TO public
  USING (is_active = true);

-- ─── 11. inventory_movements ─────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity        INTEGER     NOT NULL,
  previous_stock  INTEGER,
  new_stock       INTEGER,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_id_idx ON inventory_movements(product_id);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage inventory movements" ON inventory_movements;
CREATE POLICY "Owners manage inventory movements" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 12. inventory_alerts ────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('low_stock', 'out_of_stock')),
  resolved       BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_alerts_restaurant_id_idx ON inventory_alerts(restaurant_id);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage inventory alerts" ON inventory_alerts;
CREATE POLICY "Owners manage inventory alerts" ON inventory_alerts
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 13. hub_featured ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_featured (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  title_en       TEXT,
  description    TEXT,
  description_en TEXT,
  image_url      TEXT,
  cta_text       TEXT,
  cta_url        TEXT,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub_featured ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage hub featured" ON hub_featured;
CREATE POLICY "Owners manage hub featured" ON hub_featured
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read hub featured" ON hub_featured;
CREATE POLICY "Anyone can read hub featured" ON hub_featured
  FOR SELECT TO public
  USING (is_active = true);

-- ─── 14. hub_stories ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hub_stories (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id  UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  image_url      TEXT,
  title          TEXT,
  description    TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage hub stories" ON hub_stories;
CREATE POLICY "Owners manage hub stories" ON hub_stories
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read hub stories" ON hub_stories;
CREATE POLICY "Anyone can read hub stories" ON hub_stories
  FOR SELECT TO public
  USING (is_active = true);

-- ─── 15. view_daily_finance (used by CajaPage) ───────────────

CREATE OR REPLACE VIEW view_daily_finance AS
SELECT
  restaurant_id,
  DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS date,
  SUM(CASE WHEN type = 'income'     THEN amount ELSE 0 END) AS sales,
  SUM(CASE WHEN type = 'expense'    THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'tip'        THEN amount ELSE 0 END) AS tips,
  SUM(CASE WHEN type = 'refund'     THEN ABS(amount) ELSE 0 END) AS refunds,
  SUM(CASE WHEN type = 'courtesy'   THEN amount ELSE 0 END) AS courtesies,
  SUM(CASE
    WHEN type IN ('income', 'tip')    THEN amount
    WHEN type IN ('expense', 'refund') THEN -ABS(amount)
    ELSE 0
  END) AS net
FROM financial_transactions
GROUP BY restaurant_id, DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires');

-- ─── 16. Storage bucket for hub assets ───────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('hub-assets', 'hub-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owners can upload hub assets" ON storage.objects;
CREATE POLICY "Owners can upload hub assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hub-assets');

DROP POLICY IF EXISTS "Hub assets are publicly readable" ON storage.objects;
CREATE POLICY "Hub assets are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'hub-assets');

DROP POLICY IF EXISTS "Owners can update hub assets" ON storage.objects;
CREATE POLICY "Owners can update hub assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hub-assets');

DROP POLICY IF EXISTS "Owners can delete hub assets" ON storage.objects;
CREATE POLICY "Owners can delete hub assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hub-assets');
