import { describe, expect, it } from 'vitest'
import { formatMoney } from '../../src/lib/currencies'

const n = (s: string) => s.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it('enteros sin decimales y con centavos, 2 decimales', () => {
    expect(n(formatMoney(1500, 'ARS', 'es-AR'))).toBe('$ 1.500')
    expect(n(formatMoney(1500.5, 'ARS', 'es-AR'))).toBe('$ 1.500,50')
    expect(formatMoney(3.5, 'USD', 'en-US')).toBe('$3.50')
    expect(formatMoney(-12.25, 'USD', 'en-US')).toBe('-$12.25')
  })
  it('monedas sin centavos no muestran decimales', () => {
    expect(formatMoney(1200.4, 'JPY', 'ja-JP')).toBe('￥1,200')
  })
  it('respeta los decimales pedidos', () => {
    expect(formatMoney(1500.5, 'USD', 'en-US', 0)).toBe('$1,501')
  })
})
