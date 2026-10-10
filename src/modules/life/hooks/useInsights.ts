import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLocaleStore } from '@/store/localeStore'
import { computeInsights, type Insight } from '../lib/insights'
import { ALL_DAYS, frequencyOf, isDone, shiftDate } from '../lib/habitStreak'
import { usePrefs } from '@/lib/prefs'
import { useToday } from './useToday'

// Las tablas de Life OS todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

/** Lee los datos necesarios y calcula los insights en el dispositivo. */
export function useInsights() {
  const { user } = useAuthStore()
  const mainCurrency = useLocaleStore(s => s.currency)
  const today = useToday()
  const weekStart = usePrefs(st => st.week_start)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const [y, m] = today.split('-').map(Number)
    const prevMonthStart = new Date(y, m - 2, 1).toISOString()
    const twoWeeksAgo = new Date(`${shiftDate(today, -13)}T00:00:00`).toISOString()
    const q = (table: string, cols: string) => db.from(table).select(cols).eq('user_id', user.id)

    void Promise.all([
      q('life_habits', 'id,name,frequency,target_value,created_at').eq('is_active', true),
      q('life_habit_logs', 'habit_id,completed_date,value').gte('completed_date', shiftDate(today, -55)),
      q('life_transactions', 'amount,currency,category,occurred_at').eq('type', 'expense').gte('occurred_at', prevMonthStart),
      q('life_goals', 'id,name,created_at').eq('status', 'in_progress'),
      q('life_goal_milestones', 'goal_id,is_completed,completed_at'),
      q('life_brain_items', 'completed_at').eq('type', 'task').eq('is_completed', true).gte('completed_at', twoWeeksAgo),
      db.from('life_brain_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        .eq('type', 'task').eq('is_completed', false).eq('is_archived', false).lt('due_date', today),
    ]).then(([habits, logs, txs, goals, milestones, tasksDone, overdue]) => {
      if (cancelled) return
      const failed = [habits, logs, txs, goals, milestones, tasksDone, overdue].find(r => r.error)
      if (failed) { setError(true); setLoading(false); return }
      type HabitRow = { id: string; name: string; frequency: unknown; target_value: number | null; created_at: string }
      const habitRows = (habits.data ?? []) as unknown as HabitRow[]
      // Con cantidad, el día cuenta sólo si llegó a la meta
      const target = new Map(habitRows.map(h => [h.id, h.target_value]))
      setInsights(computeInsights({
        today, mainCurrency, weekStart,
        habits: habitRows.map(h => {
          const f = frequencyOf(h.frequency)
          return f.type === 'times_per_week'
            ? { id: h.id, name: h.name, created_at: h.created_at, days: ALL_DAYS, times: f.times }
            : { id: h.id, name: h.name, created_at: h.created_at, days: f.days }
        }),
        habitLogs: ((logs.data ?? []) as unknown as { habit_id: string; completed_date: string; value: number | null }[])
          .filter(l => isDone(Number(l.value ?? 1), target.get(l.habit_id))),
        expenses: ((txs.data ?? []) as unknown as { amount: string; currency: string; category: string; occurred_at: string }[])
          .map(x => ({ ...x, amount: Number(x.amount) })),
        goals: (goals.data ?? []) as unknown as { id: string; name: string; created_at: string }[],
        milestones: (milestones.data ?? []) as unknown as { goal_id: string; is_completed: boolean; completed_at: string | null }[],
        tasksDone: (tasksDone.data ?? []) as unknown as { completed_at: string }[],
        overdueTasks: overdue.count ?? 0,
      }))
      setError(false)
      setLoading(false)
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [user, today, mainCurrency, weekStart])

  return { insights, loading, error }
}
