-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 11 — DOCUMENTS ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_document_categories — categorías configurables por negocio
--   • service_documents           — archivo + metadata + versionado + visibilidad
--   • service_document_links      — relación polimórfica (document ↔ cualquier entidad)
--   • storage_path convention     — {restaurant_id}/{document_id}/{file_name}
--   • soft delete                 — deleted_at / deleted_by (nunca borrar físico)
--   • RLS: "owner_all" via auth.uid() — convención del proyecto
--   • Supabase Storage bucket     — 'service-documents' (50 MB max, privado)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. STORAGE BUCKET ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-documents',
  'service-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain', 'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — el path debe comenzar con restaurant_id del owner
DROP POLICY IF EXISTS "owner_all_objects" ON storage.objects;
CREATE POLICY "owner_all_objects" ON storage.objects
  FOR ALL USING (
    bucket_id = 'service-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ─── 2. DOCUMENT CATEGORIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_document_categories (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#6B7280',
  icon          TEXT        NOT NULL DEFAULT 'FileText',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_document_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_document_categories;
CREATE POLICY "owner_all" ON service_document_categories
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sdc_restaurant ON service_document_categories(restaurant_id, sort_order);

-- ─── 3. DOCUMENTS ────────────────────────────────────────────────────────────
--
-- version_number + parent_document_id → control de versiones (UI futura)
-- document_source                     → trazabilidad de origen
-- document_visibility                 → base para Portal Cliente
-- expiration_date                     → alertas de vencimiento (UI futura)
-- deleted_at / deleted_by             → soft delete — NUNCA borrar físicamente
--
CREATE TABLE IF NOT EXISTS service_documents (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id        UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  description          TEXT,
  file_name            TEXT        NOT NULL,
  file_extension       TEXT,
  file_size            BIGINT,
  mime_type            TEXT,
  storage_path         TEXT,
  storage_provider     TEXT        NOT NULL DEFAULT 'supabase'
                         CHECK (storage_provider IN ('supabase','s3','cloudflare_r2','future')),
  category_id          UUID        REFERENCES service_document_categories(id) ON DELETE SET NULL,
  uploaded_by          UUID,
  status               TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','archived','deleted','pending')),
  document_source      TEXT        NOT NULL DEFAULT 'manual'
                         CHECK (document_source IN ('manual','form','quote','portal','system','future')),
  document_visibility  TEXT        NOT NULL DEFAULT 'staff'
                         CHECK (document_visibility IN ('private','staff','customer','public')),
  version_number       INT         NOT NULL DEFAULT 1,
  parent_document_id   UUID        REFERENCES service_documents(id) ON DELETE SET NULL,
  expiration_date      DATE,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  deleted_at           TIMESTAMPTZ,
  deleted_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_documents;
CREATE POLICY "owner_all" ON service_documents
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sd_restaurant       ON service_documents(restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sd_category         ON service_documents(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sd_parent           ON service_documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sd_expiration       ON service_documents(restaurant_id, expiration_date) WHERE expiration_date IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_sd_title_search     ON service_documents USING GIN (to_tsvector('simple', title));

-- ─── 4. DOCUMENT LINKS (relación polimórfica) ─────────────────────────────────
--
-- entity_type / entity_id — sin FK específicas por diseño.
-- Permite conectar documentos con cualquier entidad presente o futura.
-- UNIQUE garantiza que un documento no se linkee dos veces a la misma entidad.
--
CREATE TABLE IF NOT EXISTS service_document_links (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  document_id   UUID        NOT NULL REFERENCES service_documents(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL
                  CHECK (entity_type IN ('customer','booking','membership','package','quote','form_submission','future')),
  entity_id     UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, entity_type, entity_id)
);

ALTER TABLE service_document_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_document_links;
CREATE POLICY "owner_all" ON service_document_links
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sdl_document        ON service_document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_sdl_entity          ON service_document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sdl_restaurant      ON service_document_links(restaurant_id);

-- ─── 5. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sdc_updated_at ON service_document_categories;
CREATE TRIGGER trg_sdc_updated_at BEFORE UPDATE ON service_document_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sd_updated_at ON service_documents;
CREATE TRIGGER trg_sd_updated_at BEFORE UPDATE ON service_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. SEED — CATEGORÍAS POR DEFECTO ────────────────────────────────────────
-- Estas categorías globales se crean una vez como referencia de UX.
-- Cada negocio podrá agregar/editar sus propias categorías.
-- (Vacío en migración — se crean on-demand por restaurant desde la app)
