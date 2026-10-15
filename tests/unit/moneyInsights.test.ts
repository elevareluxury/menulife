import { describe, expect, it } from 'vitest'
import {
  categoryBreakdown, descriptionKey, learnCategories, matchesSearch, monthCurve, monthKeyOf, monthRange, searchTerm,
  shiftMonth, suggestCategory, type MoneyTx,
} from '@/modules/life/lib/moneyInsights'

const tx = (p: Partial<MoneyTx>): MoneyTx => ({
  type: 'expense', amount: 100, category: 'Otros', description: null, currency: 'ARS',
  occurred_at: new Date(2026, 9, 10, 12).toISOString(), ...p,
})
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

describe('meses', () => {
  it('se mueven entre años y el rango es local', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    const [from, to] = monthRange('2026-02')
    expect(new Date(from).getDate()).toBe(1)
    expect(monthKeyOf(new Date(to))).toBe('2026-03')
  })

  it('la curva de un mes pasado llega al último día; la del actual, hasta hoy', () => {
    const txs = [tx({ type: 'income', amount: 1000, occurred_at: at(2026, 9, 1) }), tx({ amount: 300, occurred_at: at(2026, 9, 30) })]
    const past = monthCurve(txs, '2026-09', new Date(2026, 9, 15))
    expect(past).toHaveLength(30)
    expect(past[past.length - 1]).toBe(700)
    expect(monthCurve([], '2026-10', new Date(2026, 9, 15))).toHaveLength(15)
  })
})

describe('en qué se fue', () => {
  it('suma gastos por categoría en una sola moneda y compara con el mes anterior', () => {
    const cur = [tx({ category: 'Comida', amount: 300 }), tx({ category: 'Comida', amount: 300 }), tx({ category: 'Ocio', amount: 400 }),
      tx({ category: 'Comida', amount: 999, currency: 'USD' }), tx({ type: 'income', category: 'Sueldo', amount: 5000 })]
    const prev = [tx({ category: 'Comida', amount: 400 })]
    const out = categoryBreakdown(cur, prev, 'ARS')
    expect(out.map(c => c.category)).toEqual(['Comida', 'Ocio'])
    expect(out[0]).toMatchObject({ amount: 600, share: 0.6, change: 50 })
    expect(out[1].change).toBeNull()
    expect(categoryBreakdown([], prev, 'ARS')).toEqual([])
  })
})

describe('búsqueda', () => {
  it('cada palabra tiene que estar, sin acentos ni mayúsculas, también en la categoría traducida o el monto', () => {
    const t = tx({ description: 'Suscripción NETFLIX', category: 'Suscripciones', amount: 5990 })
    expect(matchesSearch(t, 'netflix', 'Subscriptions')).toBe(true)
    expect(matchesSearch(t, 'suscripcion netflix', 'Subscriptions')).toBe(true)
    expect(matchesSearch(t, 'subscriptions', 'Subscriptions')).toBe(true)
    expect(matchesSearch(t, '5990', 'x')).toBe(true)
    expect(matchesSearch(t, 'spotify', 'x')).toBe(false)
  })

  it('el texto para la base no lleva signos que rompan el filtro', () => {
    expect(searchTerm(' a,b (c)*%  ')).toBe('a b c')
  })
})

describe('memoria de categorías', () => {
  const history = [
    tx({ description: 'UBER *TRIP 4821', category: 'Transporte', occurred_at: at(2026, 8, 1) }),
    tx({ description: 'UBER *TRIP 9911', category: 'Transporte', occurred_at: at(2026, 8, 5) }),
    tx({ description: 'Carrefour Express', category: 'Comida' }),
    tx({ description: 'Carrefour Express', category: 'Otros' }),
    tx({ description: 'Mercado Pago Juan', category: 'Ocio' }),
    tx({ description: 'Mercado Pago Ana', category: 'Comida' }),
    tx({ type: 'income', description: 'Transferencia ACME', category: 'Sueldo' }),
  ]
  const memory = learnCategories(history)

  it('la descripción se compara sin números ni signos', () => {
    expect(descriptionKey('UBER *TRIP 4821')).toBe('uber trip')
  })

  it('sugiere lo que ya ordenaste, separando ingresos y gastos', () => {
    expect(suggestCategory(memory, 'expense', 'Uber trip 0001')).toBe('Transporte')
    expect(suggestCategory(memory, 'expense', 'CARREFOUR EXPRESS')).toBe('Comida')
    expect(suggestCategory(memory, 'income', 'Transferencia ACME 03/10')).toBe('Sueldo')
    expect(suggestCategory(memory, 'expense', 'Transferencia ACME')).toBeNull()
  })

  it('por las primeras palabras sólo si nunca fue ambiguo', () => {
    expect(suggestCategory(memory, 'expense', 'Mercado Pago Pedro')).toBeNull()
    expect(suggestCategory(memory, 'expense', 'Uber trip extra larga')).toBe('Transporte')
    expect(suggestCategory(memory, 'expense', '')).toBeNull()
  })
})
