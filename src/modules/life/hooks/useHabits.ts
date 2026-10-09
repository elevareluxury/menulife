import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { celebrate } from '../lib/celebrate'
import { LIFE_DATA_UPDATED } from './useBrain'
import { useToday } from './useToday'
import { usePrefs } from '@/lib/prefs'
import {
  calculateStreak, doneInWeek, frequencyOf, isDone, isScheduledOn, shiftDate, type HabitFrequency,
} from '../lib/habitStreak'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Fechas locales y rachas (V1 · etapa 10: lib/habitStreak.ts, funciones puras) ─────────────────────

export { shiftDate }

// ── Tipos ────────────────────────────────────────────────────────────────────

export type { HabitFrequency }

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  is_active: boolean
  sort_order: number
  goal_id?: string | null
  /** Hábito con cantidad (null = sí/no) */
  target_value: number | null
  unit: string | null
  /** "Después de…" */
  anchor: string | null
  reminder_time: string | null
  reminder_enabled: boolean
  // calculados
  completedToday: boolean
  /** Lo hecho hoy (con cantidad) */
  todayValue: number
  /** Racha que perdona: días, o semanas si es "X veces por semana" */
  streak: number
  streakUnit: 'days' | 'weeks'
  /** "X veces por semana": días cumplidos en esta semana */
  weekCount: number
  week: { date: string; done: boolean; scheduled: boolean; value: number }[]   // últimos 7 días, del más viejo al de hoy
  scheduledToday: boolean
}

export interface HabitFormData {
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  goal_id?: string | null
  target_value?: number | null
  unit?: string | null
  anchor?: string | null
  reminder_time?: string | null
  reminder_enabled?: boolean
}

type RawHabit = Omit<Habit, 'completedToday' | 'todayValue' | 'streak' | 'streakUnit' | 'weekCount' | 'week' | 'scheduledToday'>

