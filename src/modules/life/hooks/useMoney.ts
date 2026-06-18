import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

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
}

export interface TransactionFormData {
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  currency: string
  occurred_at: string
}

export interface TransactionGroup {
  date: string
  items: Transaction[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function groupByDate(txs: Transaction[]): TransactionGroup[] {
  const map = new Map<string, Transaction[]>()
  txs.forEach(tx => {
    const date = tx.occurred_at.split('T')[0]
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

  useEffect(() => { load() }, [load])

  const monthStart = startOfMonth()
  const thisMonthTxs = useMemo(
    () => transactions.filter(t => t.occurred_at >= monthStart),
    [transactions, monthStart]
  )

  const monthIncome  = useMemo(() => thisMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [thisMonthTxs])
  const monthExpense = useMemo(() => thisMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [thisMonthTxs])
  const monthBalance = monthIncome - monthExpense
  const monthCurve   = useMemo(() => buildMonthCurve(thisMonthTxs), [thisMonthTxs])

  const grouped = useMemo(() => groupByDate(transactions), [transactions])

  // ── Actions ────────────────────────────────────────────────────────────────

  const createTransaction = useCallback(async (data: TransactionFormData) => {
    if (!user) return
    await db.from('life_transactions').insert({ ...data, user_id: user.id })
    await load()
    ;(async () => {
      const { count } = await db.from('life_transactions')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
      // Check positive month balance
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`
      const { data: monthTxs } = await db.from('life_transactions')
        .select('type,amount').eq('user_id', user.id).gte('occurred_at', monthStart)
      const balance = (monthTxs ?? []).reduce((s: number, t: { type: string; amount: string }) =>
        s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
      if (balance > 0) void award(user.id, 'first_positive_month', 'Mes con superávit')
    })()
  }, [user, load])

  const updateTransaction = useCallback(async (id: string, data: Partial<TransactionFormData>) => {
    if (!user) return
    await db.from('life_transactions').update(data).eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return
    await db.from('life_transactions').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  return {
    transactions, grouped, loading, reload: load,
    monthIncome, monthExpense, monthBalance, monthCurve,
    hasData: transactions.length > 0,
    createTransaction, updateTransaction, deleteTransaction,
  }
}
