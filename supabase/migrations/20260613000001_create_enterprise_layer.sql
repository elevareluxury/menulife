-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 16 — ENTERPRISE & MULTI-LOCATION ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • organizations            — empresa matriz / cadena / franquicia / holding
--   • organization_locations   — metadata extendida por sucursal
--   • organization_members     — usuarios con rol en la organización
--   • organization_member_locations — acceso granular por sucursal (scope='selected')
--
-- RELACIÓN CORE:
--   organizations
--   └─► restaurants (organization_id) — cada restaurant ES una location
--       └─► service_* (restaurant_id = location_id actual)
--
-- ESTRATEGIA ZERO-BREAKING:
--   • restaurant_id sigue siendo el anchor de datos (sin cambio en RLS existente)
--   • organization_id en restaurants es nullable → single-location no se ve afectado
--   • location_id en tablas de datos: nullable, forward-compat FK a restaurants.id
--   • Solo las queries enterprise filtran por múltiples restaurant_ids
--
-- CUSTOMER GLOBAL IDENTITY:
--   • global_customer_id en service_customers — preparado, no migrar datos aún
--   • Futura tabla customer_global_profiles mapea global_id → múltiples restaurants
--
-- PERMISSIONS:
--   • Roles: owner > admin > manager > staff
--   • location_scope: 'all' | 'selected' | 'single'
--   • No modificar RLS existente — los membres acceden vía RPCs SECURITY DEFINER (futuro)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. ORGANIZATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  logo_url    TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency    TEXT        NOT NULL DEFAULT 'ARS',
  country     TEXT        NOT NULL DEFAULT 'AR',

  -- plan: determina features enterprise disponibles
  -- 'single'    → 1 sucursal (UI sin LocationSwitcher)
  -- 'multi'     → 2-50 sucursales
  -- 'enterprise' → 50+ sucursales, analytics consolidados, roles avanzados
  plan        TEXT        NOT NULL DEFAULT 'single'
                CHECK (plan IN ('single','multi','enterprise')),

  -- future: branding, SSO config, marketplace settings, AI config
  settings    JSONB       NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- El owner de cualquier restaurant de la org puede ver la org
DROP POLICY IF EXISTS "org_owner_all" ON organizations;
CREATE POLICY "org_owner_all" ON organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations(slug);

-- ─── 2. ADD organization_id TO restaurants ───────────────────────────────────
--   Nullable: single-location businesses no necesitan org.
--   Multi-location: múltiples restaurants comparten organization_id.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_org
  ON restaurants(organization_id) WHERE organization_id IS NOT NULL;

-- ─── 3. ORGANIZATION LOCATIONS (metadata extendida por sucursal) ─────────────
--   Complementa restaurants con datos físicos / contacto.
--   Una organización puede tener N locations, cada una vinculada a un restaurant.
CREATE TABLE IF NOT EXISTS organization_locations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  slug            TEXT        NOT NULL,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT        NOT NULL DEFAULT 'AR',
  timezone        TEXT        NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  phone           TEXT,
  email           TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','coming_soon','closed')),
  sort_order      INT         NOT NULL DEFAULT 0,
  metadata        JSONB       NOT NULL DEFAULT '{}',  -- future: lat/lng, opening_hours
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id, restaurant_id),
  UNIQUE (organization_id, slug)
);

ALTER TABLE organization_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_location_owner_all" ON organization_locations;
CREATE POLICY "org_location_owner_all" ON organization_locations
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_ol_organization   ON organization_locations(organization_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_ol_restaurant     ON organization_locations(restaurant_id);

-- ─── 4. ORGANIZATION MEMBERS ─────────────────────────────────────────────────
--   Usuarios con rol en la organización (no tienen que ser owner de restaurants).
--   En V1, la UI solo muestra owners. Los members son preparación de arquitectura.
--
-- location_scope:
--   'all'      → ve todas las sucursales
--   'selected' → ve solo las de organization_member_locations
--   'single'   → ve solo la sucursal de su restaurant asignado
CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Roles escalables (no hardcoded en lógica de negocio)
  -- future: custom_role_id → reference a tabla de roles personalizados
  role            TEXT        NOT NULL DEFAULT 'staff'
                    CHECK (role IN ('owner','admin','manager','staff')),

  -- Scope de acceso a sucursales
  location_scope  TEXT        NOT NULL DEFAULT 'all'
                    CHECK (location_scope IN ('all','selected','single')),

  -- future: permissions_override JSONB para overrides granulares
  -- future: invited_by UUID, invited_at, accepted_at
  metadata        JSONB       NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
-- Un usuario puede ver su propia membresía, o si es owner de la org
DROP POLICY IF EXISTS "org_member_read" ON organization_members;
CREATE POLICY "org_member_read" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM restaurants WHERE owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "org_member_write" ON organization_members;
CREATE POLICY "org_member_write" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_om_organization ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_om_user         ON organization_members(user_id);

-- ─── 5. MEMBER → SPECIFIC LOCATIONS (para scope='selected') ─────────────────
CREATE TABLE IF NOT EXISTS organization_member_locations (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id     UUID        NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, restaurant_id)
);

