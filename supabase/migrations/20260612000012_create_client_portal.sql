-- ═══════════════════════════════════════════════════════════════════════════════
-- FASE 15 — CLIENT PORTAL (La Experiencia del Cliente)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- DISEÑO:
--   • service_client_portal_accounts — identidad del cliente en el portal
--   • service_portal_magic_links     — códigos OTP temporales (V1 sin email)
--   • service_portal_sessions        — sesiones autenticadas con token UUID
--   • analytics_events               — registro de actividad del cliente
--   • RPCs SECURITY DEFINER          — único punto de acceso (no RLS directo)
--
--   AUTH V1:  email + código 6 dígitos (Magic Link sin email service)
--   AUTH V2:  email delivery via Edge Function (futura)
--   AUTH V3:  SSO / OAuth (campo sso_provider preparado)
--
--   SEGURIDAD: Toda lectura de datos pasa por RPCs con verificación de sesión.
--              Las políticas RLS existentes no se modifican.
--              Un cliente solo ve SUS datos en SU restaurante.
--
--   MULTI-BUSINESS READY: identity_layer JSONB en cuentas, preparado para
--              portal_global_identities (future) que mapea email → múltiples negocios.
--
--   WALLET LAYER: wallet_layer JSONB preparado para créditos, puntos, gift cards.
--   AI READY:   analytics_events alimentará IA futura de respuestas al cliente.
--   OFFLINE:    service worker cache (implementar en frontend, no en DB).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. PORTAL ACCOUNTS ──────────────────────────────────────────────────────
--   Una cuenta por (email, restaurant_id).
--   Multi-business future: portal_global_identities tabla que vincula email → N cuentas.
CREATE TABLE IF NOT EXISTS service_client_portal_accounts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID        NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  password_hash   TEXT,                    -- reservado (no usar en V1)
  last_login      TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deleted')),

  -- ── Identity Layer (Multi-business / SSO future) ──────────────────────────
  -- identity_layer.global_id        → futura identidad unificada
  -- identity_layer.sso_provider     → 'google'|'apple'|'microsoft'
  -- identity_layer.sso_subject      → ID externo del proveedor SSO
  identity_layer  JSONB       NOT NULL DEFAULT '{}',

  -- ── Wallet Layer (Créditos / Puntos / Gift Cards / Rewards future) ─────────
  -- wallet_layer.credits            → saldo de créditos
  -- wallet_layer.points             → puntos acumulados
  -- wallet_layer.gift_cards         → [{code, balance, expires_at}]
  -- wallet_layer.tier               → 'standard'|'premium'|'vip'
  wallet_layer    JSONB       NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (customer_id, restaurant_id),
  UNIQUE (email, restaurant_id)
);

