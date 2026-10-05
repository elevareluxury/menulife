import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type ProgressAnswer = 'si' | 'no' | 'un_poco'

export interface GoalCheckin {
  id: string
  goal_id: string
  user_id: string
  week_start_date: string
  progress_answer: ProgressAnswer
  did_text: string | null
  obstacle_text: string | null
  next_text: string | null
  progress_percentage: number | null
  created_at: string
}

export interface CheckinInput {
  goal_id: string
  progress_answer: ProgressAnswer
  did_text?: string
  obstacle_text?: string
  next_text?: string
  progress_percentage?: number
}

/** Retorna el lunes de la semana de una fecha dada como YYYY-MM-DD. */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

/** Los recordatorios aparecen desde el viernes (5=vie, 6=sáb, 0=dom). */
export function isCheckinDay(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day === 5 || day === 6 || day === 0
}

interface UseGoalCheckinsOptions {
  goalId?: string
  limit?: number
  onlyCurrentWeek?: boolean
}

export function useGoalCheckins(options: UseGoalCheckinsOptions = {}) {
  const { goalId, limit = 8, onlyCurrentWeek = false } = options
  const { user } = useAuthStore()

  const [result, setResult] = useState<{ checkins: GoalCheckin[]; error: string | null; key: string } | null>(null)
  const [trigger, setTrigger] = useState(0)

  const fetchKey = `${user?.id ?? ''}|${goalId ?? ''}|${limit}|${String(onlyCurrentWeek)}|${trigger}`

  useEffect(() => {
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('life_goal_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start_date', { ascending: false })

    if (goalId) query = query.eq('goal_id', goalId)
    if (onlyCurrentWeek) query = query.eq('week_start_date', getWeekStartDate())
    query = query.limit(limit)

    const key = fetchKey
    let cancelled = false

    query.then(({ data, error: err }: { data: GoalCheckin[] | null; error: { message: string } | null }) => {
      if (cancelled) return
      setResult({
        checkins: (data ?? []) as GoalCheckin[],
        error: err ? err.message : null,
        key,
      })
    })

    return () => { cancelled = true }
  }, [user, goalId, limit, onlyCurrentWeek, trigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => setTrigger(n => n + 1), [])

  const createCheckin = useCallback(async (input: CheckinInput): Promise<GoalCheckin> => {
    if (!user) throw new Error('No user')

    const payload = {
      ...input,
      user_id: user.id,
      week_start_date: getWeekStartDate(),
    }

    const { data, error: err } = await db
      .from('life_goal_checkins')
      .insert(payload)
      .select()
      .single()

    if (err) {
      if (err.code === '23505') {
        throw new Error('Ya hiciste check-in esta semana. Podés editarlo desde el historial.')
      }
      throw err
    }

    setTrigger(n => n + 1)
    return data as GoalCheckin
  }, [user])

  // Derive during render
  const checkins = user ? (result?.checkins ?? []) : []
  const loading = !!user && (result === null || result.key !== fetchKey)
  const error = user ? (result?.error ?? null) : null

  return { checkins, loading, error, createCheckin, refetch }
}

/**
 * Retorna los IDs de goals activas que NO tienen check-in esta semana.
 * Usado para el banner de recordatorio en LifeGoalsPage.
 */
export function useGoalsNeedingCheckin(activeGoals: { id: string }[]) {
  const { user } = useAuthStore()
  const [pendingIds, setPendingIds] = useState<string[]>([])
  // Serialize to avoid re-running on every render
  const goalIds = activeGoals.map(g => g.id).join(',')

  useEffect(() => {
    if (!user || activeGoals.length === 0) return

    const weekStart = getWeekStartDate()
    db.from('life_goal_checkins')
      .select('goal_id')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: any) => {
        const doneIds = new Set((data ?? []).map((c: { goal_id: string }) => c.goal_id))
        setPendingIds(activeGoals.filter(g => !doneIds.has(g.id)).map(g => g.id))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, goalIds])

  // Derive during render: if no user or no active goals, always empty
  return (!user || activeGoals.length === 0) ? [] : pendingIds
}
