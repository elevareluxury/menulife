import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'

// life_goals todavía no está en database.types.ts
const db = supabase as unknown as SupabaseClient

export interface ActiveGoal {
  id: string
  name: string
  progress: number
  color: string
  target_date: string | null
}

/** Metas en curso para el inicio ("Tu día"). Tareas, hábitos y dinero usan sus propios hooks. */
export function useActiveGoals(limit = 3) {
  const { user } = useAuthStore()
  const [goals, setGoals] = useState<ActiveGoal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion(v => v + 1), [])

  // Volver a leer cuando el botón + crea una meta
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'goals') reload()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [reload])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    db.from('life_goals').select('id,name,progress,color,target_date', { count: 'exact' })
      .eq('user_id', user.id).eq('status', 'in_progress')
      .order('sort_order', { ascending: true }).limit(limit)
      .then(({ data, count, error: err }) => {
        if (cancelled) return
        if (err) setError(true)
        else { setError(false); setGoals((data ?? []) as ActiveGoal[]); setTotal(count ?? data?.length ?? 0) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, limit, version])

  return { goals, total, loading, error, reload }
}
