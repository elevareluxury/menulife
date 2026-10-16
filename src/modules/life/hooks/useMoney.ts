import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { LIFE_DATA_UPDATED } from './useBrain'
import { useLocaleStore } from '@/store/localeStore'
import { materializeRecurring } from './useRecurring'
import { monthCurve as curveOf, monthKeyOf, monthRange, shiftMonth } from '../lib/moneyInsights'
import { materializeInstallments } from './useInstallments'
import { useLifeTimeZone, useToday } from './useToday'
import { lifeNow, lifeTimeZone, startOfLocalDayISO, todayKey } from '../lib/zonedTime'
import { shiftDate } from '../lib/habitStreak'
import { lastNavigableMonth, localDayOf, splitByArrival, upcomingTotals as upcomingTotalsOf, type UpcomingTotals } from '../lib/moneyFuture'
import { enqueue, isOfflineError } from '../lib/outbox'
import toast from 'react-hot-toast'
import { lifeT } from '@/i18n/app/life'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string | null
  currency: string
  occurred_at: string
  goal_id?: string | null
  /** Generado por un fijo que se repite cada mes */
  recurring_id?: string | null
  /** Cuota de una compra en cuotas (número en installment_no) */
  installment_plan_id?: string | null
  installment_no?: number | null
}

export interface TransactionFormData {
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  currency: string
  occurred_at: string
  goal_id?: string | null
}

export interface CurrencyTotals {
  currency: string
  income: number
  expense: number
  balance: number
}

export interface TransactionGroup {
  date: string
  items: Transaction[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fecha local (YYYY-MM-DD) de un instante ISO, en la zona de la cuenta. */
export const localDay = (iso: string): string => localDayOf(iso)

function groupByDate(txs: Transaction[]): TransactionGroup[] {
  const map = new Map<string, Transaction[]>()
  txs.forEach(tx => {
    const date = localDay(tx.occurred_at)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(tx)
  })
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }))
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function newTxId(): string {
  try { return crypto.randomUUID() } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }
}

/**
 * Movimientos de un mes ('YYYY-MM', por defecto el actual) y del anterior (para comparar en qué se fue).
 * `everHasData`: si la persona tiene algún movimiento (para no mostrar la bienvenida en un mes vacío).
 *
 * Fecha futura (lib/moneyFuture.ts): `transactions` y los totales son sólo lo que ya llegó; lo programado del mes
 * va en `upcoming` / `upcomingTotals` y se suma recién cuando llega su fecha. `maxMonth`: hasta qué mes se puede
 * avanzar (el actual, o el último con algo programado).
 */
