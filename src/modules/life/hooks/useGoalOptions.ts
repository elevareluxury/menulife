import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Goal } from './useGoals'

// life_goals todavía no está en database.types.ts
const db = supabase as unknown as SupabaseClient

export type GoalOption = Pick<Goal, 'id' | 'name' | 'color' | 'status' | 'target_date'>

/** Metas en versión liviana (para elegir meta en una tarea o marcar fechas en el calendario). */
export function useGoalOptions(enabled = true) {
  const { user } = useAuthStore()
  const [goals, setGoals] = useState<GoalOption[]>([])

  useEffect(() => {
    if (!user || !enabled) return
    let cancelled = false
    db.from('life_goals').select('id,name,color,status,target_date')
      .eq('user_id', user.id).order('sort_order', { ascending: true })
      .then(({ data }) => { if (!cancelled && data) setGoals(data as GoalOption[]) })
    return () => { cancelled = true }
  }, [user, enabled])

  return goals
}
