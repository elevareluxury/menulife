// Precio de un producto en cualquier moneda (perfil mundial). Sin moneda guardada (productos de antes) se muestra
// como siempre, con "$". La moneda la elige el dueño en Studio; el formato (separadores, símbolo, lugar del símbolo)
// sale del idioma de quien mira, con Intl.

/** Monedas que se ofrecen en Studio (ISO 4217): las más usadas por la gente de Mycen, en orden aproximado */
export const CURRENCIES = [
  'USD', 'EUR', 'ARS', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'UYU', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY', 'KRW', 'INR', 'RUB',
] as const

const isCurrency = (c: string) => /^[A-Z]{3}$/.test(c)

export function formatPrice(price: number, currency: string, lang: string): string {
  if (isCurrency(currency)) {
    try {
      return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: Number.isInteger(price) ? 0 : 2 }).format(price)
    } catch { /* moneda que el navegador no conoce: abajo */ }
  }
  return `$ ${new Intl.NumberFormat(lang === 'es' ? 'es-AR' : lang).format(price)}`
}
