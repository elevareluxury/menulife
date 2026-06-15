// ─── Supported locale codes (BCP-47) ─────────────────────────────────────────
export type LocaleCode = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'de' | 'ar' | 'zh' | 'ja' | 'ko' | 'hi'

export type CurrencyCode = string   // ISO 4217 — open string, not a union

export type TextDirection = 'ltr' | 'rtl'

export type DateFormat =
  | 'DD/MM/YYYY'  // LATAM, Europe
  | 'MM/DD/YYYY'  // US
  | 'YYYY-MM-DD'  // ISO 8601
  | 'DD-MM-YYYY'
  | 'DD.MM.YYYY'  // Germany, Austria

export type TimeFormat = '12h' | '24h'

// BCP-47 locale tag used by Intl.NumberFormat (primary options shown in UI)
export type NumberFormat =
  | 'en-US'   // 1,234.56
  | 'es-AR'   // 1.234,56
  | 'de-DE'   // 1.234,56
  | 'fr-FR'   // 1 234,56
  | 'pt-BR'   // 1.234,56
  | 'ja-JP'   // 1,234
  | string    // Accept any BCP-47 tag (for country catalog coverage)

// ─── Locale metadata per language ────────────────────────────────────────────
export interface LocaleMeta {
  dir:    TextDirection
  label:  string   // Native name, e.g. "Español"
  flag:   string   // Emoji flag
  bcp47:  string   // BCP-47 tag for Intl APIs
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export interface CurrencyInfo {
  code:     string
  symbol:   string
  name:     string
  decimals: number
}

// ─── Country catalog ─────────────────────────────────────────────────────────
export type TaxType = 'vat' | 'gst' | 'sales_tax' | 'iva' | 'none'

export interface CountryRecord {
  code:          string        // ISO 3166-1 alpha-2
  name:          string        // English name
  name_local:    string        // Name in country's primary language
  currency:      CurrencyCode
  timezone:      string        // IANA default (most populated city)
  locale:        string        // BCP-47
  phone_prefix:  string        // e.g. '+54'
  date_format:   DateFormat
  number_format: NumberFormat
  tax_type:      TaxType
  tax_name:      string        // 'IVA', 'VAT', 'GST', 'Sales Tax'
  tax_rate:      number        // Default rate, e.g. 0.21 — informational only
  rtl:           boolean
}

// ─── Tax architecture (calculate: not implemented, model: ready) ──────────────
export interface TaxConfig {
  type:        TaxType
  name:        string          // Display: 'IVA 21%', 'VAT 20%'
  rate:        number          // 0–1, e.g. 0.21
  inclusive:   boolean         // true = tax included in price, false = added on top
  applies_to:  'all' | 'services' | 'goods' | 'food'
}

// ─── Locale config per restaurant / organization ──────────────────────────────
export interface LocaleConfig {
  language:      LocaleCode
  currency:      CurrencyCode
  timezone:      string
  date_format:   DateFormat
  time_format:   TimeFormat
  number_format: NumberFormat
  rtl:           boolean
  country:       string        // ISO 3166-1 alpha-2
}

// ─── FX-ready: architecture prepared, provider not implemented ────────────────
export interface ExchangeRate {
  from:       CurrencyCode
  to:         CurrencyCode
  rate:       number
  source:     'manual' | 'fixer' | 'openexchangerates'
  fetched_at: string           // ISO 8601 UTC
}
