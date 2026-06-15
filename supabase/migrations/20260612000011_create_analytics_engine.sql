-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 14 — ANALYTICS ENGINE (Sistema de Decisiones)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • date_dimension              — dimensión temporal estática (2020–2031)
--   • analytics_metric_definitions — motor KPI configurable
--   • analytics_daily_snapshots   — snapshots diarios por negocio (CRÍTICO)
--   • analytics_saved_views       — vistas guardadas por usuario
--   • upsert_daily_snapshot()     — función RPC que calcula y guarda snapshot
--
--   PRINCIPIO: Nunca calcular en tiempo real sobre tablas completas.
--              Usar snapshots para histórico. Queries live solo para "hoy".
--
--   AI READY: metadata JSONB en snapshots para futuras predicciones.
--   ENTERPRISE READY: location_id en snapshots para multi-local futuro.
--   EXPORT READY: config en saved_views soporta CSV/Excel/PDF metadata.
--   RLS: owner via auth.uid() en todas las tablas de tenant.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. DIMENSIÓN TEMPORAL ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS date_dimension (
  date          DATE        PRIMARY KEY,
  year          SMALLINT    NOT NULL,
  quarter       SMALLINT    NOT NULL,   -- 1-4
  month         SMALLINT    NOT NULL,   -- 1-12
  month_name    TEXT        NOT NULL,
  week_of_year  SMALLINT    NOT NULL,
  day_of_year   SMALLINT    NOT NULL,
  day_of_week   SMALLINT    NOT NULL,   -- 0=Sunday (JS standard)
  day_name      TEXT        NOT NULL,
  is_weekend    BOOLEAN     NOT NULL,
  is_month_start BOOLEAN    NOT NULL,
  is_month_end  BOOLEAN     NOT NULL,
  is_quarter_end BOOLEAN    NOT NULL
);

INSERT INTO date_dimension
SELECT
  d::DATE                                              AS date,
  EXTRACT(YEAR    FROM d)::SMALLINT                   AS year,
  EXTRACT(QUARTER FROM d)::SMALLINT                   AS quarter,
  EXTRACT(MONTH   FROM d)::SMALLINT                   AS month,
  TO_CHAR(d, 'TMMonth')                               AS month_name,
  EXTRACT(WEEK    FROM d)::SMALLINT                   AS week_of_year,
  EXTRACT(DOY     FROM d)::SMALLINT                   AS day_of_year,
  -- 0=Sunday (JS convention: EXTRACT DOW returns 0=Sun already)
  EXTRACT(DOW     FROM d)::SMALLINT                   AS day_of_week,
  TO_CHAR(d, 'TMDay')                                 AS day_name,
  EXTRACT(DOW FROM d) IN (0, 6)                       AS is_weekend,
  EXTRACT(DAY FROM d) = 1                             AS is_month_start,
  d = DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day'
                                                      AS is_month_end,
  d = DATE_TRUNC('quarter', d) + INTERVAL '3 months' - INTERVAL '1 day'
                                                      AS is_quarter_end
FROM generate_series('2020-01-01'::DATE, '2031-12-31'::DATE, '1 day') AS g(d)
ON CONFLICT (date) DO NOTHING;

-- ─── 2. MOTOR KPI CONFIGURABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_metric_definitions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- NULL = métrica global del sistema; UUID = métrica custom del negocio
  restaurant_id    UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  metric_key       TEXT        NOT NULL,
  metric_name      TEXT        NOT NULL,
  metric_group     TEXT        NOT NULL DEFAULT 'general'
                     CHECK (metric_group IN ('revenue','bookings','customers','memberships','packages','quotes','resources','general')),
  calculation_type TEXT        NOT NULL DEFAULT 'count'
                     CHECK (calculation_type IN ('count','sum','average','ratio','percentage')),
  unit             TEXT        NOT NULL DEFAULT 'number'
                     CHECK (unit IN ('number','currency','percentage','duration','ratio')),
  higher_is_better BOOLEAN     NOT NULL DEFAULT true,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order       INT         NOT NULL DEFAULT 0,
  metadata         JSONB       NOT NULL DEFAULT '{}',  -- thresholds, targets, AI hints
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, metric_key)
);