export function useMoney(month: string = monthKeyOf(lifeNow())) {
  const { user } = useAuthStore()
  const mainCurrency = useLocaleStore(s => s.currency)
  const [all, setAll] = useState<Transaction[]>([])
  const [everHasData, setEverHasData] = useState(false)
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)
  const [latestIso, setLatestIso] = useState<string | null>(null)
  const today = useToday()
  const tz = useLifeTimeZone()

  const load = useCallback(async () => {
    if (!user) return
    // Los fijos que ya vencieron se cargan antes de leer (una vez por día; si falla, se sigue igual)
    await materializeRecurring().catch(() => 0)
    // Lo mismo con las cuotas vencidas de las compras en cuotas
    await materializeInstallments().catch(() => 0)
    // Bordes del mes en la zona de la cuenta (lib/zonedTime.ts)
    const [from] = monthRange(shiftMonth(month, -1), tz)
    const [, to] = monthRange(month, tz)
    // Lo programado más allá de este mes (para poder avanzar hasta ahí con ‹ mes ›)
    const [nextStart] = monthRange(shiftMonth(monthKeyOf(lifeNow()), 1), tz)
    const [{ data, error }, { data: later }] = await Promise.all([
      db.from('life_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('occurred_at', from)
        .lt('occurred_at', to)
        .order('occurred_at', { ascending: false }),
      db.from('life_transactions').select('occurred_at').eq('user_id', user.id)
        .gte('occurred_at', nextStart).order('occurred_at', { ascending: false }).limit(1),
    ])
    // Sin conexión (o error al leer): se queda lo que había en pantalla
    if (error || !data) { setLoadedMonth(month); return }
    setLatestIso((later ?? [])[0]?.occurred_at ?? null)
    const rows: Transaction[] = data
    let ever = rows.length > 0
    if (!ever) {
      const { data: any1 } = await db.from('life_transactions').select('id').eq('user_id', user.id).limit(1)
      ever = (any1 ?? []).length > 0
    }
    setAll(rows)
    setEverHasData(ever)
    setLoadedMonth(month)
  }, [user, month, tz])
  const loading = loadedMonth !== month

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // Recargar cuando el botón + registra un movimiento
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'money') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  // Por mes local (no comparando textos ISO: la base devuelve "+00:00" y monthRange ".000Z", y en el borde no coinciden)
  const split = useMemo(() => splitByArrival(all.filter(t => localDayOf(t.occurred_at, tz).slice(0, 7) === month), today), [all, month, today, tz])
  /** Lo que ya llegó (cuenta en los totales) */
  const transactions = split.arrived
  /** Programado para más adelante en este mes */
  const upcoming = split.upcoming
  const previous = useMemo(() => splitByArrival(all.filter(t => localDayOf(t.occurred_at, tz).slice(0, 7) < month), today).arrived, [all, month, today, tz])
  const thisMonthTxs = transactions
  const upcomingTotals = useMemo<UpcomingTotals[]>(() => upcomingTotalsOf(upcoming, mainCurrency), [upcoming, mainCurrency])
  const maxMonth = lastNavigableMonth(today.slice(0, 7), latestIso)

  // Totales del mes por moneda: nunca se suman monedas distintas
  const totalsByCurrency = useMemo<CurrencyTotals[]>(() => {
    const map = new Map<string, CurrencyTotals>()
    for (const t of thisMonthTxs) {
      const c = t.currency || mainCurrency
      const row = map.get(c) ?? { currency: c, income: 0, expense: 0, balance: 0 }
      if (t.type === 'income') row.income += Number(t.amount); else row.expense += Number(t.amount)
      row.balance = row.income - row.expense
      map.set(c, row)
    }
    return [...map.values()]
  }, [thisMonthTxs, mainCurrency])

  const main = totalsByCurrency.find(r => r.currency === mainCurrency)
  const monthIncome  = main?.income ?? 0
  const monthExpense = main?.expense ?? 0
  const monthBalance = monthIncome - monthExpense
  const otherTotals  = useMemo(() => totalsByCurrency.filter(r => r.currency !== mainCurrency), [totalsByCurrency, mainCurrency])
  const monthCurve   = useMemo(
    () => curveOf(thisMonthTxs.filter(t => (t.currency || mainCurrency) === mainCurrency), month, new Date(`${today}T12:00:00`), tz),
    [thisMonthTxs, mainCurrency, month, tz, today],
  )

  const grouped = useMemo(() => groupByDate([...upcoming, ...transactions]), [upcoming, transactions])

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * `id` opcional (generado en el cliente) para vincular algo al movimiento, como las deudas de un gasto compartido.
   * Sin conexión (y `queue`, por defecto), queda en la cola del dispositivo como con el + general (lib/outbox.ts):
   * se ve enseguida y se sube solo al volver la señal. Devuelve 'queued' en ese caso.
   */
  const createTransaction = useCallback(async (data: TransactionFormData & { id?: string }, opts: { queue?: boolean } = {}): Promise<'saved' | 'queued' | undefined> => {
    if (!user) return
    const row = { ...data, id: data.id ?? newTxId(), user_id: user.id }
    try {
      // Sin red, ni se intenta (va directo a la cola)
      if (opts.queue !== false && typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline')
      const { error } = await db.from('life_transactions').insert(row)
      if (error) throw error
    } catch (e) {
      if (opts.queue === false || !isOfflineError(e)) throw e
      if (!enqueue({ table: 'life_transactions', row, module: 'money' })) throw e
      setAll(prev => [{ ...row, description: row.description ?? null } as Transaction, ...prev.filter(t => t.id !== row.id)])
      toast(lifeT().offline.queued, { icon: '☁️' })
      return 'queued'
    }
    await load()
    ;(async () => {
      const { count } = await db.from('life_transactions')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
      // Check positive month balance
      const zone = lifeTimeZone()
      const todayNow = todayKey(zone)
      const [monthStart] = monthRange(todayNow.slice(0, 7), zone)
      const { data: monthTxs } = await db.from('life_transactions')
        .select('type,amount').eq('user_id', user.id).eq('currency', data.currency).gte('occurred_at', monthStart)
        // Lo programado para más adelante todavía no cuenta
        .lt('occurred_at', startOfLocalDayISO(shiftDate(todayNow, 1), zone))
      const balance = (monthTxs ?? []).reduce((s: number, t: { type: string; amount: string }) =>
        s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      if (Math.round(balance * 100) > 0) void award(user.id, 'first_positive_month', 'Mes con superávit')
    })().catch(() => {})
    return 'saved'
  }, [user, load])

  const updateTransaction = useCallback(async (id: string, data: Partial<TransactionFormData>) => {
    if (!user) return
    const { error } = await db.from('life_transactions').update(data).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  /** Oculta el movimiento en pantalla (para borrar con "Deshacer"). */
  const hideTransaction = useCallback((id: string) => setAll(prev => prev.filter(t => t.id !== id)), [])

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await db.from('life_transactions').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  return {
    transactions, previous, grouped, loading, reload: load, upcoming, upcomingTotals, maxMonth, today,
    monthIncome, monthExpense, monthBalance, monthCurve, otherTotals, mainCurrency,
    hasData: transactions.length > 0 || upcoming.length > 0, everHasData,
    createTransaction, updateTransaction, deleteTransaction, hideTransaction,
  }
}