ALTER TABLE organization_member_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oml_owner_all" ON organization_member_locations;
CREATE POLICY "oml_owner_all" ON organization_member_locations
  FOR ALL USING (
    member_id IN (
      SELECT om.id FROM organization_members om
      WHERE om.organization_id IN (
        SELECT organization_id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_oml_member     ON organization_member_locations(member_id);
CREATE INDEX IF NOT EXISTS idx_oml_restaurant ON organization_member_locations(restaurant_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-LOCATION COLUMNS — agregar location_id a tablas que aún no lo tienen
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- REGLA: location_id = restaurants.id de la sucursal donde ocurrió el evento.
--        NULL = sucursal no especificada (backward-compat con datos anteriores).
--        La FK se activa en Fase Enterprise cuando organizations existan.
-- ═══════════════════════════════════════════════════════════════════════════════

-- service_customers — sucursal donde se originó el cliente
ALTER TABLE service_customers
  ADD COLUMN IF NOT EXISTS location_id UUID;        -- future: REFERENCES restaurants(id)

CREATE INDEX IF NOT EXISTS idx_scust_location
  ON service_customers(location_id) WHERE location_id IS NOT NULL;

-- global_customer_id — Customer Global Identity Layer (preparado, sin FK aún)
ALTER TABLE service_customers
  ADD COLUMN IF NOT EXISTS global_customer_id UUID; -- future: REFERENCES customer_global_profiles(id)

CREATE INDEX IF NOT EXISTS idx_scust_global
  ON service_customers(global_customer_id) WHERE global_customer_id IS NOT NULL;

-- service_quotes — sucursal donde se generó el presupuesto
ALTER TABLE service_quotes
  ADD COLUMN IF NOT EXISTS location_id UUID;

CREATE INDEX IF NOT EXISTS idx_sq_location
  ON service_quotes(location_id) WHERE location_id IS NOT NULL;

-- service_sales — sucursal donde se realizó la venta
ALTER TABLE service_sales
  ADD COLUMN IF NOT EXISTS location_id UUID;

CREATE INDEX IF NOT EXISTS idx_ssl_location
  ON service_sales(location_id) WHERE location_id IS NOT NULL;

-- service_packages — sucursal de origen del paquete (instancia de cliente)
ALTER TABLE service_packages
  ADD COLUMN IF NOT EXISTS location_id UUID;

CREATE INDEX IF NOT EXISTS idx_sp_location
  ON service_packages(location_id) WHERE location_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MEMBERSHIP & PACKAGE SCOPE — configurable local/organización
-- ═══════════════════════════════════════════════════════════════════════════════

-- service_membership_plans.location_scope
--   'local'        → válida solo en la sucursal donde se activó
--   'organization' → válida en todas las sucursales de la org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_membership_plans' AND column_name = 'location_scope'
  ) THEN
    ALTER TABLE service_membership_plans
      ADD COLUMN location_scope TEXT NOT NULL DEFAULT 'local'
        CHECK (location_scope IN ('local','organization'));
  END IF;
END $$;

-- service_memberships — sucursal de activación
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_memberships' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE service_memberships ADD COLUMN location_id UUID;
    CREATE INDEX IF NOT EXISTS idx_smem_location
      ON service_memberships(location_id) WHERE location_id IS NOT NULL;
  END IF;
END $$;

-- service_package_templates.location_scope
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_package_templates' AND column_name = 'location_scope'
  ) THEN
    ALTER TABLE service_package_templates
      ADD COLUMN location_scope TEXT NOT NULL DEFAULT 'local'
        CHECK (location_scope IN ('local','organization'));
  END IF;
END $$;

-- service_form_submissions — sucursal de envío
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_form_submissions' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE service_form_submissions ADD COLUMN location_id UUID;
  END IF;
END $$;

-- service_form_templates.location_scope — global o por sucursal
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_form_templates' AND column_name = 'location_scope'
  ) THEN
    ALTER TABLE service_form_templates
      ADD COLUMN location_scope TEXT NOT NULL DEFAULT 'local'
        CHECK (location_scope IN ('local','organization'));
  END IF;
END $$;

-- service_documents — sucursal donde se generó
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_documents' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE service_documents ADD COLUMN location_id UUID;
  END IF;
END $$;

-- analytics_daily_snapshots — ya tiene location_id (Fase 14)
-- service_bookings, service_catalog, service_resources — ya tienen location_id (Fase 4)

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- get_org_restaurant_ids: retorna los restaurant_ids de una org a los que el usuario
-- tiene acceso. Usado por queries enterprise para filtrar datos cross-location.
CREATE OR REPLACE FUNCTION get_org_restaurant_ids(p_organization_id UUID)
RETURNS TABLE(restaurant_id UUID)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT r.id
  FROM restaurants r
  WHERE r.organization_id = p_organization_id
    AND (
      -- owner de cualquier restaurant de la org
      r.owner_id = v_uid
      OR
      -- miembro con acceso a todas las locations
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = p_organization_id
          AND om.user_id = v_uid
          AND om.location_scope = 'all'
      )
      OR
      -- miembro con acceso a este restaurant específico
      EXISTS (
        SELECT 1 FROM organization_members om
        JOIN organization_member_locations oml ON oml.member_id = om.id
        WHERE om.organization_id = p_organization_id
          AND om.user_id = v_uid
          AND oml.restaurant_id = r.id
      )
    );
END; $$;

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enterprise_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_org_updated_at ON organizations;
CREATE TRIGGER trg_org_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION enterprise_set_updated_at();

DROP TRIGGER IF EXISTS trg_ol_updated_at ON organization_locations;
CREATE TRIGGER trg_ol_updated_at BEFORE UPDATE ON organization_locations
  FOR EACH ROW EXECUTE FUNCTION enterprise_set_updated_at();
