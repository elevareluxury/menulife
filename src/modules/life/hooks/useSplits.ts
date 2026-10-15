import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'
import { balances, diffSplits, type PersonBalance, type Split, type SplitDebt } from '../lib/splits'

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

  /**
   * Al editar un gasto compartido: sus deudas pendientes pasan a ser `debts` (vacío = ya no es compartido), en
   * `currency`. Las saldadas no se tocan. Si algo falla a mitad de camino, vuelve todo como estaba y lanza el error.
   * Devuelve qué cambió y cómo deshacerlo.
   */
  const applyEdit = useCallback(async (transactionId: string, debts: SplitDebt[], currency: string, note: string | null)
    : Promise<{ changed: boolean; removedAll: boolean; undo: () => Promise<void> }> => {
    const noop = { changed: false, removedAll: false, undo: async () => {} }
    if (!user) return noop
    // Se lee de la base (no de la pantalla): así no se pisa nada que haya cambiado en otro lado
    const { data, error: readError } = await db.from('life_splits').select('*').eq('user_id', user.id).eq('transaction_id', transactionId)
    if (readError) throw readError
    const before: Split[] = (data ?? []).map((s: Split) => ({ ...s, amount: Number(s.amount) }))
    const pendingBefore = before.filter(s => !s.settled_at)
    // Si algo ya se saldó, la parte compartida no se toca (la pantalla tampoco deja editarla)
    if (before.some(s => s.settled_at)) return noop
    const cleanNote = note?.trim().slice(0, 200) || null
    const changes = diffSplits(pendingBefore, debts, currency, cleanNote)
    if (!changes.update.length && !changes.insert.length && !changes.remove.length) return noop

    const inserted = changes.insert.map(d => ({
      id: newId(), user_id: user.id, transaction_id: transactionId, person: d.person, direction: d.direction,
      amount: d.amount, currency, note: cleanNote,
    }))
    const restore = async () => {
      if (inserted.length) await db.from('life_splits').delete().eq('user_id', user.id).in('id', inserted.map(r => r.id))
      for (const s of pendingBefore) {
        if (changes.remove.includes(s.id)) continue
        await db.from('life_splits').update({ person: s.person, amount: s.amount, currency: s.currency, note: s.note })
          .eq('user_id', user.id).eq('id', s.id)
      }
      const removed = pendingBefore.filter(s => changes.remove.includes(s.id))
      if (removed.length) {
        const { error } = await db.from('life_splits').upsert(removed.map(s => ({
          id: s.id, user_id: user.id, transaction_id: s.transaction_id, person: s.person, direction: s.direction,
          amount: s.amount, currency: s.currency, note: s.note, created_at: s.created_at,
        })), { onConflict: 'id', ignoreDuplicates: true })
        if (error) throw error
      }
    }
    try {
      for (const u of changes.update) {
        const { error } = await db.from('life_splits').update({ person: u.person, amount: u.amount, currency: u.currency, note: u.note })
          .eq('user_id', user.id).eq('id', u.id).is('settled_at', null)
        if (error) throw error
      }
      if (inserted.length) {
        const { error } = await db.from('life_splits').insert(inserted)
        if (error) throw error
      }
      if (changes.remove.length) {
        const { error } = await db.from('life_splits').delete().eq('user_id', user.id).in('id', changes.remove).is('settled_at', null)
        if (error) throw error
      }
    } catch (e) {
      await restore().catch(() => {})
      await load()
      throw e
    }
    await load()
    return {
      changed: true,
      removedAll: !debts.length && pendingBefore.length > 0,
      undo: async () => { await restore(); await load() },
    }
  }, [user, load])

  /** Deudas de un movimiento (pendientes y saldadas), para editarlo. */
  const forTransaction = useCallback((transactionId: string) => items.filter(s => s.transaction_id === transactionId), [items])

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

  return { items, pending, byPerson, sharedTxIds, loading, reload: load, create, settle, hide, remove, pendingFor, applyEdit, forTransaction }
}

export { newId as newSplitId }
