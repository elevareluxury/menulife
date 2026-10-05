import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

export const LIFE_DATA_UPDATED = 'life-data-updated'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const PAGE = 60

// ── Tipos ────────────────────────────────────────────────────────────────────

export type BrainItemType = 'idea' | 'note' | 'task'

export interface BrainItem {
  id: string
  type: BrainItemType
  title: string
  content: string | null
  is_completed: boolean
  is_archived: boolean
  // Sólo en tareas
  due_date?: string | null
  due_time?: string | null
  is_focus?: boolean | null
  goal_id?: string | null
  created_at: string
  updated_at: string
}

export interface BrainFormData {
  type: BrainItemType
  title: string
  content?: string
  goal_id?: string | null
}

/** Texto de búsqueda seguro para el filtro `or` de PostgREST. */
function searchPattern(q: string): string {
  return `%${q.replace(/[%_\\,()*]/g, ' ').trim()}%`
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBrain({ archived = false, query = '', types = null }: { archived?: boolean; query?: string; types?: BrainItemType[] | null } = {}) {
  const { user } = useAuthStore()
  const [items, setItems]     = useState<BrainItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [counts, setCounts]   = useState({ idea: 0, note: 0, task: 0 })
  const q = query.trim()
  const typeKey = types ? [...types].sort().join(',') : ''

  const fetchPage = useCallback(async (offset: number) => {
    if (!user) return { rows: [] as BrainItem[], err: null }
    let req = db.from('life_brain_items').select('*')
      .eq('user_id', user.id).eq('is_archived', archived)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (typeKey) req = req.in('type', typeKey.split(','))
    if (q.length >= 2) {
      const p = searchPattern(q)
      req = req.or(`title.ilike.${p},content.ilike.${p}`)
    }
    const { data, error: err } = await req
    return { rows: (data ?? []) as BrainItem[], err }
  }, [user, archived, q, typeKey])

  const loadCounts = useCallback(async () => {
    if (!user || archived) return
    const count = (type: BrainItemType, pendingOnly = false) => {
      let req = db.from('life_brain_items').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_archived', false).eq('type', type)
      if (pendingOnly) req = req.eq('is_completed', false)
      return req
    }
    const [i, n, t] = await Promise.all([count('idea'), count('note'), count('task', true)])
    setCounts({ idea: i.count ?? 0, note: n.count ?? 0, task: t.count ?? 0 })
  }, [user, archived])

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const { rows, err } = await fetchPage(0)
    if (err) { setError(true); setItems([]) }
    else { setError(false); setItems(rows); setHasMore(rows.length === PAGE) }
    setLoading(false)
    void loadCounts()
  }, [user, fetchPage, loadCounts])

  const loadMore = useCallback(async () => {
    const { rows, err } = await fetchPage(items.length)
    if (err) throw err
    setItems(prev => [...prev, ...rows.filter(r => !prev.some(p => p.id === r.id))])
    setHasMore(rows.length === PAGE)
  }, [fetchPage, items.length])

  useEffect(() => {
    let alive = true
    // Al buscar, espera a que el usuario deje de escribir
    const id = window.setTimeout(() => { if (alive) void load() }, q ? 300 : 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load, q])

  // Recargar cuando el botón + inserta algo en Brain
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'brain') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const ideasCount = counts.idea
  const notesCount = counts.note
  const tasksCount = counts.task
  const totalCount = useMemo(() => counts.idea + counts.note + counts.task, [counts])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const createItem = useCallback(async (data: BrainFormData): Promise<void> => {
    if (!user) return
    const { error: err } = await db.from('life_brain_items').insert({
      ...data, user_id: user.id, is_completed: false, is_archived: false,
    })
    if (err) throw err
    await load()
    void (async () => {
      const { count: total } = await db.from('life_brain_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (total === 1) void award(user.id, 'first_brain_item', 'Primera captura')
      if (data.type === 'idea') {
        const { count: ic } = await db.from('life_brain_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('type', 'idea')
        if (ic === 10) void award(user.id, 'ideas_10', '10 ideas guardadas')
        if (ic === 50) void award(user.id, 'ideas_50', '50 ideas guardadas')
      }
    })()
  }, [user, load])

  const updateItem = useCallback(async (id: string, data: Partial<BrainFormData>): Promise<void> => {
    if (!user) return
    const { error: err } = await db.from('life_brain_items')
      .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (err) throw err
    await load()
  }, [user, load])

  /** Oculta el ítem en pantalla (para borrar o archivar con "Deshacer"). */
  const hideLocally = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    if (!user) return
    const { error: err } = await db.from('life_brain_items').delete().eq('id', id).eq('user_id', user.id)
    if (err) throw err
    void loadCounts()
  }, [user, loadCounts])

  const setArchived = useCallback(async (id: string, value: boolean): Promise<void> => {
    if (!user) return
    const { error: err } = await db.from('life_brain_items')
      .update({ is_archived: value, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (err) throw err
    void loadCounts()
  }, [user, loadCounts])

  const toggleComplete = useCallback(async (item: BrainItem): Promise<void> => {
    if (!user) return
    const newDone = !item.is_completed
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_completed: newDone } : i)))
    const { error: err } = await db.from('life_brain_items')
      .update({ is_completed: newDone, updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('user_id', user.id)
    if (err) {
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_completed: item.is_completed } : i)))
      throw err
    }
    void loadCounts()
    if (newDone) {
      void (async () => {
        const { count } = await db.from('life_brain_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('type', 'task').eq('is_completed', true)
        if (count === 10) void award(user.id, 'tasks_10', '10 tareas completadas')
        if (count === 50) void award(user.id, 'tasks_50', '50 tareas completadas')
      })()
    }
  }, [user, loadCounts])

  return {
    items, loading, error, hasMore, reload: load, loadMore,
    ideasCount, notesCount, tasksCount, totalCount,
    createItem, updateItem, deleteItem, setArchived, hideLocally, toggleComplete,
  }
}
