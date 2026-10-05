import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { LIFE_DATA_UPDATED } from './useBrain'
import { useLocaleStore } from '@/store/localeStore'

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

/** Inicio del mes en hora local, como instante ISO (comparable con occurred_at). */
function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

/** Fecha local (YYYY-MM-DD) de un instante ISO. */
export function localDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

/** Cumulative balance per day for the current month (for sparkline). */
export function buildMonthCurve(txs: Transaction[]): number[] {
  const now = new Date()
  const days = now.getDate()  // today's date number
  const year = now.getFullYear()

  const daily = new Array(days).fill(0)
  txs.forEach(tx => {
    const d = new Date(tx.occurred_at)
    if (d.getFullYear() === year && d.getMonth() + 1 === now.getMonth() + 1) {
      const idx = d.getDate() - 1
      if (idx >= 0 && idx < days) {
        daily[idx] += tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)
      }
    }
  })

  const curve: number[] = []
  let running = 0
  for (const v of daily) { running += v; curve.push(running) }
  return curve
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMoney() {
  const { user } = useAuthStore()
  const mainCurrency = useLocaleStore(s => s.currency)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    // Last 3 months for history; filter month in JS for stats
    const since = (() => {
      const d = new Date()
      d.setMonth(d.getMonth() - 3)
      return d.toISOString()
    })()
    const { data } = await db.from('life_transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }, [user])

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

  const monthStart = startOfMonth()
  const thisMonthTxs = useMemo(
    () => transactions.filter(t => t.occurred_at >= monthStart),
    [transactions, monthStart]
  )

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
    () => buildMonthCurve(thisMonthTxs.filter(t => (t.currency || mainCurrency) === mainCurrency)),
    [thisMonthTxs, mainCurrency],
  )

  const grouped = useMemo(() => groupByDate(transactions), [transactions])

  // ── Actions ────────────────────────────────────────────────────────────────

  const createTransaction = useCallback(async (data: TransactionFormData) => {
    if (!user) return
    const { error } = await db.from('life_transactions').insert({ ...data, user_id: user.id })
    if (error) throw error
    await load()
    ;(async () => {
      const { count } = await db.from('life_transactions')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
      // Check positive month balance
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: monthTxs } = await db.from('life_transactions')
        .select('type,amount').eq('user_id', user.id).eq('currency', data.currency).gte('occurred_at', monthStart)
      const balance = (monthTxs ?? []).reduce((s: number, t: { type: string; amount: string }) =>
        s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      if (balance > 0) void award(user.id, 'first_positive_month', 'Mes con superávit')
    })()
  }, [user, load])

  const updateTransaction = useCallback(async (id: string, data: Partial<TransactionFormData>) => {
    if (!user) return
    const { error } = await db.from('life_transactions').update(data).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  /** Oculta el movimiento en pantalla (para borrar con "Deshacer"). */
  const hideTransaction = useCallback((id: string) => setTransactions(prev => prev.filter(t => t.id !== id)), [])

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await db.from('life_transactions').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  return {
    transactions, grouped, loading, reload: load,
    monthIncome, monthExpense, monthBalance, monthCurve, otherTotals, mainCurrency,
    hasData: transactions.length > 0,
    createTransaction, updateTransaction, deleteTransaction, hideTransaction,
  }
}
