import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { computeLifeScore } from '../lib/lifeScoreEngine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface ActiveGoal {
  id: string
  name: string
  progress: number
  color: string
}

export interface TodayHabit {
  id: string
  name: string
  color: string
  icon: string
  completedToday: boolean
}

export interface Achievement {
  id: string
  type: string
  title: string
  achieved_at: string
}

export interface ActivityItem {
  id: string
  kind: 'goal' | 'habit' | 'money' | 'brain' | 'achievement'
  title: string
  subtitle: string
  color: string
}

export interface LifeData {
  loading: boolean
  score: number | null
  isNewUser: boolean
  habitsCompletedToday: number
  habitsTotalToday: number
  activeGoalsCount: number
  monthIncome: number
  monthExpense: number
  pendingTasksCount: number
  activeGoals: ActiveGoal[]
  todayHabits: TodayHabit[]
  achievements: Achievement[]
  recentActivity: ActivityItem[]
}

const INITIAL: LifeData = {
  loading: true,
  score: null,
  isNewUser: false,
  habitsCompletedToday: 0,
  habitsTotalToday: 0,
  activeGoalsCount: 0,
  monthIncome: 0,
  monthExpense: 0,
  pendingTasksCount: 0,
  activeGoals: [],
  todayHabits: [],
  achievements: [],
  recentActivity: [],
}

export function useLifeData(): LifeData {
  const { user } = useAuthStore()
  const [data, setData] = useState<LifeData>(INITIAL)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    async function fetchAll() {
      const [
        scoreRes,
        goalsRes,
        habitsRes,
        logsRes,
        txRes,
        tasksRes,
        achievementsRes,
      ] = await Promise.all([
        db.from('life_score').select('score').eq('user_id', user!.id).maybeSingle(),
        db.from('life_goals').select('id,name,progress,color').eq('user_id', user!.id).eq('status', 'in_progress').order('sort_order').limit(5),
        db.from('life_habits').select('id,name,color,icon').eq('user_id', user!.id).eq('is_active', true).order('sort_order').limit(8),
        db.from('life_habit_logs').select('habit_id').eq('user_id', user!.id).eq('completed_date', today),
        db.from('life_transactions').select('type,amount').eq('user_id', user!.id).gte('occurred_at', monthStart),
        db.from('life_brain_items').select('id').eq('user_id', user!.id).eq('type', 'task').eq('is_completed', false).eq('is_archived', false),
        db.from('life_achievements').select('id,type,title,achieved_at').eq('user_id', user!.id).order('achieved_at', { ascending: false }).limit(5),
      ])

      if (cancelled) return

      const storedScore: number | null = scoreRes.data?.score ?? null
      const goals: ActiveGoal[] = goalsRes.data ?? []
      const habits: Array<{ id: string; name: string; color: string; icon: string }> = habitsRes.data ?? []
      const logs: Array<{ habit_id: string }> = logsRes.data ?? []
      const txs: Array<{ type: string; amount: string }> = txRes.data ?? []
      const tasks: Array<{ id: string }> = tasksRes.data ?? []
      const achievements: Achievement[] = achievementsRes.data ?? []

      const completedIds = new Set(logs.map(l => l.habit_id))
      const todayHabits: TodayHabit[] = habits.map(h => ({
        id: h.id, name: h.name, color: h.color, icon: h.icon,
        completedToday: completedIds.has(h.id),
      }))

      const monthIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const monthExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

      const isNewUser = !storedScore && goals.length === 0 && habits.length === 0 &&
        txs.length === 0 && tasks.length === 0 && achievements.length === 0

      // Compute + upsert score if missing and user has data
      let finalScore = storedScore
      if (!isNewUser && !storedScore) {
        const avgGoalProgress = goals.length > 0
          ? goals.reduce((s, g) => s + g.progress, 0) / goals.length
          : 0
        const { score: computed, variables } = computeLifeScore({
          habitsCompletedToday: completedIds.size,
          habitsTotalToday: habits.length,
          activeGoalsCount: goals.length,
          avgGoalProgress,
          hasMoneyData: txs.length > 0,
          hasAchievements: achievements.length > 0,
        })
        finalScore = computed
        // Fire-and-forget upsert
        db.from('life_score').upsert(
          { user_id: user!.id, score: computed, variables, computed_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      }

      // Build recent activity from available data
      const recentActivity: ActivityItem[] = [
        ...goals.slice(0, 2).map(g => ({
          id: g.id, kind: 'goal' as const,
          title: g.name, subtitle: `${g.progress}% completado`, color: g.color,
        })),
        ...achievements.slice(0, 2).map(a => ({
          id: a.id, kind: 'achievement' as const,
          title: a.title, subtitle: 'Logro desbloqueado', color: '#F59E0B',
        })),
      ].slice(0, 4)

      setData({
        loading: false,
        score: finalScore,
        isNewUser,
        habitsCompletedToday: completedIds.size,
        habitsTotalToday: habits.length,
        activeGoalsCount: goals.length,
        monthIncome,
        monthExpense,
        pendingTasksCount: tasks.length,
        activeGoals: goals,
        todayHabits,
        achievements,
        recentActivity,
      })
    }

    fetchAll()
    return () => { cancelled = true }
  }, [user])

  return data
}
