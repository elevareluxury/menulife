import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { LIFE_DATA_UPDATED } from './useBrain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string
  goal_id: string
  title: string
  is_completed: boolean
  completed_at: string | null
  sort_order: number
}

export interface Goal {
  id: string
  name: string
  description: string | null
  target_date: string | null
  progress: number
  status: 'in_progress' | 'completed' | 'paused'
  color: string
  sort_order: number
  milestones: Milestone[]
}

export interface GoalFormData {
  name: string
  description?: string
  target_date?: string
  color: string
}

/** Con pasos, el progreso es pasos hechos sobre el total. Sin pasos, queda el manual. */
function progressFromSteps(steps: Pick<Milestone, 'is_completed'>[]): number | null {
  if (!steps.length) return null
  return Math.round((steps.filter(s => s.is_completed).length / steps.length) * 100)
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGoals() {
  const { user } = useAuthStore()
  const [rawGoals, setRawGoals] = useState<Omit<Goal, 'milestones'>[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const progressTimers = useRef(new Map<string, number>())

  const load = useCallback(async () => {
    if (!user) return
    const [goalsRes, msRes] = await Promise.all([
      db.from('life_goals').select('*').eq('user_id', user.id).order('sort_order'),
      db.from('life_goal_milestones').select('*').eq('user_id', user.id).order('sort_order'),
    ])
    if (!goalsRes.error) setRawGoals(goalsRes.data ?? [])
    if (!msRes.error) setMilestones(msRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // Recargar cuando el botón + crea una meta
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'goals') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const goals: Goal[] = useMemo(() =>
    rawGoals.map(g => ({ ...g, milestones: milestones.filter(m => m.goal_id === g.id) })),
  [rawGoals, milestones])

  const activeCount    = useMemo(() => goals.filter(g => g.status === 'in_progress').length, [goals])
  const completedCount = useMemo(() => goals.filter(g => g.status === 'completed').length, [goals])
  const avgProgress    = useMemo(() => {
    const active = goals.filter(g => g.status === 'in_progress')
    if (active.length === 0) return 0
    return Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length)
  }, [goals])

  const saveProgress = useCallback(async (goalId: string, progress: number) => {
    const { error } = await db.from('life_goals').update({ progress }).eq('id', goalId).eq('user_id', user?.id)
    if (error) throw error
  }, [user])

  /** Recalcula el progreso según los pasos (si tiene) y lo guarda. */
  const syncStepProgress = useCallback(async (goalId: string, steps: Milestone[]) => {
    const p = progressFromSteps(steps)
    if (p == null) return   // sin pasos: se conserva el progreso manual
    setRawGoals(prev => prev.map(g => (g.id === goalId ? { ...g, progress: p } : g)))
    await saveProgress(goalId, p)
  }, [saveProgress])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const createGoal = useCallback(async (data: GoalFormData) => {
    if (!user) return
    const { error } = await db.from('life_goals').insert({ ...data, user_id: user.id, sort_order: rawGoals.length })
    if (error) throw error
    await load()
    void award(user.id, 'first_goal', 'Primera meta definida')
    const { count } = await db.from('life_goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= 5) void award(user.id, 'goals_5', 'Cinco metas')
  }, [user, rawGoals.length, load])

  const updateGoal = useCallback(async (id: string, data: Partial<GoalFormData & { status: string; progress: number }>) => {
    if (!user) return
    const { error } = await db.from('life_goals').update(data).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
    if (data.status === 'completed') void award(user.id, 'first_goal_completed', 'Meta alcanzada')
  }, [user, load])

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await db.from('life_goals').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await load()
  }, [user, load])

  /** Progreso manual: se ve al instante y se guarda cuando el usuario suelta el control. */
  const updateProgress = useCallback(async (goalId: string, progress: number) => {
    if (!user) return
    const clamped = Math.max(0, Math.min(100, Math.round(progress)))
    setRawGoals(prev => prev.map(g => (g.id === goalId ? { ...g, progress: clamped } : g)))
    const timers = progressTimers.current
    window.clearTimeout(timers.get(goalId))
    await new Promise<void>((resolve, reject) => {
      timers.set(goalId, window.setTimeout(() => { saveProgress(goalId, clamped).then(resolve, reject) }, 450))
    })
  }, [user, saveProgress])

  const addMilestone = useCallback(async (goalId: string, title: string) => {
    if (!user) return
    const current = milestones.filter(m => m.goal_id === goalId)
    const { data, error } = await db.from('life_goal_milestones').insert({
      goal_id: goalId, user_id: user.id, title, sort_order: current.length,
    }).select('*').single()
    if (error) throw error
    const next = [...current, data as Milestone]
    setMilestones(prev => [...prev, data as Milestone])
    await syncStepProgress(goalId, next)
  }, [user, milestones, syncStepProgress])

  const toggleMilestone = useCallback(async (ms: Milestone) => {
    if (!user) return
    const done = !ms.is_completed
    const completed_at = done ? new Date().toISOString() : null
    setMilestones(prev => prev.map(m => (m.id === ms.id ? { ...m, is_completed: done, completed_at } : m)))
    const { error } = await db.from('life_goal_milestones').update({ is_completed: done, completed_at }).eq('id', ms.id)
    if (error) {
      setMilestones(prev => prev.map(m => (m.id === ms.id ? ms : m)))
      throw error
    }
    const steps = milestones.map(m => (m.id === ms.id ? { ...m, is_completed: done } : m)).filter(m => m.goal_id === ms.goal_id)
    await syncStepProgress(ms.goal_id, steps)
  }, [user, milestones, syncStepProgress])

  const deleteMilestone = useCallback(async (id: string, goalId: string) => {
    if (!user) return
    const { error } = await db.from('life_goal_milestones').delete().eq('id', id)
    if (error) throw error
    const remaining = milestones.filter(m => m.goal_id === goalId && m.id !== id)
    setMilestones(prev => prev.filter(m => m.id !== id))
    // Si era el último paso, el progreso queda como estaba (no vuelve a 0)
    await syncStepProgress(goalId, remaining)
  }, [user, milestones, syncStepProgress])

  return {
    goals, loading, reload: load,
    activeCount, completedCount, avgProgress,
    createGoal, updateGoal, deleteGoal, updateProgress,
    addMilestone, toggleMilestone, deleteMilestone,
  }
}
