// Dinero: presupuestos amables (tabla life_budgets). Un presupuesto es un tope mensual para una categoría de gasto en
// una moneda; lo gastado sale de los movimientos del mes en esa misma moneda (nunca se suman monedas distintas).
// Puro (sin red ni DOM): lo usan la tarjeta "Presupuestos", "En qué se fue" y Mi día.
import { dateKeyOf, lifeTimeZone } from './zonedTime'

export interface Budget {
  id: string
  category: string
  currency: string
  amount: number
  created_at?: string
  updated_at?: string
}

/** Lo mínimo de un movimiento que hace falta para calcular. */
export interface BudgetTx {
  type: 'income' | 'expense'
  amount: number | string
  category: string | null
  currency: string | null
  occurred_at: string
}

export type BudgetState = 'ok' | 'near' | 'over'

/** Desde este porcentaje usado, "cerca" */
export const BUDGET_NEAR = 0.85
/** Igual que el trigger life_budgets_rules */
export const BUDGET_LIMIT = 60
/** numeric(12,2) */
export const BUDGET_MAX = 9_999_999_999.99

export interface BudgetStatus {
  budget: Budget
  /** Gastado en el mes, en la moneda del presupuesto */
  spent: number
  /** Lo que queda (0 si se pasó) */
  left: number
  /** Cuánto se pasó (0 si no) */
  over: number
  /** spent / amount */
  ratio: number
  state: BudgetState
  /** Días que faltan del mes, contando hoy; null si el mes no es el actual */
  daysLeft: number | null
  /** Lo que queda repartido en los días que faltan (hacia abajo, en centavos); null si no hay días o no queda nada */
  perDay: number | null
}

const cents = (n: number) => Math.round(n * 100)
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 'YYYY-MM' de un instante ISO en la zona de la cuenta ('YYYY-MM-DD' sola se toma como día local) o de un Date de
 * calendario (campos locales; para "ahora", `lifeNow()`).
 */
export function monthOf(value: string | Date, tz: string = lifeTimeZone()): string {
  if (typeof value === 'string') return dateKeyOf(value, tz).slice(0, 7)
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`
}

const keyOf = (category: string | null | undefined, currency: string) => `${category || 'Otros'}|${currency}`

/** Gastos del mes por categoría y moneda (clave 'categoría|moneda'), en centavos para no arrastrar decimales. */
export function spentByCategory(txs: readonly BudgetTx[], month: string, fallbackCurrency: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const tx of txs) {
    if (tx.type !== 'expense' || monthOf(tx.occurred_at) !== month) continue
    const k = keyOf(tx.category, tx.currency || fallbackCurrency)
    out.set(k, (out.get(k) ?? 0) + cents(Number(tx.amount) || 0))
  }
  return out
}

/** Días que faltan del mes contando hoy (el último día = 1). null si `month` no es el mes de `today`. */
export function daysLeftInMonth(month: string, today: Date): number | null {
  if (monthOf(today) !== month) return null
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return last - today.getDate() + 1
}

export function stateOf(spentCents: number, amountCents: number): BudgetState {
  if (spentCents > amountCents) return 'over'
  if (amountCents > 0 && spentCents >= amountCents * BUDGET_NEAR) return 'near'
  return 'ok'
}

export function budgetStatus(
  budget: Budget, spent: ReadonlyMap<string, number>, month: string, today: Date,
): BudgetStatus {
  const amountC = cents(Number(budget.amount))
  const spentC = spent.get(keyOf(budget.category, budget.currency)) ?? 0
  const leftC = Math.max(0, amountC - spentC)
  const daysLeft = daysLeftInMonth(month, today)
  return {
    budget,
    spent: spentC / 100,
    left: leftC / 100,
    over: Math.max(0, spentC - amountC) / 100,
    ratio: amountC > 0 ? spentC / amountC : 0,
    state: stateOf(spentC, amountC),
    daysLeft,
    perDay: daysLeft && leftC > 0 ? Math.floor(leftC / daysLeft) / 100 : null,
  }
}

/**
 * Estado de cada presupuesto en el mes (`month`, 'YYYY-MM'). Los que se pasaron primero, después los que están cerca y
 * al final el resto, cada grupo por porcentaje usado (mayor primero).
 */
export function budgetStatuses(
  budgets: readonly Budget[], txs: readonly BudgetTx[], month: string, today: Date, fallbackCurrency: string,
): BudgetStatus[] {
  const spent = spentByCategory(txs, month, fallbackCurrency)
  const rank: Record<BudgetState, number> = { over: 0, near: 1, ok: 2 }
  return budgets.map(b => budgetStatus(b, spent, month, today))
    .sort((a, b) => rank[a.state] - rank[b.state] || b.ratio - a.ratio)
}

/** El aviso más relevante para Mi día: el que más se pasó o, si ninguno, el más cerca del tope. null si todo va bien. */
export function mostRelevant(statuses: readonly BudgetStatus[]): BudgetStatus | null {
  const over = statuses.filter(s => s.state === 'over').sort((a, b) => b.ratio - a.ratio)
  if (over.length) return over[0]
  const near = statuses.filter(s => s.state === 'near').sort((a, b) => b.ratio - a.ratio)
  return near[0] ?? null
}

/** El presupuesto de esa categoría y moneda, si hay. */
export const findBudget = (budgets: readonly Budget[], category: string, currency: string) =>
  budgets.find(b => b.category === category && b.currency === currency) ?? null

/** Monto escrito por la persona ("1.500", "1500,50", "1,500.50") → número con 2 decimales, o null si no sirve. */
export function parseBudgetAmount(raw: string): number | null {
  let s = raw.replace(/[\s\u00a0'\u2019]/g, '')
  if (!/^[0-9.,]+$/.test(s)) return null
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',')
  const sep = Math.max(lastDot, lastComma)
  if (sep >= 0) {
    const decimals = s.length - sep - 1
    const other = sep === lastDot ? ',' : '.'
    // Un solo separador seguido de 3 dígitos ("1.500") es de miles; si no, el último es el decimal
    const onlyOne = !s.includes(other) && s.indexOf(s[sep]) === sep
    if (onlyOne && decimals === 3 && !s.startsWith('0')) s = s.replace(/[.,]/g, '')
    else s = `${s.slice(0, sep).replace(/[.,]/g, '')}.${s.slice(sep + 1)}`
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return null
  const rounded = Math.round(n * 100) / 100
  if (rounded <= 0 || rounded > BUDGET_MAX) return null
  return rounded
}
