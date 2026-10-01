import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// life_tasks todavía no está en database.types.ts
const db = supabase as unknown as SupabaseClient

export interface LifeTask {
  id: string
  user_id: string
  goal_id: string | null
  title: string
  notes: string | null
  due_date: string | null      // YYYY-MM-DD
  due_time: string | null      // HH:MM[:SS]
  remind_minutes: number | null
  reminded_at: string | null
  completed_at: string | null
  created_at: string
}

export interface TaskFormData {
  title: string
  notes?: string | null
  due_date?: string | null
  due_time?: string | null
  remind_minutes?: number | null
  goal_id?: string | null
}

/** Fecha local YYYY-MM-DD (no UTC: "hoy" es el día del usuario). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Momento del vencimiento (si no hay hora, fin del día a las 09:00 para recordatorios). */
export function taskDueAt(t: Pick<LifeTask, 'due_date' | 'due_time'>): Date | null {
  if (!t.due_date) return null
  const time = t.due_time ? t.due_time.slice(0, 5) : '09:00'
  const d = new Date(`${t.due_date}T${time}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function useTasks() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<LifeTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => setAttempt(a => a + 1), [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    db.from('life_tasks').select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('due_time', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError('No pudimos cargar tus tareas.')
        else { setTasks((data ?? []) as LifeTask[]); setError(null) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, attempt])

  const normalize = (data: TaskFormData) => ({
    title: data.title.trim(),
    notes: data.notes?.trim() || null,
    due_date: data.due_date || null,
    due_time: data.due_date && data.due_time ? data.due_time : null,
    remind_minutes: data.due_date && data.remind_minutes != null ? data.remind_minutes : null,
    goal_id: data.goal_id || null,
  })

  const createTask = useCallback(async (data: TaskFormData) => {
    if (!user) return
    const { data: row, error: err } = await db.from('life_tasks')
      .insert({ ...normalize(data), user_id: user.id }).select('*').single()
    if (err) throw err
    setTasks(prev => [...prev, row as LifeTask])
  }, [user])

  const updateTask = useCallback(async (id: string, data: TaskFormData) => {
    // Si cambia la fecha/hora/aviso, el recordatorio vuelve a quedar pendiente
    const { data: row, error: err } = await db.from('life_tasks')
      .update({ ...normalize(data), reminded_at: null }).eq('id', id).select('*').single()
    if (err) throw err
    setTasks(prev => prev.map(t => (t.id === id ? row as LifeTask : t)))
  }, [])

  const toggleTask = useCallback(async (task: LifeTask) => {
    const completed_at = task.completed_at ? null : new Date().toISOString()
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed_at } : t)))
    const { error: err } = await db.from('life_tasks').update({ completed_at }).eq('id', task.id)
    if (err) {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)))
      throw err
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const { error: err } = await db.from('life_tasks').delete().eq('id', id)
    if (err) throw err
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  return { tasks, loading, error, reload, createTask, updateTask, toggleTask, deleteTask }
}
