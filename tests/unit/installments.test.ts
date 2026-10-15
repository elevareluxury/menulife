import { describe, expect, it } from 'vitest'
import {
  installmentAmount, installmentAmounts, installmentDue, isInCourse, nextInstallmentDue, planName,
  remainingAmount, remainingByCurrency, validInstallments,
} from '../../src/modules/life/lib/installments'

// Compras en cuotas: la misma regla que life_materialize_installments (20261029000002).
const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x * 100, 0)) / 100

describe('installmentAmounts', () => {
  it('total / cuotas redondeado; la última ajusta los centavos', () => {
    expect(installmentAmounts(100, 3)).toEqual([33.33, 33.33, 33.34])
    expect(installmentAmounts(1000, 6)).toEqual([166.67, 166.67, 166.67, 166.67, 166.67, 166.65])
    expect(installmentAmounts(180000, 12)).toEqual(Array(12).fill(15000))
    expect(installmentAmount(100, 3, 3)).toBe(33.34)
  })
  it('la suma da exacto el total', () => {
    for (const [total, n] of [[100, 3], [999.99, 7], [1.01, 2], [72, 72], [123456.78, 18], [2, 2]] as const) {
      const xs = installmentAmounts(total, n)
      expect(xs).toHaveLength(n)
      expect(sum(xs)).toBe(total)
      expect(Math.min(...xs)).toBeGreaterThan(0)
    }
  })
})

describe('installmentDue', () => {
  it('el mismo día de cada mes, cruzando el año', () => {
    expect(installmentDue('2026-11-15', 1)).toBe('2026-11-15')
    expect(installmentDue('2026-11-15', 3)).toBe('2027-01-15')
  })
  it('día 31 → último día de los meses cortos (y 29 en bisiesto)', () => {
    expect([1, 2, 3, 4].map(n => installmentDue('2027-12-31', n))).toEqual(['2027-12-31', '2028-01-31', '2028-02-29', '2028-03-31'])
    expect(installmentDue('2026-01-30', 2)).toBe('2026-02-28')
  })
})

describe('validInstallments', () => {
  it('2 a 72 cuotas y al menos 1 por cuota', () => {
    expect(validInstallments(100, 3)).toBe(true)
    expect(validInstallments(100, 1)).toBe(false)
    expect(validInstallments(1000, 73)).toBe(false)
    expect(validInstallments(5, 6)).toBe(false)
    expect(validInstallments(100, 2.5)).toBe(false)
  })
})

describe('progreso', () => {
  const plan = { total_amount: 100, installments: 3, first_date: '2026-08-01', last_no: 1, cancelled_at: null, currency: 'ARS' }
  it('lo que falta y la próxima', () => {
    expect(remainingAmount(plan)).toBe(66.67)
    expect(nextInstallmentDue(plan)).toBe('2026-09-01')
    expect(remainingAmount({ ...plan, last_no: 3 })).toBe(0)
    expect(nextInstallmentDue({ ...plan, last_no: 3 })).toBeNull()
    expect(remainingAmount({ ...plan, cancelled_at: '2026-09-02T00:00:00Z' })).toBe(0)
  })
  it('en curso: con cuotas por cargar o con la última este mes; nunca cancelada', () => {
    expect(isInCourse(plan, '2026-08-20')).toBe(true)
    expect(isInCourse({ ...plan, last_no: 3 }, '2026-10-05')).toBe(true)
    expect(isInCourse({ ...plan, last_no: 3 }, '2026-11-05')).toBe(false)
    expect(isInCourse({ ...plan, cancelled_at: '2026-09-02T00:00:00Z' }, '2026-08-20')).toBe(false)
  })
  it('lo que falta por moneda, sin sumar monedas distintas', () => {
    const usd = { ...plan, currency: 'USD', total_amount: 600, installments: 6, last_no: 2 }
    expect(remainingByCurrency([plan, { ...plan, last_no: 0 }, usd])).toEqual([
      { currency: 'ARS', amount: 166.67 },
      { currency: 'USD', amount: 400 },
    ])
  })
  it('nombre: descripción o categoría traducida', () => {
    const t: { categories: Record<string, string> } = { categories: { Otros: 'Otros', Hogar: 'Casa' } }
    expect(planName(c => t.categories[c] ?? c, { description: 'Heladera', category: 'Hogar' })).toBe('Heladera')
    expect(planName(c => t.categories[c] ?? c, { description: null, category: 'Hogar' })).toBe('Casa')
    expect(planName(c => t.categories[c] ?? c, { description: null, category: null })).toBe('Otros')
  })
})
