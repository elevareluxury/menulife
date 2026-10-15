// Compras en cuotas: fechas y montos, con la misma regla que life_materialize_installments
// (supabase/migrations/20261029000002_life_installments.sql). Sin DOM; lo usan la app y los tests.

export const MIN_INSTALLMENTS = 2
export const MAX_INSTALLMENTS = 72

export interface InstallmentPlanLike {
  total_amount: number
  installments: number
  first_date: string // YYYY-MM-DD
  last_no: number
  cancelled_at: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Monto de cada cuota: total / cuotas redondeado a 2 decimales; la última ajusta la diferencia. */
export function installmentAmounts(total: number, count: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.round(cents / count)
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? cents - base * (count - 1) : base) / 100)
}

/** Monto de la cuota número `no` (1 = la primera). */
export function installmentAmount(total: number, count: number, no: number): number {
  return installmentAmounts(total, count)[no - 1] ?? 0
}

/** Fecha de la cuota número `no`: el mismo día del mes que la primera, o el último día si el mes es más corto. */
export function installmentDue(firstDate: string, no: number): string {
  const [y, m, d] = firstDate.split('-').map(Number)
  const month = new Date(y, m - 1 + (no - 1), 1)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  return `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(Math.min(d, last))}`
}

/** ¿El total alcanza para las cuotas? (la base pide al menos 1 por cuota, así ninguna queda en 0). */
export function validInstallments(total: number, count: number): boolean {
  return Number.isInteger(count) && count >= MIN_INSTALLMENTS && count <= MAX_INSTALLMENTS && total >= count
}

/** Lo que falta pagar: las cuotas que todavía no se cargaron (0 si se canceló). */
export function remainingAmount(plan: InstallmentPlanLike): number {
  if (plan.cancelled_at) return 0
  const paid = installmentAmounts(plan.total_amount, plan.installments).slice(0, plan.last_no).reduce((s, a) => s + Math.round(a * 100), 0)
  return (Math.round(plan.total_amount * 100) - paid) / 100
}

/** Próxima cuota por cargar (null si ya están todas o se canceló). */
export function nextInstallmentDue(plan: InstallmentPlanLike): string | null {
  if (plan.cancelled_at || plan.last_no >= plan.installments) return null
  return installmentDue(plan.first_date, plan.last_no + 1)
}

/**
 * "Cuotas en curso" del mes: sin cancelar y con cuotas por cargar, o cuya última cuota cae este mes
 * (así se ve "12 de 12" el mes en que se termina de pagar). `today` = YYYY-MM-DD local.
 */
export function isInCourse(plan: InstallmentPlanLike, today: string): boolean {
  if (plan.cancelled_at) return false
  if (plan.last_no < plan.installments) return true
  return installmentDue(plan.first_date, plan.installments).slice(0, 7) === today.slice(0, 7)
}

/** Suma lo que falta pagar por moneda (nunca mezcla monedas distintas). */
export function remainingByCurrency<T extends InstallmentPlanLike & { currency: string }>(plans: T[]): { currency: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const p of plans) {
    const left = Math.round(remainingAmount(p) * 100)
    if (left > 0) map.set(p.currency, (map.get(p.currency) ?? 0) + left)
  }
  return [...map.entries()].map(([currency, cents]) => ({ currency, amount: cents / 100 }))
}

/** Nombre de la compra: la descripción o, si no tiene, la categoría traducida. */
export function planName(t: { categories: Record<string, string> }, p: { description: string | null; category: string | null }): string {
  const cat = p.category ?? 'Otros'
  return p.description || (t.categories[cat] ?? cat)
}
