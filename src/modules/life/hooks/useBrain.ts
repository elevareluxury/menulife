import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

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
  const [items, setItems]   = useState<BrainItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await db
      .from('life_brain_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(200)
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

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
    // Optimistic
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: newDone } : i))
    await db.from('life_brain_items')
      .update({ is_completed: newDone, updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('user_id', user.id)

    if (newDone) {
      ;(async () => {
        const { count } = await db
          .from('life_brain_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('type', 'task').eq('is_completed', true)
        if (count === 10) void award(user.id, 'tasks_10', '10 tareas completadas')
        if (count === 50) void award(user.id, 'tasks_50', '50 tareas completadas')
      })()
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
    items, loading, reload: load,
    ideasCount, notesCount, tasksCount,
    createItem, updateItem, deleteItem, toggleComplete, archiveItem,
  }
}
