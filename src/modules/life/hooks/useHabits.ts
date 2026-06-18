import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Local date helpers (safe across timezones) ──────────────────────────────

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLast7(): string[] {
  const today = todayStr()
  return Array.from({ length: 7 }, (_, i) => shiftDate(today, -(6 - i)))
}

function calculateStreak(logSet: Set<string>): number {
  const t = todayStr()
  const start = logSet.has(t) ? t : shiftDate(t, -1)
  if (!logSet.has(start)) return 0
  let streak = 1
  let cur = start
  for (let i = 0; i < 365; i++) {
    const prev = shiftDate(cur, -1)
    if (!logSet.has(prev)) break
    streak++
    cur = prev
  }
  return streak
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HabitFrequency {
  type: 'daily' | 'weekly'
  days: number[]  // 0=Sunday … 6=Saturday
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  is_active: boolean
  sort_order: number
  // computed
  completedToday: boolean
  streak: number
  weekDone: boolean[]        // last 7 days oldest→newest
  scheduledToday: boolean
}

export interface HabitFormData {
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits() {
  const { user } = useAuthStore()
  const [rawHabits, setRawHabits] = useState<Omit<Habit, 'completedToday' | 'streak' | 'weekDone' | 'scheduledToday'>[]>([])
  const [logMap, setLogMap] = useState<Map<string, Set<string>>>(new Map())
  const [loading, setLoading] = useState(true)

  const last7 = useMemo(() => getLast7(), [])
  const today = useMemo(() => todayStr(), [])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const since = shiftDate(today, -90)  // 90 days of logs for streak
    const [habitsRes, logsRes] = await Promise.all([
      db.from('life_habits').select('*').eq('user_id', user.id).order('sort_order'),
      db.from('life_habit_logs')
        .select('habit_id,completed_date')
        .eq('user_id', user.id)
        .gte('completed_date', since),
    ])
    setRawHabits(habitsRes.data ?? [])
    const map = new Map<string, Set<string>>()
    for (const log of (logsRes.data ?? [])) {
      if (!map.has(log.habit_id)) map.set(log.habit_id, new Set())
      map.get(log.habit_id)!.add(log.completed_date)
    }
    setLogMap(map)
    setLoading(false)
  }, [user, today])

  useEffect(() => { load() }, [load])

  // Computed habits with derived fields
  const habits: Habit[] = useMemo(() => rawHabits.map(h => {
    const logs = logMap.get(h.id) ?? new Set<string>()
    const freq = (h.frequency ?? { type: 'daily', days: [0,1,2,3,4,5,6] }) as HabitFrequency
    return {
      ...h,
      frequency: freq,
      completedToday: logs.has(today),
      streak: calculateStreak(logs),
      weekDone: last7.map(d => logs.has(d)),
      scheduledToday: freq.days.includes(new Date().getDay()),
    }
  }), [rawHabits, logMap, today, last7])

  const activeHabits = useMemo(() => habits.filter(h => h.is_active), [habits])
  const todayHabits  = useMemo(() => activeHabits.filter(h => h.scheduledToday), [activeHabits])
  const completedToday = useMemo(() => todayHabits.filter(h => h.completedToday).length, [todayHabits])

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleToday = useCallback(async (habitId: string, markDone: boolean) => {
    if (!user) return
    // Optimistic
    setLogMap(prev => {
      const next = new Map(prev)
      const s = new Set(next.get(habitId) ?? [])
      if (markDone) s.add(today); else s.delete(today)
      next.set(habitId, s)
      return next
    })
    try {
      if (markDone) {
        await db.from('life_habit_logs').insert({ habit_id: habitId, user_id: user.id, completed_date: today })
        // Milestone checks (fire-and-forget)
        ;(async () => {
          const { count: totalLogs } = await db.from('life_habit_logs')
            .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
          if (totalLogs === 1) void award(user.id, 'first_habit_completed', 'Primer hábito completado')
          // Streak check for this habit
          const { data: recentLogs } = await db.from('life_habit_logs')
            .select('completed_date').eq('habit_id', habitId).eq('user_id', user.id)
            .order('completed_date', { ascending: false }).limit(35)
          const logSet = new Set<string>((recentLogs ?? []).map((l: { completed_date: string }) => l.completed_date as string))
          const streak = calculateStreak(logSet)
          if (streak >= 7)  void award(user.id, 'habit_streak_7',  'Racha de 7 días')
          if (streak >= 30) void award(user.id, 'habit_streak_30', 'Racha de 30 días')
        })()
      } else {
        await db.from('life_habit_logs').delete()
          .eq('habit_id', habitId).eq('user_id', user.id).eq('completed_date', today)
      }
    } catch {
      // Revert
      setLogMap(prev => {
        const next = new Map(prev)
        const s = new Set(next.get(habitId) ?? [])
        if (markDone) s.delete(today); else s.add(today)
        next.set(habitId, s)
        return next
      })
    }
  }, [user, today])

  const createHabit = useCallback(async (data: HabitFormData) => {
    if (!user) return
    const sort_order = rawHabits.length
    await db.from('life_habits').insert({ ...data, user_id: user.id, sort_order })
    await load()
  }, [user, rawHabits.length, load])

  const updateHabit = useCallback(async (id: string, data: Partial<HabitFormData>) => {
    if (!user) return
    await db.from('life_habits').update(data).eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const deleteHabit = useCallback(async (id: string) => {
    if (!user) return
    await db.from('life_habits').delete().eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    if (!user) return
    await db.from('life_habits').update({ is_active: isActive }).eq('id', id).eq('user_id', user.id)
    await load()
  }, [user, load])

  return {
    habits, activeHabits, todayHabits,
    completedToday, totalToday: todayHabits.length,
    loading, reload: load,
    toggleToday, createHabit, updateHabit, deleteHabit, toggleActive,
  }
}
