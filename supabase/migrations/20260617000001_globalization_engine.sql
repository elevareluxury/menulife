-- ============================================================
-- FASE 17 — GLOBALIZATION ENGINE
-- Zero-breaking: all operations idempotent, no data loss.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. RESTAURANTS — drop ARS|USD currency constraint, add locale fields
-- ──────────────────────────────────────────────────────────────

-- Remove the CHECK constraint that locked currency to 'ARS'|'USD'
-- (constraint name may vary — search by column and table)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'restaurants'
    AND a.attname = 'default_currency'
    AND c.contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE restaurants DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Widen currency column to accept any ISO 4217 code
ALTER TABLE restaurants
  ALTER COLUMN default_currency TYPE TEXT;

-- Locale configuration columns (all nullable — fallback to org or system defaults)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS locale        TEXT,           -- BCP-47, e.g. 'es-AR', 'en-US'
  ADD COLUMN IF NOT EXISTS date_format   TEXT DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS time_format   TEXT DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'es-AR',
  ADD COLUMN IF NOT EXISTS timezone      TEXT;           -- IANA, e.g. 'America/Argentina/Buenos_Aires'

-- ──────────────────────────────────────────────────────────────
-- 2. ORGANIZATIONS — locale config columns
-- ──────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS locale        TEXT,
  ADD COLUMN IF NOT EXISTS date_format   TEXT DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS time_format   TEXT DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'es-AR',
  ADD COLUMN IF NOT EXISTS phone_prefix  TEXT;

