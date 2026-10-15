import { describe, expect, it } from 'vitest'
import {
  budgetStatus, budgetStatuses, daysLeftInMonth, findBudget, monthOf, mostRelevant, parseBudgetAmount,
  spentByCategory, stateOf, type Budget, type BudgetTx,
} from '../../src/modules/life/lib/budgets'

// Presupuestos amables (life_budgets, 20261030000001): lo gastado sale de los movimientos del mes en la misma moneda.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()
const tx = (over: Partial<BudgetTx>): BudgetTx => ({
  type: 'expense', amount: 0, category: 'Comida', currency: 'ARS', occurred_at: at(2026, 10, 5), ...over,
})
const budget = (over: Partial<Budget>): Budget => ({ id: 'b1', category: 'Comida', currency: 'ARS', amount: 1000, ...over })
const today = new Date(2026, 9, 15, 10) // 15 de octubre de 2026 (31 días)

describe('spentByCategory', () => {
  it('suma sólo gastos del mes, por categoría y moneda, sin mezclar monedas', () => {
    const txs = [
      tx({ amount: 100.1 }), tx({ amount: '200.2' }), tx({ amount: 50, currency: 'USD' }),
      tx({ amount: 999, type: 'income' }), tx({ amount: 30, category: 'Ocio' }),
      tx({ amount: 70, occurred_at: at(2026, 9, 30) }),
      tx({ amount: 5, category: null }), tx({ amount: 7, currency: null }),
    ]
    const s = spentByCategory(txs, '2026-10', 'ARS')
    expect(s.get('Comida|ARS')).toBe(30730) // centavos: 100.10 + 200.20 + 7 (sin moneda → la principal)
    expect(s.get('Comida|USD')).toBe(5000)
    expect(s.get('Ocio|ARS')).toBe(3000)
    expect(s.get('Otros|ARS')).toBe(500)
    expect(s.has('Comida|ARS|income')).toBe(false)
  })
  it('categorías propias por su clave', () => {
    const s = spentByCategory([tx({ category: 'c:abc', amount: 10 })], '2026-10', 'ARS')
    expect(s.get('c:abc|ARS')).toBe(1000)
  })
})

describe('daysLeftInMonth', () => {
  it('cuenta hoy; el último día queda 1; otro mes, null', () => {
    expect(daysLeftInMonth('2026-10', today)).toBe(17)
    expect(daysLeftInMonth('2026-10', new Date(2026, 9, 31))).toBe(1)
    expect(daysLeftInMonth('2026-02', new Date(2026, 1, 1))).toBe(28)
    expect(daysLeftInMonth('2028-02', new Date(2028, 1, 1))).toBe(29)
    expect(daysLeftInMonth('2026-09', today)).toBeNull()
  })
})

describe('stateOf', () => {
  it('bien, cerca desde el 85 % y pasado sólo si supera el tope', () => {
    expect(stateOf(0, 100000)).toBe('ok')
    expect(stateOf(84999, 100000)).toBe('ok')
    expect(stateOf(85000, 100000)).toBe('near')
    expect(stateOf(100000, 100000)).toBe('near')
    expect(stateOf(100001, 100000)).toBe('over')
  })
})

describe('budgetStatus', () => {
  it('mes actual: lo que queda, días que faltan y "por día" hacia abajo', () => {
    const s = budgetStatus(budget({ amount: 1000 }), new Map([['Comida|ARS', 40000]]), '2026-10', today)
    expect(s).toMatchObject({ spent: 400, left: 600, over: 0, state: 'ok', daysLeft: 17 })
    expect(s.perDay).toBe(35.29) // 600 / 17 = 35,294…
    expect(s.ratio).toBeCloseTo(0.4)
  })
  it('pasado: lo que se pasó, sin "por día"', () => {
    const s = budgetStatus(budget({ amount: 1000 }), new Map([['Comida|ARS', 125050]]), '2026-10', today)
    expect(s).toMatchObject({ spent: 1250.5, left: 0, over: 250.5, state: 'over', perDay: null })
  })
  it('mes pasado: sólo el resultado (sin días ni por día)', () => {
    const s = budgetStatus(budget({ amount: 1000 }), new Map([['Comida|ARS', 30000]]), '2026-09', today)
    expect(s).toMatchObject({ left: 700, daysLeft: null, perDay: null, state: 'ok' })
  })
  it('sin gastos: queda todo; el monto puede venir como texto de la base', () => {
    const s = budgetStatus(budget({ amount: '150000.50' as unknown as number }), new Map(), '2026-10', today)
    expect(s).toMatchObject({ spent: 0, left: 150000.5, state: 'ok' })
  })
  it('la moneda importa: un gasto en USD no cuenta para el presupuesto en ARS', () => {
    const spent = spentByCategory([tx({ amount: 900, currency: 'USD' })], '2026-10', 'ARS')
    expect(budgetStatus(budget({}), spent, '2026-10', today).spent).toBe(0)
    expect(budgetStatus(budget({ currency: 'USD' }), spent, '2026-10', today).state).toBe('near')
  })
})

