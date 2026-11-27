// Dinero: cuentas de los gráficos (curva del mes y "Últimos meses"). Todo puro (sin red ni DOM) y en el dispositivo.
// Reglas: nunca se suman monedas distintas, lo programado cuenta recién cuando llega su fecha (lib/moneyFuture.ts) y
// las escalas empiezan en 0 (una barra o una curva no exageran diferencias chicas).
import { dateKeyOf, lifeTimeZone } from './zonedTime'
import { shiftMonth } from './moneyInsights'

export interface ChartTx {
  type: 'income' | 'expense'
  amount: number | string
  currency: string | null
  occurred_at: string
}

// ── Últimos meses ────────────────────────────────────────────────────────────

export interface MonthTotals {
  month: string
  income: number
  expense: number
  /** Movimientos que entraron en la cuenta (0 = mes sin movimientos en esa moneda) */
  count: number
}

export interface MonthHistory {
  /** Moneda principal, del más viejo al más nuevo (todos los meses pedidos, también los vacíos) */
  months: MonthTotals[]
  /** El mayor ingreso o gasto de la ventana en la moneda principal (escala de las barras; 0 = nada) */
  max: number
  /** Otras monedas con movimientos en la ventana, cada una aparte (nunca se suman a la principal) */
  others: { currency: string; months: MonthTotals[] }[]
}

/** Los `count` meses que terminan en `end` ('YYYY-MM'), del más viejo al más nuevo. */
export function historyMonths(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(end, i - count + 1))
}

/**
 * Último mes de la ventana: el actual, salvo que se esté mirando un mes que ya no entra (más viejo); entonces la
 * ventana termina en ese mes. Nunca un mes futuro: lo programado todavía no llegó.
 */
export function historyWindowEnd(selected: string, current: string, count: number): string {
  return selected < shiftMonth(current, -(count - 1)) ? selected : current
}

/** Totales por mes y moneda de lo que ya llegó (fecha local ≤ `todayKey`), en centavos para no arrastrar decimales. */
export function monthlyTotals(txs: ChartTx[], months: string[], mainCurrency: string, todayKey: string, tz: string = lifeTimeZone()): MonthHistory {
  const wanted = new Set(months)
  const byCurrency = new Map<string, Map<string, { income: number; expense: number; count: number }>>()
  for (const tx of txs) {
    const day = dateKeyOf(tx.occurred_at, tz)
    if (day > todayKey) continue
    const month = day.slice(0, 7)
    if (!wanted.has(month)) continue
    const currency = tx.currency || mainCurrency
    const perMonth = byCurrency.get(currency) ?? new Map()
    const row = perMonth.get(month) ?? { income: 0, expense: 0, count: 0 }
    const cents = Math.round(Number(tx.amount) * 100)
    if (!Number.isFinite(cents)) continue
    if (tx.type === 'income') row.income += cents; else row.expense += cents
    row.count++
    perMonth.set(month, row)
    byCurrency.set(currency, perMonth)
  }
  const series = (currency: string): MonthTotals[] => months.map(month => {
    const r = byCurrency.get(currency)?.get(month)
    return { month, income: (r?.income ?? 0) / 100, expense: (r?.expense ?? 0) / 100, count: r?.count ?? 0 }
  })
  const main = series(mainCurrency)
  const max = main.reduce((m, r) => Math.max(m, r.income, r.expense), 0)
  const others = [...byCurrency.keys()].filter(c => c !== mainCurrency).sort().map(currency => ({ currency, months: series(currency) }))
  return { months: main, max, others }
}

// ── Curva del mes (saldo acumulado día por día) ─────────────────────────────

export interface CurveScale {
  /** Borde de abajo y de arriba; siempre incluyen el 0 */
  lo: number
  hi: number
}

/** Escala de la curva: del menor al mayor valor, con el 0 adentro (la línea del cero es la referencia). */
export function curveScale(curve: number[]): CurveScale {
  const lo = Math.min(0, ...curve)
  const hi = Math.max(0, ...curve)
  return hi === lo ? { lo, hi: lo + 1 } : { lo, hi }
}

export interface CurveSummary {
  last: number
  min: number
  /** Día del mes (1…) del valor más bajo; el primero si se repite */
  minDay: number
  max: number
  maxDay: number
}

export function curveSummary(curve: number[]): CurveSummary | null {
  if (!curve.length) return null
  let minI = 0, maxI = 0
  curve.forEach((v, i) => { if (v < curve[minI]) minI = i; if (v > curve[maxI]) maxI = i })
  return { last: curve[curve.length - 1], min: curve[minI], minDay: minI + 1, max: curve[maxI], maxDay: maxI + 1 }
}

/** Índice del día más cercano a una posición horizontal (0…1) sobre una curva de `n` puntos. */
export function nearestIndex(fraction: number, n: number): number {
  if (n <= 1) return 0
  return Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))))
}
