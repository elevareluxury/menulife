import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { celebrate } from '../lib/celebrate'
import { LIFE_DATA_UPDATED } from './useBrain'
import { isValidRecurrence, nextOccurrence, type Recurrence } from '../lib/recurrence'
import { trackEvent } from '@/lib/productEvents'

// Las tareas viven en Brain (life_brain_items con type = 'task').
// Las columnas de fecha/recordatorio todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

export interface LifeTask {
  id: string
  title: string
  notes: string | null
  due_date: string | null      // YYYY-MM-DD
  due_time: string | null      // HH:MM[:SS]
  remind_minutes: number | null
  reminded_at: string | null
  completed_at: string | null
  goal_id: string | null
  is_focus: boolean
  created_at: string
  /** Repetición (V1 · etapa 09); sólo con fecha */
  recurrence: Recurrence | null
  subtasks: Subtask[]
  /** La ocurrencia que se creó al completarla (para no duplicarla si se destilda y se vuelve a tildar) */
  next_occurrence_id: string | null
}

export interface Subtask { id: string; text: string; done: boolean }

export const MAX_SUBTASKS = 20
export const MAX_SUBTASK_TEXT = 200

export interface TaskFormData {
  title: string
  notes?: string | null
  due_date?: string | null
  due_time?: string | null
  remind_minutes?: number | null
  goal_id?: string | null
  is_focus?: boolean
  recurrence?: Recurrence | null
  subtasks?: Subtask[]
}

interface BrainTaskRow {
  id: string
  title: string
  content: string | null
  due_date: string | null
  due_time: string | null
  remind_minutes: number | null
  reminded_at: string | null
  completed_at: string | null
  is_completed: boolean
  goal_id: string | null
  is_focus: boolean | null
  created_at: string
  recurrence: unknown
  subtasks: unknown
  next_occurrence_id: string | null
}

const COLUMNS = 'id,title,content,due_date,due_time,remind_minutes,reminded_at,completed_at,is_completed,goal_id,is_focus,created_at,recurrence,subtasks,next_occurrence_id'

function subtasksOf(v: unknown): Subtask[] {
  return Array.isArray(v)
    ? v.filter((x): x is Subtask => !!x && typeof x.id === 'string' && typeof x.text === 'string').map(x => ({ id: x.id, text: x.text, done: !!x.done }))
    : []
}

function fromRow(r: BrainTaskRow): LifeTask {
  return {
    id: r.id, title: r.title, notes: r.content,
    due_date: r.due_date, due_time: r.due_time, remind_minutes: r.remind_minutes, reminded_at: r.reminded_at,
    completed_at: r.is_completed ? (r.completed_at ?? r.created_at) : null,
    goal_id: r.goal_id, is_focus: !!r.is_focus, created_at: r.created_at,
    recurrence: isValidRecurrence(r.recurrence) ? r.recurrence : null,
    subtasks: subtasksOf(r.subtasks),
    next_occurrence_id: r.next_occurrence_id ?? null,
  }
}

