import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { celebrate } from '../lib/celebrate'
import { trackEvent } from '@/lib/productEvents'

// "Mi día" (V1 · etapa 11): una fila de life_daily_reviews por persona y fecha local.
const db = supabase as unknown as SupabaseClient

export const MAX_PRIORITIES = 3

export type Priority =
  | { id: string; kind: 'task'; task_id: string }
  | { id: string; kind: 'text'; text: string; done?: boolean }

export interface DailyReview {
  date: string
  priorities: Priority[]
  reflection: string | null
  closed_at: string | null
}

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

function prioritiesOf(v: unknown): Priority[] {
  if (!Array.isArray(v)) return []
  return v.filter((p): p is Priority => !!p && typeof p.id === 'string'
    && ((p.kind === 'task' && typeof p.task_id === 'string') || (p.kind === 'text' && typeof p.text === 'string')))
    .slice(0, MAX_PRIORITIES)
}

/** "Mi día" de una fecha local: prioridades, reflexión y si ya se cerró. */
export function useDailyReview(date: string) {
  const { user } = useAuthStore()
  const [review, setReview] = useState<DailyReview>({ date, priorities: [], reflection: null, closed_at: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    db.from('life_daily_reviews').select('date,priorities,reflection,closed_at')
      .eq('user_id', user.id).eq('date', date).maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(true)
        else {
          setError(false)
          setReview(data
            ? { date, priorities: prioritiesOf(data.priorities), reflection: data.reflection ?? null, closed_at: data.closed_at ?? null }
            : { date, priorities: [], reflection: null, closed_at: null })
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, date])

  /** Guarda (upsert por persona y día). Revierte si falla. */
  const save = useCallback(async (patch: Partial<Omit<DailyReview, 'date'>>) => {
    if (!user) return
    const prev = review
    const next = { ...review, ...patch }
    setReview(next)
    const { error: err } = await db.from('life_daily_reviews').upsert(
      { user_id: user.id, date, priorities: next.priorities, reflection: next.reflection, closed_at: next.closed_at, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' })
    if (err) { setReview(prev); throw err }
  }, [user, date, review])

  const addTaskPriority = useCallback((taskId: string) => {
    if (review.priorities.length >= MAX_PRIORITIES || review.priorities.some(p => p.kind === 'task' && p.task_id === taskId)) return Promise.resolve()
    trackEvent('life_priorities_set', { count: review.priorities.length + 1 })
    return save({ priorities: [...review.priorities, { id: newId(), kind: 'task', task_id: taskId }] })
  }, [review, save])

  const addTextPriority = useCallback((text: string) => {
    const clean = text.trim().slice(0, 200)
    if (!clean || review.priorities.length >= MAX_PRIORITIES) return Promise.resolve()
    trackEvent('life_priorities_set', { count: review.priorities.length + 1 })
    return save({ priorities: [...review.priorities, { id: newId(), kind: 'text', text: clean, done: false }] })
  }, [review, save])

  const removePriority = useCallback((id: string) => save({ priorities: review.priorities.filter(p => p.id !== id) }), [review, save])

  const toggleTextPriority = useCallback((id: string) => {
    const target = review.priorities.find(p => p.id === id)
    if (target?.kind === 'text' && !target.done) celebrate()
    return save({ priorities: review.priorities.map(p => (p.id === id && p.kind === 'text' ? { ...p, done: !p.done } : p)) })
  }, [review, save])

  const closeDay = useCallback((reflection: string | null) => {
    trackEvent('life_day_closed')
    return save({ reflection: reflection?.trim().slice(0, 280) || null, closed_at: new Date().toISOString() })
  }, [save])

  return { review, loading, error, addTaskPriority, addTextPriority, removePriority, toggleTextPriority, closeDay }
}
