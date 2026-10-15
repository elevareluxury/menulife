// Movimientos con fecha futura (un pago planeado la semana que viene, una cuota que vence más adelante).
// Lógica pura, sin red ni DOM.
//
// Regla: se ven en la lista del mes (marcados "Programado · en N días") y se buscan como cualquier otro, pero
// cuentan en los totales, "En qué se fue", la curva y los presupuestos recién cuando llega su fecha.
// Mientras tanto se suman aparte, por moneda, en "Próximos" (nunca se mezclan monedas).

export interface FutureTx {
  type: 'income' | 'expense'
  amount: number | string
  currency: string
  occurred_at: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local (YYYY-MM-DD) de un instante ISO. */
export function localDayOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ¿El movimiento todavía no llegó? (su fecha local es posterior a hoy) */
export function isUpcoming(tx: Pick<FutureTx, 'occurred_at'>, todayKey: string): boolean {
  return localDayOf(tx.occurred_at) > todayKey
}

/** Días que faltan de `todayKey` a `dayKey` (ambos YYYY-MM-DD, sin horas: no le afecta el cambio de horario). */
export function daysUntil(dayKey: string, todayKey: string): number {
  const toUtc = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((toUtc(dayKey) - toUtc(todayKey)) / 86_400_000)
}

/** Separa lo que ya pasó (cuenta en los totales) de lo programado. Mantiene el orden. */
export function splitByArrival<T extends Pick<FutureTx, 'occurred_at'>>(txs: T[], todayKey: string): { arrived: T[]; upcoming: T[] } {
  const arrived: T[] = []
  const upcoming: T[] = []
  for (const tx of txs) (isUpcoming(tx, todayKey) ? upcoming : arrived).push(tx)
  return { arrived, upcoming }
}

export interface UpcomingTotals { currency: string; income: number; expense: number; count: number }

/** Lo programado sumado por moneda (en centavos, para no arrastrar decimales). La moneda principal va primero. */
export function upcomingTotals(txs: FutureTx[], mainCurrency: string): UpcomingTotals[] {
  const map = new Map<string, { income: number; expense: number; count: number }>()
  for (const tx of txs) {
    const c = tx.currency || mainCurrency
    const row = map.get(c) ?? { income: 0, expense: 0, count: 0 }
    const cents = Math.round(Number(tx.amount) * 100)
    if (tx.type === 'income') row.income += cents; else row.expense += cents
    row.count++
    map.set(c, row)
  }
  return [...map.entries()]
    .map(([currency, r]) => ({ currency, income: r.income / 100, expense: r.expense / 100, count: r.count }))
    .sort((a, b) => (a.currency === mainCurrency ? -1 : b.currency === mainCurrency ? 1 : a.currency.localeCompare(b.currency)))
}

/**
 * Hasta qué mes se puede avanzar con ‹ mes ›: el actual o, si hay movimientos programados más adelante, el último
 * mes que tiene alguno (los del medio pueden estar vacíos). `latestIso`: el movimiento con la fecha más lejana.
 */
export function lastNavigableMonth(currentMonth: string, latestIso: string | null): string {
  if (!latestIso) return currentMonth
  const key = localDayOf(latestIso).slice(0, 7)
  return key > currentMonth ? key : currentMonth
}
