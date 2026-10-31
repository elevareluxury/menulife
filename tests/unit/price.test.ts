import { describe, expect, it } from 'vitest'
import { CURRENCIES, formatPrice } from '../../src/modules/profile/lib/price'

describe('formatPrice', () => {
  it('usa la moneda elegida y el formato del idioma de quien mira', () => {
    expect(formatPrice(1200, 'USD', 'en')).toBe('$1,200')
    expect(formatPrice(1200, 'EUR', 'de')).toMatch(/^1\.200\s€$/)
    expect(formatPrice(19.9, 'BRL', 'pt')).toMatch(/R\$\s?19,90/)
    expect(formatPrice(15000, 'ARS', 'es')).toMatch(/^15\.000\sARS$/)
  })

  it('sin moneda (productos de antes) sigue con "$"', () => {
    expect(formatPrice(1500, '', 'es')).toBe('$ 1.500')
  })

  it('una moneda inválida no rompe: cae en "$"', () => {
    expect(formatPrice(10, 'xx', 'en')).toBe('$ 10')
    expect(formatPrice(10, '<b>', 'en')).toBe('$ 10')
  })

  it('las monedas de Studio son códigos ISO de 3 letras, sin repetir', () => {
    expect(CURRENCIES.every(c => /^[A-Z]{3}$/.test(c))).toBe(true)
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length)
  })
})
