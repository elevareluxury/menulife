import { describe, expect, it } from 'vitest'
import {
  daysUntil, isUpcoming, lastNavigableMonth, localDayOf, splitByArrival, upcomingTotals,
} from '../../src/modules/life/lib/moneyFuture'

// Movimientos con fecha futura: se ven, pero cuentan en los totales recién cuando llega su fecha.

const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

describe('isUpcoming / splitByArrival', () => {
  it('hoy cuenta; mañana todavía no', () => {
    expect(isUpcoming({ occurred_at: noon(2026, 10, 15) }, '2026-10-15')).toBe(false)
    expect(isUpcoming({ occurred_at: noon(2026, 10, 16) }, '2026-10-15')).toBe(true)
    expect(isUpcoming({ occurred_at: noon(2026, 10, 1) }, '2026-10-15')).toBe(false)
  })

  it('separa manteniendo el orden', () => {
    const txs = [
      { id: 'a', occurred_at: noon(2026, 10, 20) },
      { id: 'b', occurred_at: noon(2026, 10, 15) },
      { id: 'c', occurred_at: noon(2026, 10, 30) },
      { id: 'd', occurred_at: noon(2026, 10, 2) },
    ]
    const { arrived, upcoming } = splitByArrival(txs, '2026-10-15')
    expect(arrived.map(t => t.id)).toEqual(['b', 'd'])
    expect(upcoming.map(t => t.id)).toEqual(['a', 'c'])
  })

  it('usa la fecha local del movimiento', () => {
    expect(localDayOf(noon(2026, 1, 31))).toBe('2026-01-31')
  })
})

describe('daysUntil', () => {
  it('cuenta días de calendario (también al cambiar de mes y de año)', () => {
    expect(daysUntil('2026-10-16', '2026-10-15')).toBe(1)
    expect(daysUntil('2026-11-02', '2026-10-30')).toBe(3)
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1)
    expect(daysUntil('2026-10-15', '2026-10-15')).toBe(0)
    expect(daysUntil('2026-10-10', '2026-10-15')).toBe(-5)
  })
  it('no le afecta el cambio de horario', () => {
    expect(daysUntil('2026-03-30', '2026-03-28')).toBe(2)
    expect(daysUntil('2026-11-02', '2026-10-31')).toBe(2)
  })
})

describe('upcomingTotals', () => {
  it('suma por moneda, sin mezclar, en centavos, con la principal primero', () => {
    const rows = upcomingTotals([
      { type: 'expense', amount: 0.1, currency: 'USD', occurred_at: '' },
      { type: 'expense', amount: 0.2, currency: 'USD', occurred_at: '' },
      { type: 'expense', amount: '1500.50', currency: 'ARS', occurred_at: '' },
      { type: 'income', amount: 200, currency: 'ARS', occurred_at: '' },
      { type: 'expense', amount: 10, currency: '', occurred_at: '' },
    ], 'ARS')
    expect(rows).toEqual([
      { currency: 'ARS', income: 200, expense: 1510.5, count: 3 },
      { currency: 'USD', income: 0, expense: 0.3, count: 2 },
    ])
  })
  it('sin nada programado, nada', () => {
    expect(upcomingTotals([], 'ARS')).toEqual([])
  })
})

describe('lastNavigableMonth', () => {
  it('sin nada más adelante, el mes actual', () => {
    expect(lastNavigableMonth('2026-10', null)).toBe('2026-10')
  })
  it('hasta el último mes con algo programado', () => {
    expect(lastNavigableMonth('2026-10', noon(2027, 2, 3))).toBe('2027-02')
  })
  it('nunca antes del mes actual', () => {
    expect(lastNavigableMonth('2026-10', noon(2026, 9, 3))).toBe('2026-10')
  })
})
