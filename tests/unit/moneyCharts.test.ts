import { describe, expect, it } from 'vitest'
import { curveScale, curveSummary, historyMonths, historyWindowEnd, monthlyTotals, nearestIndex, type ChartTx } from '../../src/modules/life/lib/moneyCharts'

// Dinero: cuentas de los gráficos ("Últimos meses" y la curva del mes). Zona fija para que no dependa de la máquina.
const TZ = 'America/Argentina/Buenos_Aires'
const tx = (type: 'income' | 'expense', amount: number | string, occurred_at: string, currency: string | null = 'ARS'): ChartTx =>
  ({ type, amount, currency, occurred_at })

describe('historyMonths / historyWindowEnd', () => {
  it('da los meses que terminan en el pedido, del más viejo al más nuevo (cruzando el año)', () => {
    expect(historyMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
  it('la ventana termina en el mes actual mientras el elegido entra; si es más viejo, termina en el elegido', () => {
    expect(historyWindowEnd('2026-11', '2026-11', 6)).toBe('2026-11')
    expect(historyWindowEnd('2026-06', '2026-11', 6)).toBe('2026-11')
    expect(historyWindowEnd('2026-05', '2026-11', 6)).toBe('2026-05')
    // Un mes futuro (con algo programado) no corre la ventana: lo programado no cuenta
    expect(historyWindowEnd('2026-12', '2026-11', 6)).toBe('2026-11')
  })
})

describe('monthlyTotals', () => {
  const months = historyMonths('2026-11', 3)

  it('suma ingresos y gastos por mes en la moneda principal, en centavos', () => {
    const h = monthlyTotals([
      tx('income', '1000.10', '2026-11-01T15:00:00Z'),
      tx('expense', 0.1, '2026-11-02T15:00:00Z'),
      tx('expense', 0.2, '2026-11-03T15:00:00Z'),
      tx('expense', 500, '2026-09-10T15:00:00Z'),
    ], months, 'ARS', '2026-11-20', TZ)
    expect(h.months).toEqual([
      { month: '2026-09', income: 0, expense: 500, count: 1 },
      { month: '2026-10', income: 0, expense: 0, count: 0 },
      { month: '2026-11', income: 1000.1, expense: 0.3, count: 3 },
    ])
    expect(h.max).toBe(1000.1)
    expect(h.others).toEqual([])
  })

  it('nunca suma monedas distintas: las otras van aparte (y sin moneda = la principal)', () => {
    const h = monthlyTotals([
      tx('expense', 100, '2026-11-02T15:00:00Z'),
      tx('expense', 40, '2026-11-02T15:00:00Z', 'USD'),
      tx('income', 7, '2026-10-02T15:00:00Z', 'EUR'),
      tx('income', 5, '2026-10-02T15:00:00Z', null),
    ], months, 'ARS', '2026-11-20', TZ)
    expect(h.months[2]).toMatchObject({ expense: 100, count: 1 })
    expect(h.months[1]).toMatchObject({ income: 5, count: 1 })
    expect(h.max).toBe(100)
    expect(h.others.map(o => o.currency)).toEqual(['EUR', 'USD'])
    expect(h.others[1].months[2]).toMatchObject({ expense: 40, count: 1 })
  })

  it('lo programado (fecha posterior a hoy) todavía no cuenta', () => {
    const h = monthlyTotals([
      tx('expense', 300, '2026-11-25T15:00:00Z'),
      tx('expense', 10, '2026-11-20T15:00:00Z'),
    ], months, 'ARS', '2026-11-20', TZ)
    expect(h.months[2]).toEqual({ month: '2026-11', income: 0, expense: 10, count: 1 })
  })

  it('el mes sale de la fecha en la zona de la cuenta (22 h del 31/10 en Buenos Aires = octubre)', () => {
    const h = monthlyTotals([tx('expense', 50, '2026-11-01T01:00:00Z')], months, 'ARS', '2026-11-20', TZ)
    expect(h.months[1]).toMatchObject({ month: '2026-10', expense: 50 })
    expect(h.months[2].count).toBe(0)
  })

  it('fuera de la ventana no entra; sin nada, todo vacío y escala 0', () => {
    const h = monthlyTotals([tx('expense', 50, '2026-05-10T15:00:00Z')], months, 'ARS', '2026-11-20', TZ)
    expect(h.max).toBe(0)
    expect(h.months.every(m => m.count === 0)).toBe(true)
  })
})

describe('curva del mes', () => {
  it('la escala siempre incluye el 0 (no exagera) y no se rompe con una curva plana', () => {
    expect(curveScale([100, 300, 200])).toEqual({ lo: 0, hi: 300 })
    expect(curveScale([-50, -200])).toEqual({ lo: -200, hi: 0 })
    expect(curveScale([-50, 80])).toEqual({ lo: -50, hi: 80 })
    expect(curveScale([0, 0])).toEqual({ lo: 0, hi: 1 })
  })
  it('resume el último valor y el punto más bajo y más alto (el primer día si se repite)', () => {
    expect(curveSummary([1000, -500, -1500, -1500, -200])).toEqual({ last: -200, min: -1500, minDay: 3, max: 1000, maxDay: 1 })
    expect(curveSummary([])).toBeNull()
  })
  it('el día más cercano a una posición, sin salirse de la curva', () => {
    expect(nearestIndex(0, 30)).toBe(0)
    expect(nearestIndex(1, 30)).toBe(29)
    expect(nearestIndex(0.5, 3)).toBe(1)
    expect(nearestIndex(-0.2, 10)).toBe(0)
    expect(nearestIndex(1.4, 10)).toBe(9)
    expect(nearestIndex(0.7, 1)).toBe(0)
  })
})