/** Días cumplidos: con cantidad, los que llegaron a la meta; sin cantidad, los que tienen registro. */
function doneSet(values: Map<string, number>, target: number | null): Set<string> {
  const out = new Set<string>()
  values.forEach((v, d) => { if (isDone(v, target)) out.add(d) })
  return out
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits() {
  const { user } = useAuthStore()
  const today = useToday()
  const [rawHabits, setRawHabits] = useState<RawHabit[]>([])
  const weekStart = usePrefs(st => st.week_start)
  // habit_id → (fecha → valor del día)
  const [logMap, setLogMap] = useState<Map<string, Map<string, number>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const since = shiftDate(today, -400)  // historial suficiente para rachas largas
    const [habitsRes, logsRes] = await Promise.all([
      db.from('life_habits').select('*').eq('user_id', user.id).order('sort_order'),
      db.from('life_habit_logs').select('habit_id,completed_date,value').eq('user_id', user.id).gte('completed_date', since),
    ])
    if (habitsRes.error || logsRes.error) { setError(true); setLoading(false); return }
    setError(false)
    setRawHabits(((habitsRes.data ?? []) as RawHabit[]).map(h => ({
      ...h, frequency: frequencyOf(h.frequency),
      target_value: h.target_value != null ? Number(h.target_value) : null,
      reminder_enabled: !!h.reminder_enabled,
    })))
    const map = new Map<string, Map<string, number>>()
    for (const log of (logsRes.data ?? [])) {
      if (!map.has(log.habit_id)) map.set(log.habit_id, new Map())
      map.get(log.habit_id)!.set(log.completed_date, Number(log.value ?? 1))
    }
    setLogMap(map)
    setLoading(false)
  }, [user, today])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => { if (alive) void load() }, 0)
    return () => { alive = false; window.clearTimeout(id) }
  }, [load])

  // Recargar cuando otra parte de la pantalla cambia un hábito (por ejemplo, la bienvenida de "Mi día")
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ module: string }>).detail?.module === 'habits') void load()
    }
    window.addEventListener(LIFE_DATA_UPDATED, handler)
    return () => window.removeEventListener(LIFE_DATA_UPDATED, handler)
  }, [load])

  const habits: Habit[] = useMemo(() => rawHabits.map(h => {
    const values = logMap.get(h.id) ?? new Map<string, number>()
    const done = doneSet(values, h.target_value)
    const freq = h.frequency
    return {
      ...h,
      todayValue: values.get(today) ?? 0,
      completedToday: done.has(today),
      streak: calculateStreak(done, freq, today, weekStart),
      streakUnit: freq.type === 'times_per_week' ? 'weeks' : 'days',
      weekCount: doneInWeek(done, today, weekStart),
      week: Array.from({ length: 7 }, (_, i) => {
        const date = shiftDate(today, i - 6)
        return { date, done: done.has(date), scheduled: isScheduledOn(freq, date), value: values.get(date) ?? 0 }
      }),
      scheduledToday: isScheduledOn(freq, today),
    }
  }), [rawHabits, logMap, today, weekStart])

  const activeHabits   = useMemo(() => habits.filter(h => h.is_active), [habits])
  const inactiveHabits = useMemo(() => habits.filter(h => !h.is_active), [habits])
  const todayHabits    = useMemo(() => activeHabits.filter(h => h.scheduledToday), [activeHabits])
  const completedToday = useMemo(() => todayHabits.filter(h => h.completedToday).length, [todayHabits])
  /** Fechas con al menos un hábito cumplido (para "Este mes…", lib/kindMoments.ts) */
  const doneDates = useMemo(() => {
    const out = new Set<string>()
    rawHabits.forEach(h => { const v = logMap.get(h.id); if (v) doneSet(v, h.target_value).forEach(d => out.add(d)) })
    return out
  }, [rawHabits, logMap])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const setLocal = (habitId: string, date: string, value: number) => setLogMap(prev => {
    const next = new Map(prev)
    const m = new Map(next.get(habitId) ?? [])
    if (value > 0) m.set(date, value); else m.delete(date)
    next.set(habitId, m)
    return next
  })

  /**
   * Guarda el valor de un día (hoy o hasta 7 días atrás): 0 borra el registro. Sí/no = 1; con cantidad, lo hecho.
   * Revierte si falla.
   */
  const setDayValue = useCallback(async (habitId: string, date: string, value: number) => {
    if (!user) return
    if (date > today || date < shiftDate(today, -7)) return
    const prevValue = logMap.get(habitId)?.get(date) ?? 0
    const v = Math.max(0, Math.min(100000, Math.round(value * 100) / 100))
    setLocal(habitId, date, v)
    const { error: err } = v > 0
      ? await db.from('life_habit_logs').upsert(
          { habit_id: habitId, user_id: user.id, completed_date: date, value: v },
          { onConflict: 'habit_id,completed_date' })
      : await db.from('life_habit_logs').delete()
          .eq('habit_id', habitId).eq('user_id', user.id).eq('completed_date', date)
    if (err) { setLocal(habitId, date, prevValue); throw err }
    const habit = rawHabits.find(h => h.id === habitId)
    if (habit && isDone(v, habit.target_value) && !isDone(prevValue || undefined, habit.target_value)) {
      celebrate()
      void (async () => {
        const { count: totalLogs } = await db.from('life_habit_logs')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if (totalLogs === 1) void award(user.id, 'first_habit_completed', 'Primer hábito completado')
        const values = new Map(logMap.get(habitId) ?? [])
        values.set(date, v)
        const streak = calculateStreak(doneSet(values, habit.target_value), habit.frequency, today, weekStart)
        if (habit.frequency.type !== 'times_per_week') {
          if (streak >= 7)  void award(user.id, 'habit_streak_7',  'Racha de 7 días')
          if (streak >= 30) void award(user.id, 'habit_streak_30', 'Racha de 30 días')
        }
      })()
    }
  }, [user, today, rawHabits, logMap, weekStart])

  /** Marca o desmarca un día: sí/no → 1; con cantidad → la meta completa (o borra). */
  const toggleDay = useCallback(async (habitId: string, date: string, done: boolean) => {
    const habit = rawHabits.find(h => h.id === habitId)
    await setDayValue(habitId, date, done ? (habit?.target_value ?? 1) : 0)
  }, [rawHabits, setDayValue])

  /** "+1" (o el paso que sea) a lo hecho hoy en un hábito con cantidad. */
  const addToday = useCallback(async (habitId: string, delta = 1) => {
    const current = logMap.get(habitId)?.get(today) ?? 0
    await setDayValue(habitId, today, current + delta)
  }, [logMap, today, setDayValue])

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
    completedToday, totalToday: todayHabits.length, doneDates,
    loading, error, reload: load,
    toggleToday, toggleDay, setDayValue, addToday, createHabit, updateHabit, deleteHabit, toggleActive,
  }
}