-- ──────────────────────────────────────────────────────────────
-- 3. EXCHANGE RATES — FX-ready architecture (data not populated)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT    NOT NULL,
  to_currency   TEXT    NOT NULL,
  rate          NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source        TEXT    NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'fixer', 'openexchangerates', 'xe')),
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- RLS: owners can read rates (write via service_role only)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exchange_rates' AND policyname = 'exchange_rates_read_authenticated'
  ) THEN
    CREATE POLICY exchange_rates_read_authenticated
      ON exchange_rates FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to
  ON exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at
  ON exchange_rates(fetched_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 4. COUNTRY CONFIGS — server-side country catalog
--    Frontend static catalog (countries.ts) is the primary source.
--    This table enables server-side overrides and future RPC-based lookups.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS country_configs (
  country_code   TEXT PRIMARY KEY,    -- ISO 3166-1 alpha-2
  country_name   TEXT NOT NULL,
  currency       TEXT NOT NULL,       -- ISO 4217
  timezone       TEXT NOT NULL,       -- IANA primary timezone
  locale         TEXT NOT NULL,       -- BCP-47
  phone_prefix   TEXT NOT NULL,       -- e.g. '+54'
  date_format    TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  number_format  TEXT NOT NULL DEFAULT 'es-AR',
  tax_type       TEXT NOT NULL DEFAULT 'vat'
                 CHECK (tax_type IN ('vat', 'gst', 'sales_tax', 'iva', 'none')),
  tax_name       TEXT,
  tax_rate       NUMERIC(5,4) DEFAULT 0,
  rtl            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — public reference data
-- Seed with initial markets (ON CONFLICT DO NOTHING = idempotent)
INSERT INTO country_configs (country_code, country_name, currency, timezone, locale, phone_prefix, date_format, number_format, tax_type, tax_name, tax_rate, rtl) VALUES
  ('AR','Argentina',         'ARS','America/Argentina/Buenos_Aires','es-AR','+54', 'DD/MM/YYYY','es-AR','iva',       'IVA',     0.21,  FALSE),
  ('BR','Brasil',            'BRL','America/Sao_Paulo',             'pt-BR','+55', 'DD/MM/YYYY','pt-BR','vat',       'ICMS',    0.17,  FALSE),
  ('CL','Chile',             'CLP','America/Santiago',              'es-CL','+56', 'DD/MM/YYYY','es-AR','iva',       'IVA',     0.19,  FALSE),
  ('CO','Colombia',          'COP','America/Bogota',                'es-CO','+57', 'DD/MM/YYYY','es-AR','vat',       'IVA',     0.19,  FALSE),
  ('MX','México',            'MXN','America/Mexico_City',           'es-MX','+52', 'DD/MM/YYYY','es-AR','vat',       'IVA',     0.16,  FALSE),
  ('PE','Perú',              'PEN','America/Lima',                  'es-PE','+51', 'DD/MM/YYYY','es-AR','vat',       'IGV',     0.18,  FALSE),
  ('UY','Uruguay',           'UYU','America/Montevideo',            'es-UY','+598','DD/MM/YYYY','es-AR','iva',       'IVA',     0.22,  FALSE),
  ('US','United States',     'USD','America/New_York',              'en-US','+1',  'MM/DD/YYYY','en-US','sales_tax', 'Tax',     0.07,  FALSE),
  ('CA','Canada',            'CAD','America/Toronto',               'en-CA','+1',  'DD/MM/YYYY','en-US','gst',       'GST/HST', 0.13,  FALSE),
  ('ES','España',            'EUR','Europe/Madrid',                 'es-ES','+34', 'DD/MM/YYYY','es-AR','vat',       'IVA',     0.21,  FALSE),
  ('FR','France',            'EUR','Europe/Paris',                  'fr-FR','+33', 'DD/MM/YYYY','fr-FR','vat',       'TVA',     0.20,  FALSE),
  ('DE','Deutschland',       'EUR','Europe/Berlin',                 'de-DE','+49', 'DD.MM.YYYY','de-DE','vat',       'MwSt',    0.19,  FALSE),
  ('IT','Italia',            'EUR','Europe/Rome',                   'it-IT','+39', 'DD/MM/YYYY','de-DE','vat',       'IVA',     0.22,  FALSE),
  ('GB','United Kingdom',    'GBP','Europe/London',                 'en-GB','+44', 'DD/MM/YYYY','en-US','vat',       'VAT',     0.20,  FALSE),
  ('JP','Japan',             'JPY','Asia/Tokyo',                    'ja-JP','+81', 'YYYY-MM-DD','ja-JP','gst',       '消費税',   0.10,  FALSE),
  ('AU','Australia',         'AUD','Australia/Sydney',              'en-AU','+61', 'DD/MM/YYYY','en-US','gst',       'GST',     0.10,  FALSE),
  ('AE','UAE',               'AED','Asia/Dubai',                    'ar-AE','+971','DD/MM/YYYY','en-US','vat',       'VAT',     0.05,  TRUE ),
  ('SA','Saudi Arabia',      'SAR','Asia/Riyadh',                   'ar-SA','+966','DD/MM/YYYY','en-US','vat',       'VAT',     0.15,  TRUE ),
  ('SG','Singapore',         'SGD','Asia/Singapore',                'en-SG','+65', 'DD/MM/YYYY','en-US','gst',       'GST',     0.09,  FALSE),
  ('IN','India',             'INR','Asia/Kolkata',                  'hi-IN','+91', 'DD/MM/YYYY','en-US','gst',       'GST',     0.18,  FALSE)
ON CONFLICT (country_code) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 5. FEATURE FLAGS — globalization flags
-- ──────────────────────────────────────────────────────────────

INSERT INTO feature_flags (flag_key, is_enabled, description) VALUES
  ('globalization_multi_currency', FALSE, 'Multi-currency en precios y analytics'),
  ('globalization_rtl',            FALSE, 'Soporte Right-to-Left (Arabic/Hebrew)'),
  ('globalization_new_locales',    FALSE, 'Locales PT/FR/IT/DE activos en el panel')
ON CONFLICT (flag_key) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 6. INDEXES for new columns
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_restaurants_locale
  ON restaurants(locale) WHERE locale IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_timezone
  ON restaurants(timezone) WHERE timezone IS NOT NULL;