-- Métricas del sistema (globales — restaurant_id NULL)
INSERT INTO analytics_metric_definitions
  (restaurant_id, metric_key, metric_name, metric_group, calculation_type, unit, higher_is_better, sort_order)
VALUES
  (NULL, 'total_sales',         'Ventas',              'revenue',     'count',      'number',     true,  1),
  (NULL, 'total_revenue',       'Ingresos',            'revenue',     'sum',        'currency',   true,  2),
  (NULL, 'payments_received',   'Cobros',              'revenue',     'sum',        'currency',   true,  3),
  (NULL, 'balance_pending',     'Saldo Pendiente',     'revenue',     'sum',        'currency',   false, 4),
  (NULL, 'show_rate',           'Show Rate',           'bookings',    'percentage', 'percentage', true,  5),
  (NULL, 'quote_conversion',    'Conv. Presupuestos',  'quotes',      'percentage', 'percentage', true,  6),
  (NULL, 'new_customers',       'Clientes Nuevos',     'customers',   'count',      'number',     true,  7),
  (NULL, 'active_customers',    'Clientes Activos',    'customers',   'count',      'number',     true,  8),
  (NULL, 'memberships_active',  'Membresías Activas',  'memberships', 'count',      'number',     true,  9),
  (NULL, 'packages_active',     'Paquetes Activos',    'packages',    'count',      'number',     true,  10),
  (NULL, 'completed_bookings',  'Reservas Completas',  'bookings',    'count',      'number',     true,  11),
  (NULL, 'no_show_bookings',    'No Show',             'bookings',    'count',      'number',     false, 12)
ON CONFLICT (restaurant_id, metric_key) DO NOTHING;

ALTER TABLE analytics_metric_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_or_global" ON analytics_metric_definitions;
CREATE POLICY "owner_or_global" ON analytics_metric_definitions
  FOR ALL USING (
    restaurant_id IS NULL
    OR restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_amd_restaurant
  ON analytics_metric_definitions(restaurant_id, metric_group, is_active);

-- ─── 3. SNAPSHOTS DIARIOS (TABLA CRÍTICA) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id         UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id           UUID,                    -- future: multi-local enterprise
  snapshot_date         DATE          NOT NULL,

  -- ── Revenue ──────────────────────────────────────────────────────────────
  total_sales           INT           NOT NULL DEFAULT 0,  -- count ventas no canceladas
  total_revenue         NUMERIC(14,2) NOT NULL DEFAULT 0,  -- sum total ventas pagadas
  payments_received     NUMERIC(14,2) NOT NULL DEFAULT 0,  -- sum cobros del día
  balance_pending       NUMERIC(14,2) NOT NULL DEFAULT 0,  -- saldo pendiente total
  refunds               NUMERIC(14,2) NOT NULL DEFAULT 0,  -- reembolsos del día

  -- ── Customers ────────────────────────────────────────────────────────────
  total_customers       INT           NOT NULL DEFAULT 0,  -- acumulado histórico
  new_customers         INT           NOT NULL DEFAULT 0,  -- nuevos en el día
  active_customers_30d  INT           NOT NULL DEFAULT 0,  -- con actividad en 30d
  lost_customers_90d    INT           NOT NULL DEFAULT 0,  -- sin actividad en 90d
  recovered_customers   INT           NOT NULL DEFAULT 0,  -- reactivados

  -- ── Bookings ─────────────────────────────────────────────────────────────
  total_bookings        INT           NOT NULL DEFAULT 0,
  completed_bookings    INT           NOT NULL DEFAULT 0,
  cancelled_bookings    INT           NOT NULL DEFAULT 0,
  no_show_bookings      INT           NOT NULL DEFAULT 0,

  -- ── Memberships ──────────────────────────────────────────────────────────
  memberships_active    INT           NOT NULL DEFAULT 0,
  memberships_expired   INT           NOT NULL DEFAULT 0,
  memberships_cancelled INT           NOT NULL DEFAULT 0,
  mrr_estimated         NUMERIC(14,2) NOT NULL DEFAULT 0,  -- MRR estimado

  -- ── Packages ─────────────────────────────────────────────────────────────
  packages_sold         INT           NOT NULL DEFAULT 0,  -- vendidos en el día
  packages_active       INT           NOT NULL DEFAULT 0,  -- activos total

  -- ── Quotes ───────────────────────────────────────────────────────────────
  quotes_sent           INT           NOT NULL DEFAULT 0,
  quotes_accepted       INT           NOT NULL DEFAULT 0,
  quotes_rejected       INT           NOT NULL DEFAULT 0,

  -- ── Customer Score ────────────────────────────────────────────────────────
  vip_customers         INT           NOT NULL DEFAULT 0,
  premium_customers     INT           NOT NULL DEFAULT 0,

  -- ── Trend (period-over-period) ────────────────────────────────────────────
  revenue_growth_pct    NUMERIC(8,2),          -- % vs período anterior
  bookings_growth_pct   NUMERIC(8,2),
  customers_growth_pct  NUMERIC(8,2),
  trend_direction       TEXT          CHECK (trend_direction IN ('up','down','neutral')),

  -- ── AI & Enterprise Ready ────────────────────────────────────────────────
  metadata              JSONB         NOT NULL DEFAULT '{}',  -- AI hints, predictions, anomalies

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (restaurant_id, snapshot_date)
);

