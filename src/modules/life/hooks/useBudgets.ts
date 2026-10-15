import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { LifeDict } from '@/i18n/app/life'
import { LIFE_DATA_UPDATED } from './useBrain'
import type { Budget } from '../lib/budgets'

// Presupuestos amables (supabase/migrations/20261030000001_life_budgets.sql): uno por categoría y moneda, hasta 60.
// Lo gastado se calcula en el dispositivo (lib/budgets.ts) con los movimientos del mes que ya trae useMoney.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useBudgets() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<Budget[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await db.from('life_budgets').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    // Sin la tabla (migración sin aplicar) o sin red: sin presupuestos
    setItems(error ? [] : (data ?? []).map((r: Budget) => ({ ...r, amount: Number(r.amount) })))
    setLoaded(true)
  }, [user])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // "Borrar datos de Life OS" (y cualquier cambio en Dinero desde otra pantalla) vuelve a leer
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'money') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const create = useCallback(async (category: string, currency: string, amount: number) => {
    if (!user) return
    const row: Budget = { id: crypto.randomUUID(), category, currency, amount, created_at: new Date().toISOString() }
    const { error } = await db.from('life_budgets').insert({ id: row.id, user_id: user.id, category, currency, amount })
    if (error) throw error
    setItems(prev => [...prev, row])
  }, [user])

  const setAmount = useCallback(async (id: string, amount: number) => {
    if (!user) return
    const { error } = await db.from('life_budgets').update({ amount }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    setItems(prev => prev.map(b => (b.id === id ? { ...b, amount } : b)))
  }, [user])

  const remove = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await db.from('life_budgets').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
  }, [user])

  /** Sólo en pantalla (para borrar con "Deshacer"). */
  const hide = useCallback((id: string) => setItems(prev => prev.filter(b => b.id !== id)), [])

  return { items, loaded, reload: load, create, setAmount, remove, hide }
}

/** Error de la base → texto (tope de 60 o ya había uno para esa categoría y moneda en otra pestaña). */
export function budgetSaveError(err: unknown, t: LifeDict): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.message?.includes('budget_limit')) return t.budgets.errors.limit
  if (e?.code === '23505') return t.budgets.errors.duplicate
  return t.common.saveError
}
