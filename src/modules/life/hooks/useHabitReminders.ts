import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { localDateKey } from './useTasks'
import { frequencyOf, isDone, isScheduledOn } from '../lib/habitStreak'
import { lifeT } from '@/i18n/app/life'

const db = supabase as unknown as SupabaseClient
const CHECK_EVERY_MS = 30_000
/** Si la app se abre tarde, avisa igual hasta 2 h después de la hora elegida */
const LATE_MS = 2 * 3_600_000

const remindedKey = (id: string, day: string) => `life-habit-reminded:${id}:${day}`
function wasReminded(id: string, day: string): boolean {
  try { return localStorage.getItem(remindedKey(id, day)) === '1' } catch { return false }
}
function markReminded(id: string, day: string) {
  try { localStorage.setItem(remindedKey(id, day), '1') } catch { /* storage bloqueado */ }
}

interface HabitRow {
  id: string; name: string; anchor: string | null; frequency: unknown
  target_value: number | null; reminder_time: string | null
}

/**
 * Recordatorio por hábito (V1 · etapa 10), con el mismo mecanismo que las tareas: con Life OS abierto, a la hora
 * elegida, si le toca hoy y todavía no se hizo. Texto: "Después de {ancla}: {hábito}" o sólo el hábito. Una vez por
 * día y hábito (se anota en este dispositivo). Con la app nativa (Capacitor) llegan aunque esté cerrada.
 */
export function useHabitReminders(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function check() {
      const now = new Date()
      const today = localDateKey(now)
      const { data: habits } = await db.from('life_habits')
        .select('id,name,anchor,frequency,target_value,reminder_time')
        .eq('user_id', userId).eq('is_active', true).eq('reminder_enabled', true)
      if (cancelled || !habits?.length) return
      const due = (habits as HabitRow[]).filter(h => {
        if (!h.reminder_time || wasReminded(h.id, today) || !isScheduledOn(frequencyOf(h.frequency), today)) return false
        const at = new Date(`${today}T${h.reminder_time.slice(0, 5)}:00`).getTime()
        return now.getTime() >= at && now.getTime() - at <= LATE_MS
      })
      if (!due.length) return
      const { data: logs } = await db.from('life_habit_logs').select('habit_id,value')
        .eq('user_id', userId).eq('completed_date', today).in('habit_id', due.map(h => h.id))
      if (cancelled) return
      const todayValue = new Map((logs ?? []).map(l => [l.habit_id as string, Number(l.value ?? 1)]))

      const p = lifeT().habitPlus
      for (const h of due) {
        markReminded(h.id, today)
        if (isDone(todayValue.get(h.id), h.target_value)) continue
        const text = h.anchor ? p.reminderBody(h.anchor, h.name) : h.name
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(text, { tag: `life-habit-${h.id}-${today}` })
        } else {
          toast(`⏰ ${text}`, { duration: 8000 })
        }
      }
    }

    void check()
    const id = window.setInterval(() => { void check() }, CHECK_EVERY_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [userId])
}
