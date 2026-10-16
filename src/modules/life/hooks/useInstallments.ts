import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'
import { lifeDayOf, lifeTimeZone, todayKey } from '../lib/zonedTime'
import type { TransactionFormData } from './useMoney'

// Compras en cuotas (supabase/migrations/20261029000002_life_installments.sql). La base carga las cuotas vencidas con
// life_materialize_installments: sin duplicar, sin volver a cargar lo que se borró y nada después de cancelar.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface InstallmentPlan {
  id: string
  description: string | null
  category: string | null
  currency: string
  total_amount: number
  installments: number
  first_date: string
  goal_id: string | null
  last_no: number
  cancelled_at: string | null
  created_at?: string
}

let materializedOn: string | null = null
let pending: Promise<number> | null = null

/**
 * Carga las cuotas vencidas (una vez por día y pestaña, salvo `force`). Devuelve cuántas creó.
 * Quien llama mientras otra carga está en curso espera esa misma (Dinero y la tarjeta de cuotas leen después).
 */
export function materializeInstallments(force = false): Promise<number> {
  // "Hoy" y la hora del movimiento en la zona de la cuenta (lib/zonedTime.ts)
  const tz = lifeTimeZone()
  const today = todayKey(tz)
  // Por cuenta, día y zona: si en la misma pestaña entra otra cuenta, a esa también se le cargan sus cuotas
  const key = `${useAuthStore.getState().user?.id ?? ''}|${today}|${tz}`
  if (!force && materializedOn === key) return pending ?? Promise.resolve(0)
  materializedOn = key
  const run: Promise<number> = (async () => {
    const { data, error } = await db.rpc('life_materialize_installments', { p_today: today, p_tz: tz })
    if (error) { materializedOn = null; return 0 }
    return Number(data) || 0
  })().catch(() => { materializedOn = null; return 0 })
  pending = run
  return run
}

function moneyChanged() {
  window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'money' } }))
}

export function useInstallments() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    // Si Dinero está cargando las cuotas vencidas, se espera para leer last_no al día
    await materializeInstallments()
    const { data, error } = await db.from('life_installment_plans').select('*').eq('user_id', user.id).order('first_date')
    if (!error) {
      setItems((data ?? []).map((r: InstallmentPlan) => ({
        ...r, total_amount: Number(r.total_amount), installments: Number(r.installments), last_no: Number(r.last_no ?? 0),
      })))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // Recargar cuando Dinero cambia (al cargar cuotas, borrar o importar)
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'money') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  /** Nueva compra en cuotas: `data.amount` es el total y la fecha, la de la primera cuota. Lo vencido se carga enseguida. */
  const create = useCallback(async (data: TransactionFormData, count: number) => {
    if (!user) return
    const date = /^\d{4}-\d{2}-\d{2}$/.test(data.occurred_at) ? data.occurred_at : lifeDayOf(data.occurred_at)
    const { error } = await db.from('life_installment_plans').insert({
      user_id: user.id, description: data.description?.trim() || null, category: data.category || null,
      currency: data.currency, total_amount: data.amount, installments: count, first_date: date,
      goal_id: data.goal_id ?? null, last_no: 0, cancelled_at: null,
    })
    if (error) throw error
    await materializeInstallments(true)
    await load()
    moneyChanged()
  }, [user, load])

  /** No se cargan más cuotas. Las ya cargadas quedan. */
  const cancel = useCallback(async (id: string) => {
    if (!user) return
    // Lo que venció hasta hoy queda cargado antes de cortar
    await materializeInstallments(true)
    const { error } = await db.from('life_installment_plans')
      .update({ cancelled_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
    moneyChanged()
  }, [user, load])

  /** Borra la compra y las cuotas que ya se cargaron (para un error al cargarla). */
  const remove = useCallback(async (id: string) => {
    if (!user) return
    const { error: txError } = await db.from('life_transactions').delete().eq('installment_plan_id', id).eq('user_id', user.id)
    if (txError) throw txError
    const { error } = await db.from('life_installment_plans').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
    moneyChanged()
  }, [user, load])

  const hide = useCallback((id: string) => setItems(prev => prev.filter(r => r.id !== id)), [])

  return { items, loading, reload: load, create, cancel, remove, hide }
}
