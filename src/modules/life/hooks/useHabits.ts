import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { useToday } from './useToday'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Fechas locales ───────────────────────────────────────────────────────────

export function shiftDate(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/**
 * Racha según los días programados: los días que no tocan no la cortan.
 * Hoy, si todavía no se hizo, tampoco la corta (el día no terminó).
 */
export function calculateStreak(logSet: Set<string>, scheduled: number[], today: string): number {
  const days = scheduled.length ? scheduled : [0, 1, 2, 3, 4, 5, 6]
  let streak = 0
  let cur = today
  for (let i = 0; i < 400; i++) {
    const isScheduled = days.includes(weekdayOf(cur))
    if (logSet.has(cur)) streak++
    else if (isScheduled && cur !== today) break
    cur = shiftDate(cur, -1)
  }
  return streak
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface HabitFrequency {
  type: 'daily' | 'weekly'
  days: number[]  // 0=domingo … 6=sábado
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  is_active: boolean
  sort_order: number
  goal_id?: string | null
  // calculados
  completedToday: boolean
  streak: number
  week: { date: string; done: boolean; scheduled: boolean }[]   // últimos 7 días, del más viejo al de hoy
  scheduledToday: boolean
}

export interface HabitFormData {
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  goal_id?: string | null
}

type RawHabit = Omit<Habit, 'completedToday' | 'streak' | 'week' | 'scheduledToday'>

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits() {
  const { user } = useAuthStore()
  const today = useToday()
  const [rawHabits, setRawHabits] = useState<RawHabit[]>([])
  const [logMap, setLogMap] = useState<Map<string, Set<string>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const since = shiftDate(today, -400)  // historial suficiente para rachas largas
    const [habitsRes, logsRes] = await Promise.all([
      db.from('life_habits').select('*').eq('user_id', user.id).order('sort_order'),
      db.from('life_habit_logs').select('habit_id,completed_date').eq('user_id', user.id).gte('completed_date', since),
    ])
    if (habitsRes.error || logsRes.error) { setError(true); setLoading(false); return }
    setError(false)
    setRawHabits(habitsRes.data ?? [])
    const map = new Map<string, Set<string>>()
    for (const log of (logsRes.data ?? [])) {
      if (!map.has(log.habit_id)) map.set(log.habit_id, new Set())
      map.get(log.habit_id)!.add(log.completed_date)
    }
    setLogMap(map)
    setLoading(false)
  }, [user, today])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  const habits: Habit[] = useMemo(() => rawHabits.map(h => {
    const logs = logMap.get(h.id) ?? new Set<string>()
    const freq = (h.frequency ?? { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] }) as HabitFrequency
    const days = freq.days?.length ? freq.days : [0, 1, 2, 3, 4, 5, 6]
    return {
      ...h,
      frequency: { ...freq, days },
      completedToday: logs.has(today),
      streak: calculateStreak(logs, days, today),
      week: Array.from({ length: 7 }, (_, i) => {
        const date = shiftDate(today, i - 6)
        return { date, done: logs.has(date), scheduled: days.includes(weekdayOf(date)) }
      }),
      scheduledToday: days.includes(weekdayOf(today)),
    }
  }), [rawHabits, logMap, today])

  const activeHabits   = useMemo(() => habits.filter(h => h.is_active), [habits])
  const inactiveHabits = useMemo(() => habits.filter(h => !h.is_active), [habits])
  const todayHabits    = useMemo(() => activeHabits.filter(h => h.scheduledToday), [activeHabits])
  const completedToday = useMemo(() => todayHabits.filter(h => h.completedToday).length, [todayHabits])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const setLocal = (habitId: string, date: string, done: boolean) => setLogMap(prev => {
    const next = new Map(prev)
    const s = new Set(next.get(habitId) ?? [])
    if (done) s.add(date); else s.delete(date)
    next.set(habitId, s)
    return next
  })

  /** Marca o desmarca un día (hoy o hasta 7 días atrás). Revierte si falla. */
  const toggleDay = useCallback(async (habitId: string, date: string, done: boolean) => {
    if (!user) return
    if (date > today || date < shiftDate(today, -7)) return
    setLocal(habitId, date, done)
    const { error: err } = done
      ? await db.from('life_habit_logs').upsert(
          { habit_id: habitId, user_id: user.id, completed_date: date },
          { onConflict: 'habit_id,completed_date', ignoreDuplicates: true })
      : await db.from('life_habit_logs').delete()
          .eq('habit_id', habitId).eq('user_id', user.id).eq('completed_date', date)
    if (err) { setLocal(habitId, date, !done); throw err }
    if (done) {
      void (async () => {
        const { count: totalLogs } = await db.from('life_habit_logs')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if (totalLogs === 1) void award(user.id, 'first_habit_completed', 'Primer hábito completado')
        const habit = habits.find(h => h.id === habitId)
        const logs = new Set(logMap.get(habitId) ?? [])
        logs.add(date)
        const streak = calculateStreak(logs, habit?.frequency.days ?? [], today)
        if (streak >= 7)  void award(user.id, 'habit_streak_7',  'Racha de 7 días')
        if (streak >= 30) void award(user.id, 'habit_streak_30', 'Racha de 30 días')
      })()
    }
  }, [user, today, habits, logMap])

  const toggleToday = useCallback((habitId: string, markDone: boolean) => toggleDay(habitId, today, markDone), [toggleDay, today])

  const createHabit = useCallback(async (data: HabitFormData) => {
    if (!user) return
    const { error: err } = await db.from('life_habits').insert({ ...data, user_id: user.id, sort_order: rawHabits.length })
    if (err) throw err
    await load()
  }, [user, rawHabits.length, load])

  const updateHabit = useCallback(async (id: string, data: Partial<HabitFormData>) => {
    if (!user) return
    const { error: err } = await db.from('life_habits').update(data).eq('id', id).eq('user_id', user.id)
    if (err) throw err
    await load()
  }, [user, load])

  const deleteHabit = useCallback(async (id: string) => {
    if (!user) return
    const { error: err } = await db.from('life_habits').delete().eq('id', id).eq('user_id', user.id)
    if (err) throw err
    await load()
  }, [user, load])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    if (!user) return
    setRawHabits(prev => prev.map(h => (h.id === id ? { ...h, is_active: isActive } : h)))
    const { error: err } = await db.from('life_habits').update({ is_active: isActive }).eq('id', id).eq('user_id', user.id)
    if (err) { setRawHabits(prev => prev.map(h => (h.id === id ? { ...h, is_active: !isActive } : h))); throw err }
  }, [user])

  return {
    habits, activeHabits, inactiveHabits, todayHabits, today,
    completedToday, totalToday: todayHabits.length,
    loading, error, reload: load,
    toggleToday, toggleDay, createHabit, updateHabit, deleteHabit, toggleActive,
  }
}
