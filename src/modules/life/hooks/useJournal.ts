import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { shiftMonth } from '../lib/moneyInsights'

// Diario privado (V1.1, FEATURES.journal): life_journal_entries, sólo de la dueña (RLS). No pasa por la búsqueda
// general, Insights, "Tu mes", métricas ni el calendario: sólo este hook la lee.
const db = supabase as unknown as SupabaseClient

export const JOURNAL_MAX = 10_000
const SEARCH_LIMIT = 100

export interface JournalEntry {
  id: string
  entry_date: string
  body: string
  created_at: string
  updated_at: string
}

export type JournalSaveError = 'day_full' | 'total_full' | 'too_long' | 'empty' | 'save'

const COLS = 'id,entry_date,body,created_at,updated_at'

function sortEntries(list: JournalEntry[]): JournalEntry[] {
  return [...list].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at))
}

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function matchesJournal(body: string, query: string): boolean {
  const q = foldText(query.trim())
  return q.length > 0 && foldText(body).includes(q)
}

function saveError(err: { message?: string } | null | undefined): JournalSaveError {
  const m = err?.message ?? ''
  if (m.includes('journal_day_limit')) return 'day_full'
  if (m.includes('journal_limit')) return 'total_full'
  return 'save'
}

export class JournalError extends Error {
  constructor(public readonly kind: JournalSaveError) { super(kind) }
}

function cleanBody(body: string): string {
  const b = body.replace(/\s+$/, '')
  if (!b.trim()) throw new JournalError('empty')
  if (b.length > JOURNAL_MAX) throw new JournalError('too_long')
  return b
}

/**
 * Entradas de un mes ('YYYY-MM') o, si `query` tiene 2 letras o más, las que la contienen (en todo el diario, hasta
 * 100). `enabled` = false mientras está bloqueado: no se pide nada.
 */
export function useJournal({ month, query, enabled }: { month: string; query: string; enabled: boolean }) {
  const userId = useAuthStore(s => s.user?.id)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [error, setError] = useState(false)
  const [nonce, setNonce] = useState(0)
  const q = query.trim()
  const searching = q.length >= 2
  // Cargando mientras lo que se muestra no corresponde al mes o la búsqueda pedidos (recargar no vuelve a "cargando")
  const viewKey = searching ? `q:${q}` : `m:${month}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = loadedKey !== viewKey

  useEffect(() => {
    if (!userId || !enabled) return
    let cancelled = false
    let req = db.from('life_journal_entries').select(COLS).eq('user_id', userId)
    if (searching) {
      // La base trae candidatos; el dispositivo confirma (sin acentos ni mayúsculas)
      const like = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`
      req = req.ilike('body', like)
    } else {
      req = req.gte('entry_date', `${month}-01`).lt('entry_date', `${shiftMonth(month, 1)}-01`)
    }
    req.order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(searching ? SEARCH_LIMIT : 1000)
      .then(({ data, error: err }) => {
        if (cancelled) return
        setLoadedKey(viewKey)
        if (err) { setError(true); return }
        const list = (data ?? []) as JournalEntry[]
        setEntries(sortEntries(searching ? list.filter(e => matchesJournal(e.body, q)) : list))
        setError(false)
      })
    return () => { cancelled = true }
  }, [userId, enabled, month, q, searching, viewKey, nonce])

  const reload = useCallback(() => setNonce(n => n + 1), [])

  const visible = useCallback((e: JournalEntry) => (searching ? matchesJournal(e.body, q) : e.entry_date.startsWith(`${month}-`)), [searching, q, month])

  const create = useCallback(async (input: { entry_date: string; body: string }): Promise<JournalEntry> => {
    if (!userId) throw new JournalError('save')
    const body = cleanBody(input.body)
    const { data, error: err } = await db.from('life_journal_entries')
      .insert({ user_id: userId, entry_date: input.entry_date, body }).select(COLS).single()
    if (err || !data) throw new JournalError(saveError(err))
    const entry = data as JournalEntry
    if (visible(entry)) setEntries(prev => sortEntries([entry, ...prev]))
    return entry
  }, [userId, visible])

  const update = useCallback(async (id: string, patch: { entry_date: string; body: string }) => {
    const body = cleanBody(patch.body)
    const { data, error: err } = await db.from('life_journal_entries')
      .update({ entry_date: patch.entry_date, body }).eq('id', id).select(COLS).single()
    if (err || !data) throw new JournalError(saveError(err))
    const entry = data as JournalEntry
    setEntries(prev => sortEntries(prev.map(e => (e.id === id ? entry : e)).filter(visible)))
  }, [visible])

  const hideLocally = useCallback((id: string) => setEntries(prev => prev.filter(e => e.id !== id)), [])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await db.from('life_journal_entries').delete().eq('id', id)
    if (err) throw err
  }, [])

  return { entries, loading, error, searching, reload, create, update, hideLocally, remove }
}
