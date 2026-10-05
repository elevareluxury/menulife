import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { taskDueAt, localDateKey, type LifeTask } from './useTasks'
import { lifeT } from '@/i18n/app/life'

const db = supabase as unknown as SupabaseClient
const CHECK_EVERY_MS = 30_000

/**
 * Recordatorios mientras Life OS está abierto: cada 30 s busca tareas cuyo aviso
 * ya llegó, muestra una notificación del navegador (o un aviso en pantalla) y
 * marca reminded_at para no repetirlo. Con la app cerrada, el aviso lo da el
 * calendario del celular si la tarea se agregó con "Agregar al calendario".
 */
export function useTaskReminders(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function check() {
      const today = new Date()
      const from = new Date(today); from.setDate(from.getDate() - 1)
      const to = new Date(today); to.setDate(to.getDate() + 8)
      const { data } = await db.from('life_brain_items')
        .select('id, title, due_date, due_time, remind_minutes, reminded_at')
        .eq('user_id', userId)
        .eq('type', 'task')
        .eq('is_completed', false)
        .eq('is_archived', false)
        .is('reminded_at', null)
        .not('remind_minutes', 'is', null)
        .gte('due_date', localDateKey(from))
        .lte('due_date', localDateKey(to))
      if (cancelled || !data) return

      const now = Date.now()
      for (const task of data as Pick<LifeTask, 'id' | 'title' | 'due_date' | 'due_time' | 'remind_minutes'>[]) {
        const due = taskDueAt(task)
        if (!due) continue
        const remindAt = due.getTime() - (task.remind_minutes ?? 0) * 60_000
        // Avisar si ya es la hora (y no pasó más de 12 h, para no avisar cosas viejas)
        if (remindAt > now || now - remindAt > 12 * 3_600_000) continue

        const ts = lifeT().taskSheet
        const when = task.due_time ? ts.reminderAt(task.due_time.slice(0, 5)) : ts.reminderToday
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(task.title, { body: ts.reminderBody(when), tag: `life-task-${task.id}` })
        } else {
          toast(`⏰ ${task.title} · ${when}`, { duration: 8000 })
        }
        await db.from('life_brain_items').update({ reminded_at: new Date().toISOString() }).eq('id', task.id)
      }
    }

    void check()
    const id = window.setInterval(() => { void check() }, CHECK_EVERY_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [userId])
}
