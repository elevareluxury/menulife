import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

export const LIFE_DATA_UPDATED = 'life-data-updated'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Types ────────────────────────────────────────────────────────────────────

export type BrainItemType = 'idea' | 'note' | 'task'

export interface BrainItem {
  id: string
  type: BrainItemType
  title: string
  content: string | null
  is_completed: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface BrainFormData {
  type: BrainItemType
  title: string
  content?: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBrain() {
  const { user } = useAuthStore()
  const [items, setItems]     = useState<BrainItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const { data, error: qErr } = await db
        .from('life_brain_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(200)
      if (qErr) {
        console.error('[useBrain] query error:', qErr)
        setError('No se pudieron cargar tus items. Revisá tu conexión.')
        setItems([])
      } else {
        setError(null)
        setItems(data ?? [])
      }
    } catch (e) {
      console.error('[useBrain] unexpected error:', e)
      setError('Error inesperado al cargar Brain.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Recargar cuando CaptureButton u otro componente inserte un item de Brain
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'brain') load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const ideasCount    = useMemo(() => items.filter(i => i.type === 'idea').length, [items])
  const notesCount    = useMemo(() => items.filter(i => i.type === 'note').length, [items])
  const tasksCount    = useMemo(() => items.filter(i => i.type === 'task' && !i.is_completed).length, [items])

  // ── Actions ────────────────────────────────────────────────────────────────

  const createItem = useCallback(async (data: BrainFormData): Promise<void> => {
    if (!user) return
    await db.from('life_brain_items').insert({
      ...data,
      user_id: user.id,
      is_completed: false,
      is_archived: false,
    })
    await load()

    // Milestone checks (fire-and-forget)
    ;(async () => {
      const { count: total } = await db
        .from('life_brain_items').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (total === 1) void award(user.id, 'first_brain_item', 'Primera captura')

      if (data.type === 'idea') {
        const { count: ic } = await db
          .from('life_brain_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('type', 'idea')
        if (ic === 10) void award(user.id, 'ideas_10', '10 ideas guardadas')
        if (ic === 50) void award(user.id, 'ideas_50', '50 ideas guardadas')
      }
    })()
  }, [user, load])

  const updateItem = useCallback(async (id: string, data: Partial<BrainFormData>): Promise<void> => {
    if (!user) return
    await db.from('life_brain_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    if (!user) return
    await db.from('life_brain_items').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const toggleComplete = useCallback(async (item: BrainItem): Promise<void> => {
    if (!user) return
    const newDone = !item.is_completed
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newDone } : i))
    try {
      const { error: upErr } = await db.from('life_brain_items')
        .update({ is_completed: newDone, updated_at: new Date().toISOString() })
        .eq('id', item.id).eq('user_id', user.id)
      if (upErr) throw upErr

      if (newDone) {
        ;(async () => {
          const { count } = await db
            .from('life_brain_items').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('type', 'task').eq('is_completed', true)
          if (count === 10) void award(user.id, 'tasks_10', '10 tareas completadas')
          if (count === 50) void award(user.id, 'tasks_50', '50 tareas completadas')
        })()
      }
    } catch (e) {
      // Rollback: volver al estado anterior
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: item.is_completed } : i))
      toast.error('No se pudo actualizar la tarea. Revisá tu conexión.')
      console.error('[useBrain] toggleComplete error:', e)
    }
  }, [user])

  const archiveItem = useCallback(async (id: string): Promise<void> => {
    if (!user) return
    await db.from('life_brain_items')
      .update({ is_archived: true })
      .eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  return {
    items, loading, error, reload: load,
    ideasCount, notesCount, tasksCount,
    createItem, updateItem, deleteItem, toggleComplete, archiveItem,
  }
}
