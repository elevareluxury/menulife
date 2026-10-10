import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { usePrefs } from '@/lib/prefs'
import { LIFE_DATA_UPDATED } from './useBrain'
import { frequencyOf, habitConsistency, isDone, shiftDate } from '../lib/habitStreak'
import { dayKey, useToday } from './useToday'

// Las tablas de Life OS todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

export interface LinkedHabit { id: string; name: string; color: string; icon: string; done: number; scheduled: number }
export interface LinkedMoney { currency: string; income: number; expense: number; count: number }
export interface LinkedNote { id: string; type: 'idea' | 'note'; title: string }

/** Todo lo vinculado a una meta: hábitos (constancia de 30 días), dinero por moneda y notas/ideas. */
export function useGoalLinks(goalId: string | null) {
  const { user } = useAuthStore()
  const today = useToday()
  const weekStart = usePrefs(st => st.week_start)
  const [data, setData] = useState<{ goalId: string; habits: LinkedHabit[]; money: LinkedMoney[]; notes: LinkedNote[] } | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion(v => v + 1)
    window.addEventListener(LIFE_DATA_UPDATED, bump)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, bump)
  }, [])

  useEffect(() => {
    if (!user || !goalId) return
    let cancelled = false
    void (async () => {
      const [h, tx, n] = await Promise.all([
        db.from('life_habits').select('id,name,color,icon,frequency,target_value,created_at').eq('user_id', user.id).eq('goal_id', goalId).eq('is_active', true),
        db.from('life_transactions').select('type,amount,currency').eq('user_id', user.id).eq('goal_id', goalId),
        db.from('life_brain_items').select('id,type,title').eq('user_id', user.id).eq('goal_id', goalId)
          .in('type', ['idea', 'note']).eq('is_archived', false).order('created_at', { ascending: false }).limit(20),
      ])
      type HabitRow = { id: string; name: string; color: string; icon: string; frequency: unknown; target_value: number | null; created_at: string }
      const habitRows = (h.data ?? []) as HabitRow[]
      let logs: { habit_id: string; completed_date: string; value: number | null }[] = []
      if (habitRows.length) {
        const res = await db.from('life_habit_logs').select('habit_id,completed_date,value').eq('user_id', user.id)
          .in('habit_id', habitRows.map(x => x.id)).gte('completed_date', shiftDate(today, -29))
        logs = (res.data ?? []) as typeof logs
      }
      if (cancelled) return
      // Constancia de 30 días con la misma regla que Hábitos: días programados o "X veces por semana", y con
      // cantidad sólo cuentan los días que llegaron a la meta
      const habits = habitRows.map(x => {
        const done = new Set(logs.filter(l => l.habit_id === x.id && isDone(Number(l.value ?? 1), x.target_value))
          .map(l => l.completed_date))
        const c = habitConsistency(done, frequencyOf(x.frequency), dayKey(new Date(x.created_at)), shiftDate(today, -29), today, weekStart)
        return { id: x.id, name: x.name, color: x.color, icon: x.icon, done: c.done, scheduled: c.expected }
      })
      // Dinero por moneda: nunca se suman monedas distintas
      const byCur = new Map<string, LinkedMoney>()
      for (const r of (tx.data ?? []) as { type: string; amount: string; currency: string }[]) {
        const row = byCur.get(r.currency) ?? { currency: r.currency, income: 0, expense: 0, count: 0 }
        if (r.type === 'income') row.income += Number(r.amount); else row.expense += Number(r.amount)
        row.count++
        byCur.set(r.currency, row)
      }
      setData({ goalId, habits, money: [...byCur.values()], notes: (n.data ?? []) as LinkedNote[] })
    })()
    return () => { cancelled = true }
  }, [user, goalId, today, weekStart, version])

  // Si cambió la meta, no mostrar los vínculos de la anterior mientras carga
  const current = data && data.goalId === goalId ? data : null
  return { habits: current?.habits ?? [], money: current?.money ?? [], notes: current?.notes ?? [], loaded: !!current }
}
