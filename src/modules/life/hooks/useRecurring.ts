import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'
import type { TransactionFormData } from './useMoney'

// Gastos e ingresos fijos que se repiten cada mes (supabase/migrations/20261027000001_life_recurring_transactions.sql).
// La base carga lo que ya venció con life_materialize_recurring: sin duplicar y sin volver a cargar lo que se borró.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface RecurringTx {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string | null
  description: string | null
  currency: string
  goal_id: string | null
  day_of_month: number
  starts_on: string
  last_period: string | null
  active: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
export function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const monthOf = (key: string) => key.slice(0, 7)
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
/** Fecha del fijo en un mes ('YYYY-MM'): el día elegido, o el último si el mes es más corto. */
export function dueIn(ym: string, day: number): string {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${pad(Math.min(day, new Date(y, m, 0).getDate()))}`
}

/** Próxima fecha en que se va a cargar: el primer vencimiento que todavía no se cargó (y no antes del inicio). */
export function nextDue(r: Pick<RecurringTx, 'day_of_month' | 'starts_on' | 'last_period'>): string {
  let ym = r.last_period ? addMonths(r.last_period, 1) : monthOf(r.starts_on)
  let due = dueIn(ym, r.day_of_month)
  if (due < r.starts_on) { ym = addMonths(ym, 1); due = dueIn(ym, r.day_of_month) }
  return due
}

let materializedOn: string | null = null

/** Carga los fijos vencidos (una vez por día y pestaña, salvo `force`). Devuelve cuántos movimientos creó. */
export async function materializeRecurring(force = false): Promise<number> {
  const today = localDateKey()
  if (!force && materializedOn === today) return 0
  materializedOn = today
  let tz = 'UTC'
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { /* UTC */ }
  const { data, error } = await db.rpc('life_materialize_recurring', { p_today: today, p_tz: tz })
  if (error) { materializedOn = null; return 0 }
  return Number(data) || 0
}

function moneyChanged() {
  window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'money' } }))
}

function templateFields(data: TransactionFormData) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(data.occurred_at) ? data.occurred_at.slice(0, 10) : localDateKey()
  const fields = {
    type: data.type, amount: data.amount, category: data.category || null, description: data.description?.trim() || null,
    currency: data.currency, goal_id: data.goal_id ?? null, day_of_month: Number(date.slice(8, 10)),
  }
  return { fields, date }
}

export function useRecurring() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<RecurringTx[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await db.from('life_recurring_transactions').select('*').eq('user_id', user.id).order('day_of_month')
    if (!error) setItems((data ?? []).map((r: RecurringTx) => ({ ...r, amount: Number(r.amount) })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  /** Nuevo fijo desde la fecha elegida: si ya venció, el movimiento de este mes se carga enseguida. */
  const create = useCallback(async (data: TransactionFormData) => {
    if (!user) return
    const { fields, date } = templateFields(data)
    const { error } = await db.from('life_recurring_transactions').insert({ ...fields, user_id: user.id, starts_on: date, active: true })
    if (error) throw error
    await materializeRecurring(true)
    await load()
    moneyChanged()
  }, [user, load])

  /** Cambia importe, categoría, etc. y el día del mes; vale de acá en adelante (lo cargado no se toca). */
  const update = useCallback(async (id: string, data: TransactionFormData) => {
    if (!user) return
    const { fields } = templateFields(data)
    const { error } = await db.from('life_recurring_transactions')
      .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await materializeRecurring(true)
    await load()
    moneyChanged()
  }, [user, load])

  /** Pausar o reanudar. Al reanudar no se cargan los meses en pausa: sigue desde el próximo vencimiento. */
  const setActive = useCallback(async (r: RecurringTx, active: boolean) => {
    if (!user) return
    const patch: Partial<RecurringTx> & { updated_at: string } = { active, updated_at: new Date().toISOString() }
    if (active) {
      const today = localDateKey()
      const thisMonth = monthOf(today)
      const lastDone = dueIn(thisMonth, r.day_of_month) <= today ? thisMonth : addMonths(thisMonth, -1)
      if (!r.last_period || r.last_period < lastDone) patch.last_period = lastDone
    }
    const { error } = await db.from('life_recurring_transactions').update(patch).eq('id', r.id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  /** Deja de repetirse. Los movimientos ya cargados quedan. */
  const remove = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await db.from('life_recurring_transactions').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  const hide = useCallback((id: string) => setItems(prev => prev.filter(r => r.id !== id)), [])

  return { items, loading, reload: load, create, update, setActive, remove, hide }
}