/** Fecha local YYYY-MM-DD (no UTC: "hoy" es el día del usuario). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Momento del vencimiento (si no hay hora, se usa las 09:00 para los recordatorios). */
export function taskDueAt(t: Pick<LifeTask, 'due_date' | 'due_time'>): Date | null {
  if (!t.due_date) return null
  const time = t.due_time ? t.due_time.slice(0, 5) : '09:00'
  const d = new Date(`${t.due_date}T${time}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function taskColumns(data: TaskFormData) {
  return {
    title: data.title.trim(),
    content: data.notes?.trim() || null,
    due_date: data.due_date || null,
    due_time: data.due_date && data.due_time ? data.due_time : null,
    remind_minutes: data.due_date && data.remind_minutes != null ? data.remind_minutes : null,
    goal_id: data.goal_id || null,
    is_focus: !!data.is_focus,
    // Sin fecha no hay "próxima": la base también lo exige
    recurrence: data.due_date && data.recurrence ? data.recurrence : null,
    subtasks: (data.subtasks ?? [])
      .map(st => ({ id: st.id, text: st.text.trim().slice(0, MAX_SUBTASK_TEXT), done: !!st.done }))
      .filter(st => st.text)
      .slice(0, MAX_SUBTASKS),
  }
}

/** La siguiente ocurrencia de una tarea que se repite: misma tarea, próxima fecha, subtareas sin hacer. */
export function nextTaskData(task: LifeTask, today: string): TaskFormData | null {
  if (!task.recurrence || !task.due_date) return null
  return {
    title: task.title, notes: task.notes, due_date: nextOccurrence(task.due_date, task.recurrence, today),
    due_time: task.due_time, remind_minutes: task.remind_minutes, goal_id: task.goal_id, is_focus: false,
    recurrence: task.recurrence, subtasks: task.subtasks.map(st => ({ ...st, done: false })),
  }
}

/** Crea una tarea en Brain (lo usa también el botón +). */
export async function insertTask(userId: string, data: TaskFormData): Promise<LifeTask> {
  const { data: row, error } = await db.from('life_brain_items')
    .insert({ ...taskColumns(data), type: 'task', user_id: userId, is_completed: false, is_archived: false })
    .select(COLUMNS).single()
  if (error) throw error
  return fromRow(row as BrainTaskRow)
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
    // Pendientes + las completadas en los últimos 30 días
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    db.from('life_brain_items').select(COLUMNS)
      .eq('user_id', user.id).eq('type', 'task').eq('is_archived', false)
      .or(`is_completed.eq.false,completed_at.gte.${since}`)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('due_time', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(1000)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError('load')
        else { setTasks(((data ?? []) as BrainTaskRow[]).map(fromRow)); setError(null) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, attempt])

  // El botón + y la captura rápida de Brain avisan cuando crean algo
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'brain') reload()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [reload])

  const createTask = useCallback(async (data: TaskFormData) => {
    if (!user) return
    const task = await insertTask(user.id, data)
    setTasks(prev => [...prev, task])
  }, [user])

  const updateTask = useCallback(async (id: string, data: TaskFormData) => {
    // Si cambia la fecha/hora/aviso, el recordatorio vuelve a quedar pendiente
    const { data: row, error: err } = await db.from('life_brain_items')
      .update({ ...taskColumns(data), reminded_at: null, updated_at: new Date().toISOString() })
      .eq('id', id).select(COLUMNS).single()
    if (err) throw err
    setTasks(prev => prev.map(t => (t.id === id ? fromRow(row as BrainTaskRow) : t)))
  }, [])

  /**
   * Tarea que se repite (V1 · etapa 09): al completarla se crea la siguiente (con la fecha local de hoy como piso) y
   * se anota en next_occurrence_id; al destildarla, la siguiente se borra si todavía no se hizo.
   */
  const rollRecurrence = useCallback(async (task: LifeTask, done: boolean) => {
    if (!user) return
    if (done) {
      const next = task.next_occurrence_id ? null : nextTaskData(task, localDateKey())
      if (!next) return
      const created = await insertTask(user.id, next)
      setTasks(prev => [...prev.map(t => (t.id === task.id ? { ...t, next_occurrence_id: created.id } : t)), created])
      await db.from('life_brain_items').update({ next_occurrence_id: created.id }).eq('id', task.id)
    } else if (task.next_occurrence_id) {
      const nextId = task.next_occurrence_id
      const { data: removed } = await db.from('life_brain_items').delete()
        .eq('id', nextId).eq('is_completed', false).select('id')
      if ((removed ?? []).length) setTasks(prev => prev.filter(t => t.id !== nextId))
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, next_occurrence_id: null } : t)))
      await db.from('life_brain_items').update({ next_occurrence_id: null }).eq('id', task.id)
    }
  }, [user])

  const toggleTask = useCallback(async (task: LifeTask) => {
    const done = !task.completed_at
    const completed_at = done ? new Date().toISOString() : null
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed_at, is_focus: done ? false : t.is_focus } : t)))
    const { error: err } = await db.from('life_brain_items')
      .update({ is_completed: done, completed_at, ...(done ? { is_focus: false } : {}), updated_at: new Date().toISOString() })
      .eq('id', task.id)
    if (err) {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)))
      throw err
    }
    if (done) { celebrate(); trackEvent('task_completed') }
    if (user) await rollRecurrence(task, done)
    if (done && user) {
      void (async () => {
        const { count } = await db.from('life_brain_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('type', 'task').eq('is_completed', true)
        if (count === 10) void award(user.id, 'tasks_10', '10 tareas completadas')
        if (count === 50) void award(user.id, 'tasks_50', '50 tareas completadas')
      })()
    }
  }, [user, rollRecurrence])

  const setFocus = useCallback(async (task: LifeTask, value: boolean) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, is_focus: value } : t)))
    const { error: err } = await db.from('life_brain_items').update({ is_focus: value }).eq('id', task.id)
    if (err) {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)))
      throw err
    }
  }, [])

  /** Oculta la tarea en pantalla (para borrar con "Deshacer"). */
  const hideLocally = useCallback((id: string) => setTasks(prev => prev.filter(t => t.id !== id)), [])

  const deleteTask = useCallback(async (id: string) => {
    const { error: err } = await db.from('life_brain_items').delete().eq('id', id)
    if (err) throw err
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  return { tasks, loading, error, reload, createTask, updateTask, toggleTask, setFocus, deleteTask, hideLocally }
}
