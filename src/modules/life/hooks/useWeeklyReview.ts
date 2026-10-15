import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { isDone, shiftDate } from '../lib/habitStreak'
import { summarizeWeek, weekEndOf, MAX_FOCUS, WEEKLY_TEXT_MAX, type WeekSummary } from '../lib/weeklyReview'
import { prioritiesOf } from './useDailyReview'
import { dayKey } from './useToday'

// Revisión semanal: una fila de life_weekly_reviews por persona y semana (week_start).
const db = supabase as unknown as SupabaseClient

/** Lo mismo que una prioridad de "Mi día"; las tareas guardan también su título (para la lista de semanas). */
export type FocusItem =
  | { id: string; kind: 'task'; task_id: string; text?: string }
  | { id: string; kind: 'text'; text: string; done?: boolean }

export interface WeeklyReview {
  week_start: string
  wins: string | null
  let_go: string | null
  next_focus: FocusItem[]
  closed_at: string | null
}

const COLUMNS = 'week_start,wins,let_go,next_focus,closed_at'

function fromRow(week: string, r: Record<string, unknown> | null): WeeklyReview {
  return {
    week_start: week,
    wins: typeof r?.wins === 'string' ? r.wins : null,
    let_go: typeof r?.let_go === 'string' ? r.let_go : null,
    next_focus: (prioritiesOf(r?.next_focus) as FocusItem[]).slice(0, MAX_FOCUS),
    closed_at: typeof r?.closed_at === 'string' ? r.closed_at : null,
  }
}

const clean = (s: string | null | undefined) => s?.trim().slice(0, WEEKLY_TEXT_MAX) || null

/** Sólo la fila de una semana (para saber si ya se hizo, sin cargar el resumen). */
export function useWeeklyReviewStatus(week: string | null) {
  const { user } = useAuthStore()
  const [state, setState] = useState<{ week: string; closed: boolean } | null>(null)
  useEffect(() => {
    if (!user || !week) return
    let cancelled = false
    db.from('life_weekly_reviews').select('closed_at').eq('user_id', user.id).eq('week_start', week).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error) setState({ week, closed: !!data?.closed_at }) })
    return () => { cancelled = true }
  }, [user, week])
  return state?.week === week ? state : null
}

/** La revisión de una semana y su resumen con datos reales (tareas hechas, hábitos cumplidos y ánimo). */
export function useWeeklyReview(week: string) {
  const { user } = useAuthStore()
  const [review, setReview] = useState<WeeklyReview>(() => fromRow(week, null))
  const [summary, setSummary] = useState<WeekSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const end = weekEndOf(week)
    const fromIso = new Date(`${week}T00:00:00`).toISOString()
    const toIso = new Date(`${shiftDate(end, 1)}T00:00:00`).toISOString()
    const q = (table: string, cols: string) => db.from(table).select(cols).eq('user_id', user.id)
    void Promise.all([
      q('life_weekly_reviews', COLUMNS).eq('week_start', week).maybeSingle(),
      q('life_brain_items', 'completed_at').eq('type', 'task').eq('is_completed', true).gte('completed_at', fromIso).lt('completed_at', toIso),
      q('life_habits', 'id,target_value'),
      q('life_habit_logs', 'habit_id,completed_date,value').gte('completed_date', week).lte('completed_date', end),
      q('life_daily_reviews', 'date,mood').gte('date', week).lte('date', end).not('mood', 'is', null),
    ]).then(([row, tasks, habits, logs, moods]) => {
      if (cancelled) return
      if (row.error || tasks.error || habits.error || logs.error) { setError(true); setLoading(false); return }
      const target = new Map(((habits.data ?? []) as unknown as { id: string; target_value: number | null }[]).map(h => [h.id, h.target_value]))
      setReview(fromRow(week, row.data as Record<string, unknown> | null))
      setSummary(summarizeWeek(week, {
        tasksCompletedOn: ((tasks.data ?? []) as unknown as { completed_at: string | null }[])
          .flatMap(x => (x.completed_at ? [dayKey(new Date(x.completed_at))] : [])),
        habitDoneOn: ((logs.data ?? []) as unknown as { habit_id: string; completed_date: string; value: number | null }[])
          .filter(l => isDone(Number(l.value ?? 1), target.get(l.habit_id))).map(l => l.completed_date),
        // El ánimo es opcional: si no se pudo leer, el resto del resumen sigue
        moods: moods.error ? [] : (moods.data ?? []) as unknown as { date: string; mood: number }[],
      }))
      setError(false)
      setLoading(false)
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [user, week])

  /** Guarda la revisión (upsert por persona y semana). Revierte si falla. */
  const save = useCallback(async (patch: Partial<Omit<WeeklyReview, 'week_start'>>) => {
    if (!user) return
    const prev = review
    const next = { ...review, ...patch, wins: clean(patch.wins ?? review.wins), let_go: clean(patch.let_go ?? review.let_go) }
    next.next_focus = next.next_focus.slice(0, MAX_FOCUS)
    setReview(next)
    const { error: err } = await db.from('life_weekly_reviews').upsert(
      { user_id: user.id, week_start: week, wins: next.wins, let_go: next.let_go, next_focus: next.next_focus, closed_at: next.closed_at, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' })
    if (err) { setReview(prev); throw err }
  }, [user, week, review])

  const finish = useCallback((data: { wins: string; let_go: string; next_focus: FocusItem[] }) =>
    save({ ...data, closed_at: new Date().toISOString() }), [save])

  return { review, summary, loading, error, save, finish }
}

/** Revisiones terminadas, de la más nueva a la más vieja (hasta 12). */
export function useWeeklyHistory() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => setAttempt(a => a + 1), [])
  useEffect(() => {
    if (!user) return
    let cancelled = false
    db.from('life_weekly_reviews').select(COLUMNS).eq('user_id', user.id).not('closed_at', 'is', null)
      .order('week_start', { ascending: false }).limit(12)
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setItems(((data ?? []) as Record<string, unknown>[]).map(r => fromRow(String(r.week_start), r)))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, attempt])
  return { items, loading, reload }
}
