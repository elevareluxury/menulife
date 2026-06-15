-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 4 — BOOKING ENGINE UNIVERSAL
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • Todos los timestamps son TIMESTAMPTZ (UTC en DB).
--     El cliente convierte a timezone local usando restaurants.timezone.
--   • restaurant_id ES el anchor de organización (sin tabla organizations aún).
--   • location_id UUID nullable sin FK — forward-compat multi-local / Enterprise.
--   • client_id UUID nullable — forward-compat Customer Engine futuro.
--   • RLS idéntico al resto del proyecto: owner via auth.uid().
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. CATÁLOGO DE SERVICIOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_catalog (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id      UUID,                           -- future: REFERENCES locations(id)
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INT         NOT NULL DEFAULT 60,
  buffer_minutes   INT         NOT NULL DEFAULT 0, -- pausa post-servicio
  price            NUMERIC(10,2),
  currency         TEXT        NOT NULL DEFAULT 'ARS',
  color            TEXT        NOT NULL DEFAULT '#F4705A',
  icon             TEXT,
  category         TEXT,
  booking_type     TEXT        NOT NULL DEFAULT 'individual'
                     CHECK (booking_type IN ('individual','group')),
  capacity         INT         NOT NULL DEFAULT 1,
  modality         TEXT        NOT NULL DEFAULT 'in_person'
                     CHECK (modality IN ('in_person','online','home','hybrid')),
  online_link      TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order       INT         NOT NULL DEFAULT 0,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_catalog;
CREATE POLICY "owner_all" ON service_catalog
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sc_restaurant
  ON service_catalog(restaurant_id, is_active, sort_order);

-- ─── 2. CATÁLOGO ↔ TIPOS DE RECURSO (preparado, sin lógica funcional aún) ────
--     Permite asociar qué tipos de recursos requiere cada servicio.
CREATE TABLE IF NOT EXISTS service_catalog_resources (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id       UUID        NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  resource_type_id UUID        NOT NULL REFERENCES service_resource_types(id),
  restaurant_id    UUID        NOT NULL,
  quantity         INT         NOT NULL DEFAULT 1,     -- cuántos recursos de este tipo
  is_required      BOOLEAN     NOT NULL DEFAULT false, -- requerido vs sugerido
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (catalog_id, resource_type_id)
);

ALTER TABLE service_catalog_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_catalog_resources;
CREATE POLICY "owner_all" ON service_catalog_resources
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- ─── 3. RESERVAS — CORE DEL BOOKING ENGINE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS service_bookings (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id        UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id          UUID,                           -- future FK to locations
  catalog_id           UUID        REFERENCES service_catalog(id),

  -- Timing (UTC; cliente convierte via restaurants.timezone)
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  duration_minutes     INT         NOT NULL,

  -- Estado
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN (
                           'pending','confirmed','in_progress',
                           'completed','cancelled','no_show','rescheduled'
                         )),

  -- Tipo de reserva
  booking_type         TEXT        NOT NULL DEFAULT 'individual'
                         CHECK (booking_type IN ('individual','group')),
  capacity             INT         NOT NULL DEFAULT 1,
  reserved_spots       INT         NOT NULL DEFAULT 1,
  waitlist_count       INT         NOT NULL DEFAULT 0,

  -- Cliente (denormalizado; client_id forward-compat para Customer Engine)
  client_id            UUID,
  client_name          TEXT,
  client_phone         TEXT,
  client_email         TEXT,
  client_notes         TEXT,

  -- Contenido
  title                TEXT,      -- override de label (ej. "Reunión de equipo")
  notes                TEXT,

  -- Modalidad
  modality             TEXT        NOT NULL DEFAULT 'in_person'
                         CHECK (modality IN ('in_person','online','home','hybrid')),
  meet_url             TEXT,
  service_address      TEXT,

  -- Trazabilidad
  recurrence_rule      TEXT,                           -- rrule string (futuro)
  recurrence_parent_id UUID        REFERENCES service_bookings(id),
  rescheduled_from_id  UUID        REFERENCES service_bookings(id),

  -- Snapshot financiero
  price_snapshot       NUMERIC(10,2),
  currency             TEXT        NOT NULL DEFAULT 'ARS',
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_booking_range CHECK (ends_at > starts_at)
);

ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_bookings;
CREATE POLICY "owner_all" ON service_bookings
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Índices críticos para performance con millones de registros
CREATE INDEX IF NOT EXISTS idx_sb_restaurant_starts
  ON service_bookings(restaurant_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_sb_restaurant_status
  ON service_bookings(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_sb_range
  ON service_bookings(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_sb_client_id
  ON service_bookings(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sb_catalog_id
  ON service_bookings(catalog_id) WHERE catalog_id IS NOT NULL;

-- ─── 4. BOOKING ↔ RECURSOS (M:N) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_booking_resources (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID        NOT NULL REFERENCES service_bookings(id)  ON DELETE CASCADE,
  resource_id   UUID        NOT NULL REFERENCES service_resources(id) ON DELETE RESTRICT,
  restaurant_id UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, resource_id)
);

ALTER TABLE service_booking_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_booking_resources;
CREATE POLICY "owner_all" ON service_booking_resources
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sbr_resource ON service_booking_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_sbr_booking  ON service_booking_resources(booking_id);

-- ─── 5. LISTA DE ESPERA ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_booking_waitlist (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID        NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  restaurant_id UUID        NOT NULL,
  client_name   TEXT        NOT NULL,
  client_phone  TEXT,
  client_email  TEXT,
  position      INT         NOT NULL DEFAULT 1,
  status        TEXT        NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting','notified','converted','expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_booking_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_booking_waitlist;
CREATE POLICY "owner_all" ON service_booking_waitlist
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- ─── 6. BLOQUEOS (vacaciones, mantenimiento, ausencias, eventos) ──────────────
--     resource_id NULL = afecta a todo el negocio
--     resource_id <id>  = bloqueo de recurso específico
CREATE TABLE IF NOT EXISTS service_blocks (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id   UUID,
  resource_id   UUID        REFERENCES service_resources(id),
  title         TEXT        NOT NULL DEFAULT 'Bloqueado',
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  is_all_day    BOOLEAN     NOT NULL DEFAULT false,
  block_type    TEXT        NOT NULL DEFAULT 'manual'
                  CHECK (block_type IN ('vacation','maintenance','absence','event','manual')),
  notes         TEXT,
  color         TEXT        NOT NULL DEFAULT '#374151',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_block_range CHECK (ends_at > starts_at)
);

ALTER TABLE service_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_blocks;
CREATE POLICY "owner_all" ON service_blocks
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sbl_restaurant
  ON service_blocks(restaurant_id, starts_at, ends_at);

-- ─── TRIGGERS updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION booking_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_service_catalog_uat ON service_catalog;
CREATE TRIGGER trg_service_catalog_uat
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW EXECUTE FUNCTION booking_engine_update_updated_at();

DROP TRIGGER IF EXISTS trg_service_bookings_uat ON service_bookings;
CREATE TRIGGER trg_service_bookings_uat
  BEFORE UPDATE ON service_bookings
  FOR EACH ROW EXECUTE FUNCTION booking_engine_update_updated_at();
