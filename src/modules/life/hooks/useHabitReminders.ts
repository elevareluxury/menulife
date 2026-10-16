import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { localDateKey } from './useTasks'
import { frequencyOf, isDone, isScheduledOn } from '../lib/habitStreak'
import { lifeT } from '@/i18n/app/life'
import { anchorHasPrefix, anchorLabel } from '../lib/habitAnchor'
import { claimMark, cleanOldMarks, electLeader, reminderLoop } from '../lib/reminderLeader'

const db = supabase as unknown as SupabaseClient
/** Si la app se abre tarde, avisa igual hasta 2 h después de la hora elegida */
const LATE_MS = 2 * 3_600_000
/** Las marcas "ya avisé" se guardan 7 días */
const KEEP_DAYS = 7

const MARK_PREFIX = 'life-habit-reminded:'
const remindedKey = (id: string, day: string) => `${MARK_PREFIX}${id}:${day}`
function wasReminded(id: string, day: string): boolean {
  try { return localStorage.getItem(remindedKey(id, day)) === '1' } catch { return false }
}

interface HabitRow {
  id: string; name: string; anchor: string | null; frequency: unknown
  target_value: number | null; reminder_time: string | null
}

/**
 * Recordatorio por hábito (V1 · etapa 10), con el mismo mecanismo que las tareas: con Life OS abierto, a la hora
 * elegida, si le toca hoy y todavía no se hizo. Texto: "Después de {ancla}: {hábito}" o sólo el hábito. Una vez por
 * día y hábito (se anota en este dispositivo, antes de avisar). Con varias pestañas avisa una sola (la líder,
 * `lib/reminderLeader.ts`); los hábitos se leen al abrir, al volver a la pestaña, al cambiarlos y cada 5 min, y las
 * horas se comparan en el dispositivo. Con la app nativa (Capacitor) llegan aunque esté cerrada.
 */
export function useHabitReminders(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    cleanOldMarks(MARK_PREFIX, localDateKey(new Date(Date.now() - KEEP_DAYS * 86_400_000)))

    const load = async () => {
      const { data, error } = await db.from('life_habits')
        .select('id,name,anchor,frequency,target_value,reminder_time')
        .eq('user_id', userId).eq('is_active', true).eq('reminder_enabled', true)
      return error ? null : (data ?? []) as HabitRow[]
    }

    const check = async (habits: HabitRow[]) => {
      const now = new Date()
      const today = localDateKey(now)
      const due = habits.filter(h => {
        if (!h.reminder_time || wasReminded(h.id, today) || !isScheduledOn(frequencyOf(h.frequency), today)) return false
        const at = new Date(`${today}T${h.reminder_time.slice(0, 5)}:00`).getTime()
        return now.getTime() >= at && now.getTime() - at <= LATE_MS
      })
      if (!due.length) return
      const { data: logs, error } = await db.from('life_habit_logs').select('habit_id,value')
        .eq('user_id', userId).eq('completed_date', today).in('habit_id', due.map(h => h.id))
      if (error) return
      const todayValue = new Map((logs ?? []).map(l => [l.habit_id as string, Number(l.value ?? 1)]))

      const p = lifeT().habitPlus
      for (const h of due) {
        // Se anota antes de avisar: si ya estaba anotada (otra pestaña o un tick anterior), no se repite
        if (!claimMark(remindedKey(h.id, today))) continue
        if (isDone(todayValue.get(h.id), h.target_value)) continue
        const text = h.anchor
          ? (anchorHasPrefix(h.anchor, p.afterAnchor) ? `${anchorLabel(h.anchor, p.afterAnchor)}: ${h.name}` : p.reminderBody(h.anchor, h.name))
          : h.name
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(text, { tag: `life-habit-${h.id}-${today}` })
        } else {
          toast(`⏰ ${text}`, { duration: 8000 })
        }
      }
    }

    return electLeader('mycen-life-habit-reminders', () => reminderLoop(load, check))
  }, [userId])
}
