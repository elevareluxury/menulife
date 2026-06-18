import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGoals() {
  const { user } = useAuthStore()
  const [rawGoals, setRawGoals] = useState<Omit<Goal, 'milestones'>[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [goalsRes, msRes] = await Promise.all([
      db.from('life_goals').select('*').eq('user_id', user.id).order('sort_order'),
      db.from('life_goal_milestones').select('*').eq('user_id', user.id).order('sort_order'),
    ])
    setRawGoals(goalsRes.data ?? [])
    setMilestones(msRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const goals: Goal[] = useMemo(() =>
    rawGoals.map(g => ({
      ...g,
      milestones: milestones.filter(m => m.goal_id === g.id),
    })),
    [rawGoals, milestones]
  )

  const activeCount    = useMemo(() => goals.filter(g => g.status === 'in_progress').length, [goals])
  const completedCount = useMemo(() => goals.filter(g => g.status === 'completed').length, [goals])
  const avgProgress    = useMemo(() => {
    const active = goals.filter(g => g.status === 'in_progress')
    if (active.length === 0) return 0
    return Math.round(active.reduce((s, g) => s + g.progress, 0) / active.length)
  }, [goals])

  // ── Actions ────────────────────────────────────────────────────────────────

  const createGoal = useCallback(async (data: GoalFormData) => {
    if (!user) return
    await db.from('life_goals').insert({ ...data, user_id: user.id, sort_order: rawGoals.length })
    await load()
    void award(user.id, 'first_goal', 'Primera meta definida')
    const { count } = await db.from('life_goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= 5) void award(user.id, 'goals_5', 'Cinco metas')
  }, [user, rawGoals.length, load])

  const updateGoal = useCallback(async (id: string, data: Partial<GoalFormData & { status: string; progress: number }>) => {
    if (!user) return
    await db.from('life_goals').update(data).eq('id', id).eq('user_id', user.id)
    await load()
    if (data.status === 'completed') void award(user.id, 'first_goal_completed', 'Meta alcanzada')
  }, [user, load])

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return
    await db.from('life_goals').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const updateProgress = useCallback(async (goalId: string, progress: number) => {
    if (!user) return
    const clamped = Math.max(0, Math.min(100, Math.round(progress)))
    // Optimistic
    setRawGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: clamped } : g))
    await db.from('life_goals').update({ progress: clamped }).eq('id', goalId).eq('user_id', user.id)
  }, [user])

  const addMilestone = useCallback(async (goalId: string, title: string) => {
    if (!user) return
    const count = milestones.filter(m => m.goal_id === goalId).length
    await db.from('life_goal_milestones').insert({
      goal_id: goalId, user_id: user.id, title, sort_order: count,
    })
    await load()
  }, [user, milestones, load])

  const toggleMilestone = useCallback(async (ms: Milestone) => {
    if (!user) return
    const now = !ms.is_completed
    // Optimistic
    setMilestones(prev => prev.map(m =>
      m.id === ms.id ? { ...m, is_completed: now, completed_at: now ? new Date().toISOString() : null } : m
    ))
    await db.from('life_goal_milestones').update({
      is_completed: now,
      completed_at: now ? new Date().toISOString() : null,
    }).eq('id', ms.id)
    // Recompute + save progress
    const goalMs = milestones.map(m => m.id === ms.id ? { ...m, is_completed: now } : m)
      .filter(m => m.goal_id === ms.goal_id)
    if (goalMs.length > 0) {
      const p = Math.round(goalMs.filter(m => m.is_completed).length / goalMs.length * 100)
      setRawGoals(prev => prev.map(g => g.id === ms.goal_id ? { ...g, progress: p } : g))
      await db.from('life_goals').update({ progress: p }).eq('id', ms.goal_id).eq('user_id', user.id)
    }
  }, [user, milestones])

  const deleteMilestone = useCallback(async (id: string, goalId: string) => {
    if (!user) return
    await db.from('life_goal_milestones').delete().eq('id', id)
    const remaining = milestones.filter(m => m.goal_id === goalId && m.id !== id)
    const p = remaining.length > 0
      ? Math.round(remaining.filter(m => m.is_completed).length / remaining.length * 100)
      : 0
    await db.from('life_goals').update({ progress: p }).eq('id', goalId).eq('user_id', user.id)
    await load()
  }, [user, milestones, load])

  return {
    goals, loading, reload: load,
    activeCount, completedCount, avgProgress,
    createGoal, updateGoal, deleteGoal, updateProgress,
    addMilestone, toggleMilestone, deleteMilestone,
  }
}
