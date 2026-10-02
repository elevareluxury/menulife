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

export function formatMoney(amount: number, currency: string, locale: string, decimals = 0): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(decimals)}`
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
