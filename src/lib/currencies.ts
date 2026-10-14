// Monedas: las más usadas primero; el resto sale de la lista ISO 4217 del navegador.

export const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'ARS', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB',
  'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY', 'KRW', 'INR', 'RUB', 'AED', 'SAR', 'TRY', 'ZAR',
] as const

let all: string[] | null = null

export function allCurrencies(): string[] {
  if (all) return all
  let list: string[] = []
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    list = intl.supportedValuesOf?.('currency') ?? []
  } catch { /* navegador viejo */ }
  const rest = list.filter(c => !(POPULAR_CURRENCIES as readonly string[]).includes(c)).sort()
  all = [...POPULAR_CURRENCIES, ...rest]
  return all
}

export function currencyName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code
  } catch { return code }
}

export function currencySymbol(code: string, locale: string): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(p => p.type === 'currency')
    return part?.value ?? code
  } catch { return code }
}

/**
 * Importe con su moneda. Sin `decimals`: enteros sin decimales y, si hay centavos, con 2 (un café de 3,50 no se
 * muestra como 4). Monedas sin centavos (yen, won…) siguen sin decimales.
 */
export function formatMoney(amount: number, currency: string, locale: string, decimals?: number): string {
  const cents = Math.round(Math.abs(amount) * 100) % 100 !== 0
  try {
    const max = decimals ?? (cents ? Math.min(2, new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2) : 0)
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, minimumFractionDigits: max, maximumFractionDigits: max,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(decimals ?? (cents ? 2 : 0))}`
  }
}

/** Moneda probable según la región del navegador (sólo para el valor inicial). */
export function guessCurrency(): string {
  const REGION: Record<string, string> = {
    AR: 'ARS', BR: 'BRL', MX: 'MXN', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU', PY: 'PYG', BO: 'BOB',
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', CH: 'CHF', JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR',
    RU: 'RUB', AE: 'AED', SA: 'SAR', TR: 'TRY', ZA: 'ZAR',
    ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR',
  }
  if (typeof navigator !== 'undefined') {
    for (const l of navigator.languages ?? [navigator.language]) {
      const region = l?.split('-')[1]?.toUpperCase()
      if (region && REGION[region]) return REGION[region]
    }
  }
  return 'ARS'
}
