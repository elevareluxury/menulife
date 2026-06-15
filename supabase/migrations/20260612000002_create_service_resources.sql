-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 2 — SERVICE RESOURCES ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_resource_types     — tipos de recurso (sistema + personalizados por negocio)
--   • service_resources          — instancias de recursos (salas, personas, equipos, etc.)
--   • service_resource_schedules — horarios disponibles por recurso y día de semana
--   • service_resource_blocks    — bloqueos puntuales de recurso (vacaciones, mantenimiento)
--   • storage bucket             — 'service-resources' (imágenes de recursos, público)
--   • RLS: "owner_all" via auth.uid() — convención del proyecto
--   • restaurant_id es el anchor de organización
--   • location_id UUID nullable sin FK — forward-compat multi-local
--   • day_of_week: 0 = Domingo (estándar JS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 0. STORAGE BUCKET ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-resources',
  'service-resources',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — path debe comenzar con restaurant_id del owner
DROP POLICY IF EXISTS "owner_all_resource_objects" ON storage.objects;
CREATE POLICY "owner_all_resource_objects" ON storage.objects
  FOR ALL USING (
    bucket_id = 'service-resources'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 1. TIPOS DE RECURSO ──────────────────────────────────────────────────────
--
-- is_system = true  → tipo creado por MenuLife, visible para todos los negocios
-- is_system = false → tipo personalizado por el negocio (restaurant_id NOT NULL)
--
CREATE TABLE IF NOT EXISTS service_resource_types (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  icon          TEXT        NOT NULL DEFAULT 'Box',
  color         TEXT        NOT NULL DEFAULT '#6B7280',
  is_system     BOOLEAN     NOT NULL DEFAULT false,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_resource_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_resource_types
  FOR ALL USING (
    is_system = true
    OR restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_srt_restaurant
  ON service_resource_types(restaurant_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_srt_system
  ON service_resource_types(is_system, is_active);

-- Seed: 7 tipos de sistema
INSERT INTO service_resource_types (name, icon, color, is_system, sort_order) VALUES
  ('Persona',     'User',       '#3B82F6', true, 0),
  ('Sala',        'DoorOpen',   '#8B5CF6', true, 1),
  ('Consultorio', 'CircleDot',  '#22C55E', true, 2),
  ('Vehículo',    'Car',        '#F59E0B', true, 3),
  ('Equipo',      'Wrench',     '#6B7280', true, 4),
  ('Estudio',     'Mic2',       '#EC4899', true, 5),
  ('Otro',        'Box',        '#6B7280', true, 6)
ON CONFLICT DO NOTHING;

-- ─── 2. RECURSOS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_resources (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  location_id      UUID,
  resource_type_id UUID        REFERENCES service_resource_types(id) ON DELETE SET NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  status           TEXT        NOT NULL DEFAULT 'available'
                     CHECK (status IN ('active','inactive','available','busy','maintenance','blocked')),
  capacity         INT         NOT NULL DEFAULT 1,
  color            TEXT        NOT NULL DEFAULT '#6B7280',
  image_url        TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order       INT         NOT NULL DEFAULT 0,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_resources
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sr_restaurant
  ON service_resources(restaurant_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_sr_type
  ON service_resources(resource_type_id) WHERE resource_type_id IS NOT NULL;

-- ─── 3. HORARIOS DE RECURSO ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_resource_schedules (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id   UUID        NOT NULL REFERENCES service_resources(id) ON DELETE CASCADE,
  restaurant_id UUID        NOT NULL,
  day_of_week   INT         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_id, day_of_week)
);

ALTER TABLE service_resource_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_resource_schedules
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_srs_resource
  ON service_resource_schedules(resource_id, day_of_week);

-- ─── 4. BLOQUEOS DE RECURSO ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_resource_blocks (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id   UUID        NOT NULL REFERENCES service_resources(id) ON DELETE CASCADE,
  restaurant_id UUID        NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_resource_block_range CHECK (ends_at > starts_at)
);

ALTER TABLE service_resource_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON service_resource_blocks
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_srb_resource_range
  ON service_resource_blocks(resource_id, starts_at, ends_at);

-- ─── 5. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION service_resources_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_service_resource_types_uat
  BEFORE UPDATE ON service_resource_types
  FOR EACH ROW EXECUTE FUNCTION service_resources_update_updated_at();

CREATE TRIGGER trg_service_resources_uat
  BEFORE UPDATE ON service_resources
  FOR EACH ROW EXECUTE FUNCTION service_resources_update_updated_at();