describe('budgetStatuses y mostRelevant', () => {
  const budgets = [
    budget({ id: 'comida', category: 'Comida', amount: 1000 }),
    budget({ id: 'ocio', category: 'Ocio', amount: 100 }),
    budget({ id: 'salud', category: 'Salud', amount: 100 }),
    budget({ id: 'ropa', category: 'Ropa', amount: 100 }),
  ]
  const txs = [
    tx({ category: 'Comida', amount: 500 }),
    tx({ category: 'Ocio', amount: 90 }),
    tx({ category: 'Salud', amount: 110 }),
    tx({ category: 'Ropa', amount: 150 }),
  ]
  it('primero lo pasado (más pasado arriba), después lo que está cerca, después el resto', () => {
    const s = budgetStatuses(budgets, txs, '2026-10', today, 'ARS')
    expect(s.map(x => x.budget.id)).toEqual(['ropa', 'salud', 'ocio', 'comida'])
    expect(mostRelevant(s)?.budget.id).toBe('ropa')
  })
  it('sin pasados, el más cerca; si todo va bien, nada', () => {
    const s = budgetStatuses(budgets.slice(0, 2), txs, '2026-10', today, 'ARS')
    expect(mostRelevant(s)?.budget.id).toBe('ocio')
    expect(mostRelevant(budgetStatuses(budgets.slice(0, 1), txs, '2026-10', today, 'ARS'))).toBeNull()
    expect(mostRelevant([])).toBeNull()
  })
})

describe('findBudget', () => {
  it('por categoría y moneda', () => {
    const bs = [budget({ id: 'a' }), budget({ id: 'b', currency: 'USD' })]
    expect(findBudget(bs, 'Comida', 'USD')?.id).toBe('b')
    expect(findBudget(bs, 'Ocio', 'ARS')).toBeNull()
  })
})

describe('monthOf', () => {
  it('una fecha sola es del día local; un instante, de su mes local', () => {
    expect(monthOf('2026-10-01')).toBe('2026-10')
    expect(monthOf(new Date(2026, 0, 31, 23))).toBe('2026-01')
    expect(monthOf(at(2026, 3, 1, 0))).toBe('2026-03')
  })
})

describe('parseBudgetAmount', () => {
  it('acepta coma o punto decimal y separador de miles', () => {
    expect(parseBudgetAmount('1500')).toBe(1500)
    expect(parseBudgetAmount('1.500')).toBe(1500)
    expect(parseBudgetAmount('1,500')).toBe(1500)
    expect(parseBudgetAmount('1500,5')).toBe(1500.5)
    expect(parseBudgetAmount('1.500,50')).toBe(1500.5)
    expect(parseBudgetAmount('1,500.50')).toBe(1500.5)
    expect(parseBudgetAmount(' 150 000 ')).toBe(150000)
    expect(parseBudgetAmount('12.345')).toBe(12345)
    expect(parseBudgetAmount('0.999')).toBe(1)
    expect(parseBudgetAmount('9.99')).toBe(9.99)
  })
  it('rechaza vacío, cero, negativos, letras y montos enormes', () => {
    for (const bad of ['', '0', '0,00', '-5', 'abc', '10a', '99999999999']) expect(parseBudgetAmount(bad)).toBeNull()
  })
})
