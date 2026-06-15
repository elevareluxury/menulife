-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 10 — FORMS ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_form_templates   — estructuras reutilizables (Ficha / Registro / Brief / etc.)
--   • service_form_fields      — campos del formulario, motor universal de tipos
--   • service_form_submissions — respuestas completadas, JSONB por diseño (schema-less)
--   • field_visibility_rules   — JSONB preparado para lógica condicional futura
--   • slug único global        — forward-compat para /forms/:slug (public forms)
--   • GIN index en data_json   — forward-compat para búsqueda dentro de respuestas
--   • RLS: "owner_all" via auth.uid() — convención del proyecto
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. FORM TEMPLATES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_form_templates (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','archived')),
  is_public     BOOLEAN     NOT NULL DEFAULT false,
  slug          TEXT        UNIQUE,
  sort_order    INT         NOT NULL DEFAULT 0,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_form_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_form_templates;
CREATE POLICY "owner_all" ON service_form_templates
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sft_restaurant
  ON service_form_templates(restaurant_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_sft_slug
  ON service_form_templates(slug) WHERE slug IS NOT NULL;

-- ─── 2. FORM FIELDS ──────────────────────────────────────────────────────────
--
-- field_visibility_rules JSONB — estructura esperada (validada en app, no en DB):
-- { "conditions": [{ "field_id": "uuid", "operator": "eq|neq|contains|gt|lt", "value": "any" }],
--   "logic": "AND|OR", "action": "show|hide" }
-- {} = sin condiciones = siempre visible
--
CREATE TABLE IF NOT EXISTS service_form_fields (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id            UUID        NOT NULL REFERENCES service_form_templates(id) ON DELETE CASCADE,
  restaurant_id          UUID        NOT NULL,
  type                   TEXT        NOT NULL
                           CHECK (type IN (
                             'text','textarea','number','email','phone',
                             'date','datetime','select','multiselect','radio',
                             'checkbox','file','signature','url',
                             'currency','rating','boolean'
                           )),
  label                  TEXT        NOT NULL,
  placeholder            TEXT,
  help_text              TEXT,
  required               BOOLEAN     NOT NULL DEFAULT false,
  sort_order             INT         NOT NULL DEFAULT 0,
  settings_json          JSONB       NOT NULL DEFAULT '{}',
  field_visibility_rules JSONB       NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_form_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_form_fields;
CREATE POLICY "owner_all" ON service_form_fields
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sff_template
  ON service_form_fields(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sff_restaurant
  ON service_form_fields(restaurant_id);

-- ─── 3. FORM SUBMISSIONS ─────────────────────────────────────────────────────
--
-- data_json keyed por field.id (UUID) — inmune a renombrado de labels:
-- { "field-uuid-1": "valor", "field-uuid-2": ["opcion_a", "opcion_b"] }
--
-- GIN index habilita búsqueda: data_json @> '{"field-uuid": "maní"}'
--
CREATE TABLE IF NOT EXISTS service_form_submissions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  template_id   UUID        NOT NULL REFERENCES service_form_templates(id),
  customer_id   UUID        REFERENCES service_customers(id),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by  TEXT,
  data_json     JSONB       NOT NULL DEFAULT '{}',
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_form_submissions;
CREATE POLICY "owner_all" ON service_form_submissions
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sfs_restaurant_template
  ON service_form_submissions(restaurant_id, template_id);
CREATE INDEX IF NOT EXISTS idx_sfs_customer
  ON service_form_submissions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sfs_submitted_at
  ON service_form_submissions(restaurant_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfs_data_gin
  ON service_form_submissions USING gin(data_json);

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION forms_engine_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sft_updated_at ON service_form_templates;
CREATE TRIGGER trg_sft_updated_at
  BEFORE UPDATE ON service_form_templates
  FOR EACH ROW EXECUTE FUNCTION forms_engine_update_updated_at();

DROP TRIGGER IF EXISTS trg_sff_updated_at ON service_form_fields;
CREATE TRIGGER trg_sff_updated_at
  BEFORE UPDATE ON service_form_fields
  FOR EACH ROW EXECUTE FUNCTION forms_engine_update_updated_at();