ALTER TABLE analytics_daily_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON analytics_daily_snapshots;
CREATE POLICY "owner_all" ON analytics_daily_snapshots
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ads_restaurant_date
  ON analytics_daily_snapshots(restaurant_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ads_date
  ON analytics_daily_snapshots(snapshot_date DESC);

-- ─── 4. VISTAS GUARDADAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_saved_views (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  period        TEXT        NOT NULL DEFAULT 'month'
                  CHECK (period IN ('today','week','month','year','custom')),
  metric_keys   TEXT[]      NOT NULL DEFAULT '{}',
  config        JSONB       NOT NULL DEFAULT '{}',   -- export format, filters, chart types
  is_default    BOOLEAN     NOT NULL DEFAULT false,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_saved_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON analytics_saved_views;
CREATE POLICY "owner_all" ON analytics_saved_views
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_asv_restaurant
  ON analytics_saved_views(restaurant_id, sort_order);

-- ─── 5. FUNCIÓN RPC: UPSERT DAILY SNAPSHOT ───────────────────────────────────
--   Computa y almacena el snapshot del día para un restaurante.
--   Llamado desde el cliente (SECURITY DEFINER verifica ownership).
--   Usa COUNT/SUM acotados por restaurant_id + fecha → sin full-table scans.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_daily_snapshot(
  p_restaurant_id UUID,
  p_date          DATE DEFAULT CURRENT_DATE
)
RETURNS analytics_daily_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result analytics_daily_snapshots;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id = p_restaurant_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own this restaurant';
  END IF;

  INSERT INTO analytics_daily_snapshots (
    restaurant_id,
    snapshot_date,
    total_sales,
    total_revenue,
    payments_received,
    balance_pending,
    new_customers,
    total_customers,
    total_bookings,
    completed_bookings,
    cancelled_bookings,
    no_show_bookings,
    memberships_active,
    memberships_expired,
    memberships_cancelled,
    packages_sold,
    packages_active,
    quotes_sent,
    quotes_accepted,
    quotes_rejected
  )
  SELECT
    p_restaurant_id,
    p_date,
    -- total_sales: ventas del día (excluye canceladas)
    (SELECT COUNT(*) FROM service_sales
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status <> 'cancelled'),
    -- total_revenue: ingresos de ventas pagadas del día
    (SELECT COALESCE(SUM(total), 0) FROM service_sales
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status IN ('paid', 'partially_paid')),
    -- payments_received: cobros del día
    (SELECT COALESCE(SUM(sp.amount), 0)
     FROM service_payments sp
     JOIN service_sales ss ON ss.id = sp.sale_id
     WHERE ss.restaurant_id = p_restaurant_id
       AND sp.status = 'paid'
       AND DATE(COALESCE(sp.paid_at, sp.created_at) AT TIME ZONE 'UTC') = p_date),
    -- balance_pending: saldo pendiente total (acumulado, no solo del día)
    (SELECT COALESCE(SUM(balance_due), 0) FROM service_sales
     WHERE restaurant_id = p_restaurant_id
       AND status IN ('pending', 'partially_paid')),
    -- new_customers: clientes creados en el día
    (SELECT COUNT(*) FROM service_customers
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date),
    -- total_customers: acumulado histórico
    (SELECT COUNT(*) FROM service_customers
     WHERE restaurant_id = p_restaurant_id),
    -- total_bookings: del día
    (SELECT COUNT(*) FROM service_bookings
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date),
    -- completed_bookings: del día
    (SELECT COUNT(*) FROM service_bookings
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status = 'completed'),
    -- cancelled_bookings: del día
    (SELECT COUNT(*) FROM service_bookings
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status = 'cancelled'),
    -- no_show_bookings: del día
    (SELECT COUNT(*) FROM service_bookings
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status = 'no_show'),
    -- memberships_active: count activas ahora (snapshot instantáneo)
    (SELECT COUNT(*) FROM service_memberships
     WHERE restaurant_id = p_restaurant_id AND status = 'active'),
    -- memberships_expired
    (SELECT COUNT(*) FROM service_memberships
     WHERE restaurant_id = p_restaurant_id AND status = 'expired'),
    -- memberships_cancelled
    (SELECT COUNT(*) FROM service_memberships
     WHERE restaurant_id = p_restaurant_id AND status = 'cancelled'),
    -- packages_sold: del día
    (SELECT COUNT(*) FROM service_packages
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date),
    -- packages_active: activos ahora
    (SELECT COUNT(*) FROM service_packages
     WHERE restaurant_id = p_restaurant_id AND status = 'active'),
    -- quotes_sent: enviadas el día (no draft)
    (SELECT COUNT(*) FROM service_quotes
     WHERE restaurant_id = p_restaurant_id
       AND DATE(created_at AT TIME ZONE 'UTC') = p_date
       AND status <> 'draft'),
    -- quotes_accepted: aceptadas el día
    (SELECT COUNT(*) FROM service_quotes
     WHERE restaurant_id = p_restaurant_id
       AND DATE(updated_at AT TIME ZONE 'UTC') = p_date
       AND status = 'accepted'),
    -- quotes_rejected: rechazadas el día
    (SELECT COUNT(*) FROM service_quotes
     WHERE restaurant_id = p_restaurant_id
       AND DATE(updated_at AT TIME ZONE 'UTC') = p_date
       AND status = 'rejected')
  ON CONFLICT (restaurant_id, snapshot_date) DO UPDATE SET
    total_sales           = EXCLUDED.total_sales,
    total_revenue         = EXCLUDED.total_revenue,
    payments_received     = EXCLUDED.payments_received,
    balance_pending       = EXCLUDED.balance_pending,
    new_customers         = EXCLUDED.new_customers,
    total_customers       = EXCLUDED.total_customers,
    total_bookings        = EXCLUDED.total_bookings,
    completed_bookings    = EXCLUDED.completed_bookings,
    cancelled_bookings    = EXCLUDED.cancelled_bookings,
    no_show_bookings      = EXCLUDED.no_show_bookings,
    memberships_active    = EXCLUDED.memberships_active,
    memberships_expired   = EXCLUDED.memberships_expired,
    memberships_cancelled = EXCLUDED.memberships_cancelled,
    packages_sold         = EXCLUDED.packages_sold,
    packages_active       = EXCLUDED.packages_active,
    quotes_sent           = EXCLUDED.quotes_sent,
    quotes_accepted       = EXCLUDED.quotes_accepted,
    quotes_rejected       = EXCLUDED.quotes_rejected,
    updated_at            = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- ─── TRIGGER: updated_at en snapshots ────────────────────────────────────────
CREATE OR REPLACE FUNCTION analytics_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ads_updated_at ON analytics_daily_snapshots;
CREATE TRIGGER trg_ads_updated_at
  BEFORE UPDATE ON analytics_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION analytics_update_updated_at();