ALTER TABLE service_client_portal_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON service_client_portal_accounts;
CREATE POLICY "owner_all" ON service_client_portal_accounts
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_scpa_customer     ON service_client_portal_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_scpa_email_rest   ON service_client_portal_accounts(email, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_scpa_restaurant   ON service_client_portal_accounts(restaurant_id, status);

-- ─── 2. MAGIC LINKS / OTP ────────────────────────────────────────────────────
--   V1: código 6 dígitos generado en DB, retornado al cliente para pruebas.
--   V2: Edge Function envía código por email, DB almacena hash.
CREATE TABLE IF NOT EXISTS service_portal_magic_links (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_account_id UUID       NOT NULL REFERENCES service_client_portal_accounts(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL,
  restaurant_id    UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  -- V1: plain code. V2: bcrypt/sha256 hash. V3: remove.
  code             TEXT        NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  used_at          TIMESTAMPTZ,
  ip_address       TEXT,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_portal_magic_links ENABLE ROW LEVEL SECURITY;
-- Solo acceso anónimo para verificación vía RPC (no acceso directo)
-- RPCs usan SECURITY DEFINER para verificar sin RLS

CREATE INDEX IF NOT EXISTS idx_spml_account  ON service_portal_magic_links(portal_account_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_spml_email    ON service_portal_magic_links(email, restaurant_id, code)
  WHERE used_at IS NULL;

-- ─── 3. PORTAL SESSIONS ──────────────────────────────────────────────────────
--   token UUID generado por el cliente, guardado en localStorage.
--   Verificado en cada RPC (no hay cookies ni JWT propios).
CREATE TABLE IF NOT EXISTS service_portal_sessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token             UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  portal_account_id UUID        NOT NULL REFERENCES service_client_portal_accounts(id) ON DELETE CASCADE,
  customer_id       UUID        NOT NULL REFERENCES service_customers(id) ON DELETE CASCADE,
  restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  last_active_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address        TEXT,
  user_agent        TEXT,
  -- future: device_fingerprint, locale, timezone
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_portal_sessions ENABLE ROW LEVEL SECURITY;
-- Acceso solo vía RPC SECURITY DEFINER

CREATE INDEX IF NOT EXISTS idx_sps_token       ON service_portal_sessions(token) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_sps_account     ON service_portal_sessions(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_sps_customer    ON service_portal_sessions(customer_id, restaurant_id);

-- ─── 4. ANALYTICS EVENTS ─────────────────────────────────────────────────────
--   Registro de actividad del cliente en el portal.
--   Append-only. AI-ready. Feed para retargeting futuro.
CREATE TABLE IF NOT EXISTS analytics_events (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id       UUID        REFERENCES service_customers(id),
  portal_account_id UUID        REFERENCES service_client_portal_accounts(id),
  event_type        TEXT        NOT NULL
                      CHECK (event_type IN (
                        'portal_login',
                        'portal_logout',
                        'document_view',
                        'document_download',
                        'form_submit',
                        'form_view',
                        'quote_view',
                        'quote_accept',
                        'quote_reject',
                        'booking_view',
                        'booking_cancel',
                        'booking_reschedule',
                        'membership_view',
                        'package_view',
                        'profile_update',
                        'page_view',
                        'future'
                      )),
  entity_type       TEXT,        -- 'booking'|'quote'|'document'|etc.
  entity_id         UUID,        -- ID de la entidad relacionada
  metadata          JSONB       NOT NULL DEFAULT '{}',
  session_id        UUID        REFERENCES service_portal_sessions(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_read" ON analytics_events;
CREATE POLICY "owner_read" ON analytics_events
  FOR SELECT USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
-- Inserción solo vía RPC SECURITY DEFINER (anon no puede insertar directamente)

CREATE INDEX IF NOT EXISTS idx_ae_restaurant   ON analytics_events(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_customer     ON analytics_events(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ae_type         ON analytics_events(restaurant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_session      ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPCs SECURITY DEFINER — Único punto de acceso al portal
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── HELPER: Validar sesión y retornar context ───────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_session_context(p_token UUID)
RETURNS TABLE(customer_id UUID, restaurant_id UUID, portal_account_id UUID, session_id UUID)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE service_portal_sessions SET last_active_at = NOW()
  WHERE token = p_token AND expires_at > NOW()
  RETURNING
    service_portal_sessions.customer_id,
    service_portal_sessions.restaurant_id,
    service_portal_sessions.portal_account_id,
    service_portal_sessions.id;
END; $$;

-- ─── REQUEST MAGIC LINK (V1: retorna code para testing) ─────────────────────
CREATE OR REPLACE FUNCTION portal_request_magic_link(
  p_email         TEXT,
  p_restaurant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_customer    RECORD;
  v_account     RECORD;
  v_code        TEXT;
BEGIN
  -- Find customer by email in this restaurant
  SELECT * INTO v_customer
  FROM service_customers
  WHERE restaurant_id = p_restaurant_id
    AND LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'email_not_found');
  END IF;

  -- Upsert portal account
  INSERT INTO service_client_portal_accounts (customer_id, restaurant_id, email)
  VALUES (v_customer.id, p_restaurant_id, LOWER(p_email))
  ON CONFLICT (customer_id, restaurant_id) DO UPDATE SET
    updated_at = NOW()
  RETURNING * INTO v_account;

  -- Generate 6-digit code
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');

  -- Invalidate previous unused codes
  UPDATE service_portal_magic_links
  SET used_at = NOW()
  WHERE portal_account_id = v_account.id AND used_at IS NULL;

  -- Insert new code (15 min expiry)
  INSERT INTO service_portal_magic_links (portal_account_id, email, restaurant_id, code)
  VALUES (v_account.id, LOWER(p_email), p_restaurant_id, v_code);

  -- V1: Return code in response (dev mode — remove in V2 when email is integrated)
  RETURN json_build_object(
    'success',        true,
    'dev_code',       v_code,  -- REMOVE in V2 production
    'customer_name',  v_customer.full_name
  );
END; $$;

-- ─── VERIFY CODE → Create session ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_verify_code(
  p_email         TEXT,
  p_code          TEXT,
  p_restaurant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_link    RECORD;
  v_account RECORD;
  v_token   UUID := gen_random_uuid();
BEGIN
  -- Find valid, unused magic link
  SELECT ml.*, pa.customer_id, pa.id AS account_id
  INTO v_link
  FROM service_portal_magic_links ml
  JOIN service_client_portal_accounts pa ON pa.id = ml.portal_account_id
  WHERE LOWER(ml.email) = LOWER(p_email)
    AND ml.restaurant_id = p_restaurant_id
    AND ml.code = p_code
    AND ml.expires_at > NOW()
    AND ml.used_at IS NULL
  ORDER BY ml.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_or_expired_code');
  END IF;

  -- Mark code as used
  UPDATE service_portal_magic_links SET used_at = NOW() WHERE id = v_link.id;

  -- Update last login
  UPDATE service_client_portal_accounts SET last_login = NOW() WHERE id = v_link.account_id;

  -- Create session (30-day expiry)
  INSERT INTO service_portal_sessions (token, portal_account_id, customer_id, restaurant_id)
  VALUES (v_token, v_link.account_id, v_link.customer_id, p_restaurant_id);

  -- Fetch customer name
  SELECT full_name INTO v_account FROM service_customers WHERE id = v_link.customer_id;

  RETURN json_build_object(
    'success',        true,
    'token',          v_token,
    'customer_id',    v_link.customer_id,
    'customer_name',  v_account.full_name
  );
END; $$;

-- ─── GET HOME (lightweight summary) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_home(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx         RECORD;
  v_customer    RECORD;
  v_next_bk     RECORD;
  v_membership  RECORD;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  -- Customer basic data
  SELECT id, full_name, email, phone FROM service_customers
  WHERE id = v_ctx.customer_id INTO v_customer;

  -- Next upcoming booking
  SELECT id, title, starts_at, status,
         (SELECT name FROM service_catalog WHERE id = catalog_id) AS service_name
  INTO v_next_bk
  FROM service_bookings
  WHERE restaurant_id = v_ctx.restaurant_id
    AND client_id = v_ctx.customer_id
    AND starts_at > NOW()
    AND status NOT IN ('cancelled','no_show','rescheduled')
  ORDER BY starts_at ASC LIMIT 1;

  -- Active membership
  SELECT sm.id, sm.status, sm.ends_at, smp.name, smp.color
  INTO v_membership
  FROM service_memberships sm
  JOIN service_membership_plans smp ON smp.id = sm.plan_id
  WHERE sm.restaurant_id = v_ctx.restaurant_id
    AND sm.customer_id = v_ctx.customer_id
    AND sm.status = 'active'
  ORDER BY sm.created_at DESC LIMIT 1;

  RETURN json_build_object(
    'success',          true,
    'customer',         json_build_object(
                          'id',        v_customer.id,
                          'full_name', v_customer.full_name,
                          'email',     v_customer.email,
                          'phone',     v_customer.phone
                        ),
    'next_booking',     CASE WHEN v_next_bk.id IS NOT NULL THEN
                          json_build_object(
                            'id',           v_next_bk.id,
                            'title',        v_next_bk.title,
                            'starts_at',    v_next_bk.starts_at,
                            'service_name', v_next_bk.service_name,
                            'status',       v_next_bk.status
                          ) ELSE NULL END,
    'membership',       CASE WHEN v_membership.id IS NOT NULL THEN
                          json_build_object(
                            'id',       v_membership.id,
                            'name',     v_membership.name,
                            'status',   v_membership.status,
                            'ends_at',  v_membership.ends_at,
                            'color',    v_membership.color
                          ) ELSE NULL END,
    'packages_active',  (SELECT COUNT(*) FROM service_packages
                         WHERE restaurant_id = v_ctx.restaurant_id
                           AND customer_id   = v_ctx.customer_id
                           AND status        = 'active'),
    'pending_quotes',   (SELECT COUNT(*) FROM service_quotes
                         WHERE restaurant_id = v_ctx.restaurant_id
                           AND customer_id   = v_ctx.customer_id
                           AND status IN ('sent','viewed')),
    'pending_docs',     (SELECT COUNT(*) FROM service_documents sd
                         JOIN service_document_links sdl ON sdl.document_id = sd.id
                         WHERE sd.restaurant_id = v_ctx.restaurant_id
                           AND sdl.entity_type  = 'customer'
                           AND sdl.entity_id    = v_ctx.customer_id
                           AND sd.status        = 'pending'
                           AND sd.document_visibility IN ('customer','public')),
    'forms_count',      (SELECT COUNT(*) FROM service_form_submissions
                         WHERE restaurant_id = v_ctx.restaurant_id
                           AND customer_id   = v_ctx.customer_id)
  );
END; $$;

-- ─── GET BOOKINGS ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_bookings(
  p_token         UUID,
  p_filter        TEXT    DEFAULT 'upcoming',   -- 'upcoming'|'past'|'cancelled'
  p_limit         INT     DEFAULT 20,
  p_offset        INT     DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(b)) INTO v_rows
  FROM (
    SELECT
      sb.id, sb.title, sb.starts_at, sb.ends_at, sb.status, sb.notes,
      sb.duration_minutes, sb.modality, sb.meet_url,
      (SELECT name FROM service_catalog WHERE id = sb.catalog_id) AS service_name,
      (SELECT color FROM service_catalog WHERE id = sb.catalog_id) AS service_color,
      sb.created_at
    FROM service_bookings sb
    WHERE sb.restaurant_id = v_ctx.restaurant_id
      AND sb.client_id     = v_ctx.customer_id
      AND CASE p_filter
            WHEN 'upcoming'   THEN sb.starts_at > NOW() AND sb.status NOT IN ('cancelled','no_show','rescheduled')
            WHEN 'past'       THEN sb.starts_at < NOW() AND sb.status IN ('completed','in_progress')
            WHEN 'cancelled'  THEN sb.status IN ('cancelled','no_show','rescheduled')
            ELSE TRUE
          END
    ORDER BY CASE WHEN p_filter = 'upcoming' THEN sb.starts_at END ASC,
             CASE WHEN p_filter != 'upcoming' THEN sb.starts_at END DESC
    LIMIT p_limit OFFSET p_offset
  ) b;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── CANCEL BOOKING ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_cancel_booking(p_token UUID, p_booking_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ctx RECORD;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  UPDATE service_bookings
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_booking_id
    AND restaurant_id = v_ctx.restaurant_id
    AND client_id     = v_ctx.customer_id
    AND status NOT IN ('cancelled','completed','no_show');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found_or_not_cancellable');
  END IF;

  RETURN json_build_object('success', true);
END; $$;

-- ─── GET MEMBERSHIPS ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_memberships(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(m)) INTO v_rows
  FROM (
    SELECT
      sm.id, sm.status, sm.starts_at, sm.ends_at, sm.renewal_date,
      sm.auto_renew, sm.health, sm.notes, sm.created_at,
      smp.name AS plan_name, smp.color AS plan_color,
      smp.price, smp.currency, smp.description AS plan_description
    FROM service_memberships sm
    JOIN service_membership_plans smp ON smp.id = sm.plan_id
    WHERE sm.restaurant_id = v_ctx.restaurant_id
      AND sm.customer_id   = v_ctx.customer_id
    ORDER BY
      CASE sm.status WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
      sm.created_at DESC
  ) m;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── GET PACKAGES ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_packages(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(p)) INTO v_rows
  FROM (
    SELECT
      sp.id, sp.status, sp.starts_at, sp.expires_at, sp.consumption,
      sp.notes, sp.created_at,
      spt.name AS template_name, spt.color AS template_color,
      spt.price, spt.currency, spt.items AS template_items,
      spt.validity_days
    FROM service_packages sp
    LEFT JOIN service_package_templates spt ON spt.id = sp.template_id
    WHERE sp.restaurant_id = v_ctx.restaurant_id
      AND sp.customer_id   = v_ctx.customer_id
    ORDER BY CASE sp.status WHEN 'active' THEN 1 ELSE 2 END, sp.created_at DESC
  ) p;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── GET DOCUMENTS ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_documents(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(d)) INTO v_rows
  FROM (
    SELECT DISTINCT
      sd.id, sd.title, sd.description, sd.file_name, sd.file_extension,
      sd.mime_type, sd.status, sd.document_visibility, sd.storage_path,
      sd.expiration_date, sd.created_at
    FROM service_documents sd
    JOIN service_document_links sdl ON sdl.document_id = sd.id
    WHERE sd.restaurant_id         = v_ctx.restaurant_id
      AND sdl.entity_type          = 'customer'
      AND sdl.entity_id            = v_ctx.customer_id
      AND sd.document_visibility  IN ('customer','public')
      AND sd.status               <> 'deleted'
      AND sd.deleted_at           IS NULL
    ORDER BY sd.created_at DESC
    LIMIT 50
  ) d;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── GET FORMS ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_forms(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(f)) INTO v_rows
  FROM (
    SELECT
      sfs.id, sfs.submitted_at, sfs.created_at,
      sft.name AS form_name, sft.description AS form_description
    FROM service_form_submissions sfs
    JOIN service_form_templates sft ON sft.id = sfs.template_id
    WHERE sfs.restaurant_id = v_ctx.restaurant_id
      AND sfs.customer_id   = v_ctx.customer_id
    ORDER BY sfs.submitted_at DESC
    LIMIT 50
  ) f;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── GET QUOTES ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_get_quotes(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx  RECORD;
  v_rows JSON;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT json_agg(row_to_json(q)) INTO v_rows
  FROM (
    SELECT
      sq.id, sq.quote_number, sq.title, sq.status, sq.total, sq.currency,
      sq.expires_at, sq.notes, sq.token, sq.created_at,
      (SELECT json_agg(json_build_object(
        'name', i.name, 'quantity', i.quantity, 'unit_price', i.unit_price, 'total', i.total
      )) FROM service_quote_items i WHERE i.quote_id = sq.id) AS items
    FROM service_quotes sq
    WHERE sq.restaurant_id = v_ctx.restaurant_id
      AND sq.customer_id   = v_ctx.customer_id
      AND sq.status        <> 'draft'
    ORDER BY
      CASE WHEN sq.status IN ('sent','viewed') THEN 1 ELSE 2 END,
      sq.created_at DESC
    LIMIT 30
  ) q;

  RETURN json_build_object('success', true, 'data', COALESCE(v_rows, '[]'::JSON));
END; $$;

-- ─── ACCEPT / REJECT QUOTE ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_respond_quote(
  p_token    UUID,
  p_quote_id UUID,
  p_action   TEXT   -- 'accept' | 'reject'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ctx    RECORD;
  v_status TEXT := CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'rejected' END;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  UPDATE service_quotes
  SET status = v_status, updated_at = NOW()
  WHERE id            = p_quote_id
    AND restaurant_id = v_ctx.restaurant_id
    AND customer_id   = v_ctx.customer_id
    AND status IN ('sent','viewed');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_actionable');
  END IF;

  -- Log event
  INSERT INTO analytics_events (restaurant_id, customer_id, portal_account_id, event_type, entity_type, entity_id)
  VALUES (v_ctx.restaurant_id, v_ctx.customer_id, v_ctx.portal_account_id,
          CASE WHEN p_action = 'accept' THEN 'quote_accept' ELSE 'quote_reject' END,
          'quote', p_quote_id);

  RETURN json_build_object('success', true, 'new_status', v_status);
END; $$;

-- ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_update_profile(
  p_token      UUID,
  p_full_name  TEXT     DEFAULT NULL,
  p_phone      TEXT     DEFAULT NULL,
  p_email      TEXT     DEFAULT NULL,
  p_notes      TEXT     DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ctx RECORD;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'invalid_session'); END IF;

  UPDATE service_customers SET
    full_name  = COALESCE(NULLIF(p_full_name,''), full_name),
    phone      = COALESCE(NULLIF(p_phone,''), phone),
    email      = COALESCE(NULLIF(p_email,''), email),
    notes      = COALESCE(NULLIF(p_notes,''), notes)
  WHERE id = v_ctx.customer_id;

  -- Log event
  INSERT INTO analytics_events (restaurant_id, customer_id, portal_account_id, event_type)
  VALUES (v_ctx.restaurant_id, v_ctx.customer_id, v_ctx.portal_account_id, 'profile_update');

  RETURN json_build_object('success', true);
END; $$;

-- ─── LOG EVENT ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_log_event(
  p_token       UUID,
  p_event_type  TEXT,
  p_entity_type TEXT    DEFAULT NULL,
  p_entity_id   UUID    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ctx RECORD;
BEGIN
  SELECT * INTO v_ctx FROM portal_get_session_context(p_token) LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO analytics_events
    (restaurant_id, customer_id, portal_account_id, event_type, entity_type, entity_id, metadata, session_id)
  SELECT
    v_ctx.restaurant_id, v_ctx.customer_id, v_ctx.portal_account_id,
    p_event_type, p_entity_type, p_entity_id, p_metadata,
    v_ctx.session_id
  WHERE p_event_type IN (
    'portal_login','portal_logout','document_view','document_download',
    'form_submit','form_view','quote_view','quote_accept','quote_reject',
    'booking_view','booking_cancel','booking_reschedule','membership_view',
    'package_view','profile_update','page_view','future'
  );
EXCEPTION WHEN OTHERS THEN NULL; -- silent, never blocks UX
END; $$;

-- ─── UPDATED_AT trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION portal_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_scpa_updated_at ON service_client_portal_accounts;
CREATE TRIGGER trg_scpa_updated_at BEFORE UPDATE ON service_client_portal_accounts
  FOR EACH ROW EXECUTE FUNCTION portal_set_updated_at();
