import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'
import { balances, type PersonBalance, type Split, type SplitDebt } from '../lib/splits'

// Gastos compartidos (supabase/migrations/20261029000003_life_shared_expenses.sql): quién te debe y a quién le debés.
// El movimiento registra lo que salió de tu bolsillo; las deudas viven en life_splits.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const LIMIT = 2000

function moneyChanged() {
  window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'money' } }))
}

function newId(): string {
  try { return crypto.randomUUID() } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }
}

export interface SettleOptions {
  /** Registrar el ingreso de lo que te devolvieron (lo que te debían) */
  record: boolean
  /** Descripción del ingreso ("Juan te devolvió") */
  description: string
}

export function useSplits() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<Split[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await db.from('life_splits').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(LIMIT)
    if (!error) setItems((data ?? []).map((s: Split) => ({ ...s, amount: Number(s.amount) })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // Si cambia Dinero (por ejemplo, se borró un movimiento compartido), se vuelve a leer
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'money') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const pending = useMemo(() => items.filter(s => !s.settled_at), [items])
  const byPerson = useMemo<PersonBalance[]>(() => balances(items), [items])
  /** Movimientos que son parte de una cuenta compartida (el gasto o la devolución) */
  const sharedTxIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of items) {
      if (s.transaction_id) set.add(s.transaction_id)
      if (s.settlement_transaction_id) set.add(s.settlement_transaction_id)
    }
    return set
  }, [items])

  /** Deudas de un gasto compartido recién creado. */
  const create = useCallback(async (transactionId: string | null, currency: string, debts: SplitDebt[], note?: string | null) => {
    if (!user || !debts.length) return
    const rows = debts.map(d => ({
      id: newId(), user_id: user.id, transaction_id: transactionId, person: d.person, direction: d.direction,
      amount: d.amount, currency, note: note?.trim().slice(0, 200) || null,
    }))
    const { error } = await db.from('life_splits').insert(rows)
    if (error) throw error
    await load()
  }, [user, load])

  /**
   * Salda todo lo pendiente con una persona en una moneda. Si `record` y te debían algo, registra el ingreso
   * (categoría "Otros"). Devuelve cómo deshacerlo.
   */
  const settle = useCallback(async (b: PersonBalance, income: number, opts: SettleOptions): Promise<() => Promise<void>> => {
    if (!user) return async () => {}
    const ids = b.items.map(s => s.id)
    let txId: string | null = null
    if (opts.record && income > 0) {
      txId = newId()
      const { error } = await db.from('life_transactions').insert({
        id: txId, user_id: user.id, type: 'income', amount: income, category: 'Otros',
        description: opts.description.slice(0, 120), currency: b.currency, occurred_at: new Date().toISOString(),
      })
      if (error) throw error
    }
    const { error } = await db.from('life_splits')
      .update({ settled_at: new Date().toISOString(), settlement_transaction_id: txId })
      .eq('user_id', user.id).in('id', ids)
    if (error) {
      if (txId) await db.from('life_transactions').delete().eq('id', txId).eq('user_id', user.id)
      throw error
    }
    await load()
    if (txId) moneyChanged()
    return async () => {
      const { error: e1 } = await db.from('life_splits').update({ settled_at: null, settlement_transaction_id: null })
        .eq('user_id', user.id).in('id', ids)
      if (e1) throw e1
      if (txId) {
        const { error: e2 } = await db.from('life_transactions').delete().eq('id', txId).eq('user_id', user.id)
        if (e2) throw e2
      }
      await load()
      if (txId) moneyChanged()
    }
  }, [user, load])

  /** Oculta deudas en pantalla (para borrar con "Deshacer"). */
  const hide = useCallback((ids: string[]) => setItems(prev => prev.filter(s => !ids.includes(s.id))), [])

  const remove = useCallback(async (ids: string[]) => {
    if (!user || !ids.length) return
    const { error } = await db.from('life_splits').delete().eq('user_id', user.id).in('id', ids)
    if (error) throw error
    await load()
  }, [user, load])

  /** Al borrar un movimiento compartido se van sus deudas pendientes (las saldadas quedan como historia). */
  const pendingFor = useCallback((transactionId: string) => pending.filter(s => s.transaction_id === transactionId).map(s => s.id), [pending])

  return { items, pending, byPerson, sharedTxIds, loading, reload: load, create, settle, hide, remove, pendingFor }
}

export { newId as newSplitId }
