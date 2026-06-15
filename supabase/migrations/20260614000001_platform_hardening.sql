-- ============================================================
-- FASE 16.5 — PLATFORM HARDENING & SCALE READINESS
-- Target: 100k businesses, 1M locations, 500M bookings
-- All operations idempotent (IF NOT EXISTS / DO $$ blocks)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. RLS SUBQUERY INDEXES (HIGH SEVERITY)
--    These nested-subquery patterns scan full tables on every
--    RLS policy evaluation without indexes on the FK columns.
-- ──────────────────────────────────────────────────────────────

-- service_sale_items.sale_id — RLS checks via parent service_sales
CREATE INDEX IF NOT EXISTS idx_service_sale_items_sale_id
  ON service_sale_items(sale_id);

-- service_quote_items.quote_id — RLS checks via parent service_quotes
CREATE INDEX IF NOT EXISTS idx_service_quote_items_quote_id
  ON service_quote_items(quote_id);

-- service_refunds.payment_id — triple-nested RLS via payment→sale→restaurant
CREATE INDEX IF NOT EXISTS idx_service_refunds_payment_id
  ON service_refunds(payment_id);

-- ──────────────────────────────────────────────────────────────
-- 2. CORE ENTITY INDEXES (HIGH SEVERITY)
-- ──────────────────────────────────────────────────────────────

-- service_customer_timeline — restaurant_id for list/filter queries
CREATE INDEX IF NOT EXISTS idx_service_customer_timeline_restaurant_id
  ON service_customer_timeline(restaurant_id);

-- service_customers — composite for paginated listing (most common query)
CREATE INDEX IF NOT EXISTS idx_service_customers_restaurant_created
  ON service_customers(restaurant_id, created_at DESC);

-- service_customers — restaurant_id alone for simple lookups
CREATE INDEX IF NOT EXISTS idx_service_customers_restaurant_id
  ON service_customers(restaurant_id);

-- ──────────────────────────────────────────────────────────────
-- 3. BOOKING ENGINE INDEXES (MEDIUM SEVERITY)
-- ──────────────────────────────────────────────────────────────

-- service_bookings — (client_id, restaurant_id) for customer profile
-- Current schema has sparse partial index only where client_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_service_bookings_client_restaurant
  ON service_bookings(client_id, restaurant_id)
  WHERE client_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 4. MEMBERSHIP & PACKAGE INDEXES (MEDIUM SEVERITY)
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_service_memberships_restaurant_customer
  ON service_memberships(restaurant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_service_memberships_restaurant_status
  ON service_memberships(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_service_packages_restaurant_customer
  ON service_packages(restaurant_id, customer_id);

-- ──────────────────────────────────────────────────────────────
-- 5. FORMS ENGINE INDEXES (MEDIUM SEVERITY)
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_service_form_submissions_restaurant_template
  ON service_form_submissions(restaurant_id, template_id);

-- UNIQUE constraint on slug per restaurant (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_form_templates_restaurant_slug_key'
  ) THEN
    ALTER TABLE service_form_templates
      ADD CONSTRAINT service_form_templates_restaurant_slug_key
      UNIQUE (restaurant_id, slug);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 6. UPDATED_AT TRIGGERS FOR MISSING TABLES (MEDIUM SEVERITY)
-- ──────────────────────────────────────────────────────────────

-- service_document_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_document_links'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE service_document_links
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_service_document_links'
  ) THEN
    CREATE TRIGGER set_updated_at_service_document_links
      BEFORE UPDATE ON service_document_links
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- service_booking_waitlist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_booking_waitlist'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE service_booking_waitlist
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_service_booking_waitlist'
  ) THEN
    CREATE TRIGGER set_updated_at_service_booking_waitlist
      BEFORE UPDATE ON service_booking_waitlist
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 7. ENTERPRISE INDEXES (LOW SEVERITY)
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_member_locations_member_restaurant
  ON organization_member_locations(member_id, restaurant_id);

-- ──────────────────────────────────────────────────────────────
-- 8. FEATURE FLAGS TABLE
--    Registry for gradual rollout of new capabilities.
--    Read from featureFlags.ts on the frontend (static map).
--    DB table enables server-side overrides per organization.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    TEXT NOT NULL UNIQUE,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_feature_flags'
  ) THEN
    CREATE TRIGGER set_updated_at_feature_flags
      BEFORE UPDATE ON feature_flags
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS: only service_role can write; anyone authenticated can read
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags'
      AND policyname = 'feature_flags_read_authenticated'
  ) THEN
    CREATE POLICY feature_flags_read_authenticated
      ON feature_flags FOR SELECT
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

-- Seed default flags (no-op if already present)
INSERT INTO feature_flags (flag_key, is_enabled, description) VALUES
  ('portal_v2_email_magic_link',    FALSE, 'Portal V2: envío real de Magic Link por email (Edge Function)'),
  ('enterprise_team_management',    FALSE, 'Enterprise: UI de gestión de equipo y miembros'),
  ('enterprise_consolidated_view',  FALSE, 'Enterprise: dashboard consolidado cross-location'),
  ('analytics_advanced',            FALSE, 'Analytics: panel Advanced (cohortes, LTV, retención)'),
  ('customer_identity_merge',       FALSE, 'CRM: fusión de clientes duplicados cross-location'),
  ('documents_esignature',          FALSE, 'Documentos: firma electrónica (integración externa)'),
  ('bookings_waitlist_auto_fill',   FALSE, 'Reservas: auto-asignación desde lista de espera'),
  ('pos_inventory_alerts',          FALSE, 'POS: alertas de stock bajo por ítem')
ON CONFLICT (flag_key) DO NOTHING;
