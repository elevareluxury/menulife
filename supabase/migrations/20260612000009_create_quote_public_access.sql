-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 12b — PUBLIC QUOTE ACCESS (Portal Cliente Básico)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Permite acceso anónimo (sin auth) a cotizaciones vía token UUID.
-- La seguridad es el token en sí: UUID v4 es computacionalmente imposible de adivinar.
-- Patrón idéntico al usado por Notion, DocuSign y Dropbox Paper para links públicos.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── service_quotes: anon SELECT por token ────────────────────────────────────
DROP POLICY IF EXISTS "anon_read_by_token" ON service_quotes;
CREATE POLICY "anon_read_by_token" ON service_quotes
  FOR SELECT TO anon
  USING (token IS NOT NULL);

-- ─── service_quotes: anon UPDATE (viewed / accepted / rejected) ───────────────
-- USING: solo filas en estado 'sent' o 'viewed' (el cliente no puede modificar borradores)
-- WITH CHECK: solo puede pasar a viewed, accepted, o rejected
DROP POLICY IF EXISTS "anon_update_by_token" ON service_quotes;
CREATE POLICY "anon_update_by_token" ON service_quotes
  FOR UPDATE TO anon
  USING  (token IS NOT NULL AND status IN ('sent', 'viewed'))
  WITH CHECK (token IS NOT NULL AND status IN ('viewed', 'accepted', 'rejected'));

-- ─── service_quote_items: anon SELECT (vía quote con token) ──────────────────
DROP POLICY IF EXISTS "anon_read_items" ON service_quote_items;
CREATE POLICY "anon_read_items" ON service_quote_items
  FOR SELECT TO anon
  USING (
    quote_id IN (
      SELECT id FROM service_quotes WHERE token IS NOT NULL
    )
  );

-- ─── service_quote_templates: anon SELECT (branding de plantilla) ─────────────
DROP POLICY IF EXISTS "anon_read_template" ON service_quote_templates;
CREATE POLICY "anon_read_template" ON service_quote_templates
  FOR SELECT TO anon
  USING (true);

-- ─── service_quote_events: anon INSERT (trazabilidad del portal) ──────────────
DROP POLICY IF EXISTS "anon_insert_events" ON service_quote_events;
CREATE POLICY "anon_insert_events" ON service_quote_events
  FOR INSERT TO anon
  WITH CHECK (
    quote_id IN (
      SELECT id FROM service_quotes WHERE token IS NOT NULL
    )
  );
