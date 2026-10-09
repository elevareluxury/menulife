import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLocaleStore } from '@/store/localeStore'
import { computeInsights, type Insight } from '../lib/insights'
import { shiftDate } from '../lib/habitStreak'
import { useToday } from './useToday'

// Las tablas de Life OS todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Lee los datos necesarios y calcula los insights en el dispositivo. */
export function useInsights() {
  const { user } = useAuthStore()
  const mainCurrency = useLocaleStore(s => s.currency)
  const today = useToday()
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
      q('life_habits', 'id,name,frequency,created_at').eq('is_active', true),
      q('life_habit_logs', 'habit_id,completed_date').gte('completed_date', shiftDate(today, -55)),
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
      type HabitRow = { id: string; name: string; frequency: { days?: number[] } | null; created_at: string }
      setInsights(computeInsights({
        today, mainCurrency,
        habits: ((habits.data ?? []) as unknown as HabitRow[]).map(h => ({
          id: h.id, name: h.name, created_at: h.created_at,
          days: h.frequency?.days?.length ? h.frequency.days : ALL_DAYS,
        })),
        habitLogs: (logs.data ?? []) as unknown as { habit_id: string; completed_date: string }[],
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
  }, [user, today, mainCurrency])

  return { insights, loading, error }
}
