// ─── Currency Layer ───────────────────────────────────────────────────────────
// RULE: NEVER concatenate "$" + amount. ALWAYS use formatCurrency().
// Powered by Intl.NumberFormat — no external dependency.

import type { CurrencyInfo } from '@/modules/globalization/globalizationTypes'

export const CURRENCIES: Record<string, CurrencyInfo> = {
  // Americas
  USD: { code: 'USD', symbol: '$',    name: 'US Dollar',          decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar',    decimals: 2 },
  MXN: { code: 'MXN', symbol: '$',    name: 'Mexican Peso',       decimals: 2 },
  ARS: { code: 'ARS', symbol: '$',    name: 'Argentine Peso',     decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',     decimals: 2 },
  CLP: { code: 'CLP', symbol: '$',    name: 'Chilean Peso',       decimals: 0 },
  COP: { code: 'COP', symbol: '$',    name: 'Colombian Peso',     decimals: 0 },
  PEN: { code: 'PEN', symbol: 'S/',   name: 'Peruvian Sol',       decimals: 2 },
  UYU: { code: 'UYU', symbol: '$',    name: 'Uruguayan Peso',     decimals: 2 },
  PYG: { code: 'PYG', symbol: '₲',   name: 'Paraguayan Guaraní', decimals: 0 },
  BOB: { code: 'BOB', symbol: 'Bs.',  name: 'Bolivian Boliviano', decimals: 2 },
  GTQ: { code: 'GTQ', symbol: 'Q',    name: 'Guatemalan Quetzal', decimals: 2 },
  CRC: { code: 'CRC', symbol: '₡',   name: 'Costa Rican Colón',  decimals: 2 },
  // Europe
  EUR: { code: 'EUR', symbol: '€',    name: 'Euro',               decimals: 2 },
  GBP: { code: 'GBP', symbol: '£',    name: 'British Pound',      decimals: 2 },
  CHF: { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc',        decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',      decimals: 2 },
  NOK: { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',    decimals: 2 },
  DKK: { code: 'DKK', symbol: 'kr',   name: 'Danish Krone',       decimals: 2 },
  PLN: { code: 'PLN', symbol: 'zł',   name: 'Polish Złoty',       decimals: 2 },
  TRY: { code: 'TRY', symbol: '₺',   name: 'Turkish Lira',       decimals: 2 },
  // Asia-Pacific
  JPY: { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',       decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',       decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩',   name: 'South Korean Won',   decimals: 0 },
  INR: { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',  decimals: 2 },
  NZD: { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',   decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',   decimals: 2 },
  THB: { code: 'THB', symbol: '฿',    name: 'Thai Baht',          decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah',  decimals: 0 },
  // Middle East & Africa
  AED: { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham',         decimals: 2 },
  SAR: { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',        decimals: 2 },
  QAR: { code: 'QAR', symbol: 'ر.ق',  name: 'Qatari Riyal',       decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R',    name: 'South African Rand', decimals: 2 },
  EGP: { code: 'EGP', symbol: '£',    name: 'Egyptian Pound',     decimals: 2 },
  ILS: { code: 'ILS', symbol: '₪',   name: 'Israeli Shekel',     decimals: 2 },
}

/**
 * Format an amount as a currency string using Intl.NumberFormat.
 * NEVER concatenate symbol + amount. Always call this function.
 *
 * @example formatCurrency(1234.56, 'ARS', 'es-AR')  → '$1.234,56'
 * @example formatCurrency(1234.56, 'USD', 'en-US')  → '$1,234.56'
 * @example formatCurrency(1234.56, 'EUR', 'de-DE')  → '1.234,56 €'
 */
export function formatCurrency(
  amount:   number,
  currency: string,
  locale:   string = 'es-AR',
): string {
  const code = currency.toUpperCase()
  const info = CURRENCIES[code]
  try {
    return new Intl.NumberFormat(locale, {
      style:                 'currency',
      currency:              code,
      minimumFractionDigits: info?.decimals ?? 2,
      maximumFractionDigits: info?.decimals ?? 2,
    }).format(amount)
  } catch {
    // Unknown currency or unsupported locale — degrade gracefully
    const decimals = info?.decimals ?? 2
    return `${code} ${amount.toFixed(decimals)}`
  }
}

/**
 * Compact notation: 1,500,000 → '$1.5M' / '$1,5M'
 */
export function formatCurrencyCompact(
  amount:   number,
  currency: string,
  locale:   string = 'es-AR',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style:    'currency',
      currency: currency.toUpperCase(),
      notation: 'compact',
    }).format(amount)
  } catch {
    return formatCurrency(amount, currency, locale)
  }
}

/**
 * Extract the currency symbol for display (locale-aware).
 * @example getCurrencySymbol('ARS', 'es-AR') → '$'
 * @example getCurrencySymbol('EUR', 'de-DE') → '€'
 */
export function getCurrencySymbol(currency: string, locale: string = 'es-AR'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency', currency: currency.toUpperCase(),
    }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value ?? currency
  } catch {
    return CURRENCIES[currency.toUpperCase()]?.symbol ?? currency
  }
}

// Grouped options for currency selector UI
export const CURRENCY_OPTIONS = Object.values(CURRENCIES).map(c => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
  symbol: c.symbol,
}))
