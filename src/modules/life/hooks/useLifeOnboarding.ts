import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usePrefs } from '@/lib/prefs'
import { useAuthStore } from '@/store/authStore'
import { LIFE_DATA_UPDATED } from './useBrain'
import { insertTask } from './useTasks'
import { MAX_PRIORITIES, prioritiesOf } from './useDailyReview'
import { remindersChanged } from '../lib/reminderLeader'
import { frequencyFor, type OnboardingPlan } from '../lib/lifeOnboarding'

// Onboarding de Life OS: se muestra la primera vez que una cuenta entra a Life sin metas, hábitos ni tareas.
// Terminarlo o saltearlo lo marca en la cuenta (user_settings.life_onboarding_at) y en el dispositivo, para que no
// vuelva a aparecer. Crea la meta, el hábito y la tarea directo en la base (no usa useGoals/useHabits/useTasks: así
// no se cargan esas listas sólo para crear el plan) y avisa con LIFE_DATA_UPDATED para que Mi día los vuelva a leer.

// user_settings.life_onboarding_at todavía no está en database.types.ts
const db = supabase as unknown as SupabaseClient

export type OnboardingStatus = 'checking' | 'show' | 'hidden'

const localKey = (userId: string) => `mycen.lifeOnboarding.${userId}`

function seenHere(userId: string): boolean {
  try { return !!localStorage.getItem(localKey(userId)) } catch { return false }
}
function rememberHere(userId: string) {
  try { localStorage.setItem(localKey(userId), '1') } catch { /* sin almacenamiento: queda la marca de la cuenta */ }
}

/** ¿Hay que mostrarlo? Sólo sin marca en la cuenta y sin metas, hábitos ni tareas. Ante un error, no se muestra. */
async function needsOnboarding(userId: string): Promise<boolean> {
  const [settings, goals, habits, tasks] = await Promise.all([
    db.from('user_settings').select('life_onboarding_at').eq('user_id', userId).maybeSingle(),
    db.from('life_goals').select('id').eq('user_id', userId).limit(1),
    db.from('life_habits').select('id').eq('user_id', userId).limit(1),
    db.from('life_brain_items').select('id').eq('user_id', userId).eq('type', 'task').limit(1),
  ])
  if (goals.error || habits.error || tasks.error) return false
  // Sin la columna (migración pendiente) se decide sólo por los datos y la marca del dispositivo
  if (!settings.error && (settings.data as { life_onboarding_at?: string | null } | null)?.life_onboarding_at) return false
  return !goals.data?.length && !habits.data?.length && !tasks.data?.length
}

/** Marca el onboarding como visto en la cuenta. Si todavía no hay fila de preferencias, la crea con las actuales. */
async function markSeen(userId: string): Promise<void> {
  rememberHere(userId)
  const at = new Date().toISOString()
  const { data, error } = await db.from('user_settings').update({ life_onboarding_at: at }).eq('user_id', userId).select('user_id')
  if (error || data?.length) return
  const p = usePrefs.getState()
  const { error: err } = await db.from('user_settings').insert({
    user_id: userId, language: p.language, currency: p.currency, extra_currencies: p.extra_currencies,
    timezone: p.timezoneSaved, week_start: p.week_start, life_onboarding_at: at,
  })
  // Otra pestaña la creó al mismo tiempo: alcanza con marcarla
  if (err?.code === '23505') await db.from('user_settings').update({ life_onboarding_at: at }).eq('user_id', userId)
}

/** Lo que ya se creó (si algo falla a mitad de camino, reintentar no duplica la meta ni el hábito). */
export interface CreatedPlan { goalId?: string; habitId?: string; taskId?: string; priority?: boolean }

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

/**
 * Crea la meta, el hábito (con sus días) y la tarea de hoy (en foco y como prioridad de Mi día), todo unido a la meta.
 * `done` se va completando: si falla, se puede volver a llamar con el mismo objeto.
 */
export async function createOnboardingPlan(userId: string, plan: OnboardingPlan, today: string, done: CreatedPlan): Promise<void> {
  if (!done.goalId) {
    const { data, error } = await db.from('life_goals').insert({
      user_id: userId, name: plan.goal.name.trim(), color: plan.goal.color, progress: 0, status: 'in_progress', sort_order: 0,
    }).select('id').single()
    if (error) throw error
    done.goalId = (data as { id: string }).id
  }
  if (plan.habit && !done.habitId) {
    const { data, error } = await db.from('life_habits').insert({
      user_id: userId, name: plan.habit.name.trim(), icon: plan.habit.icon, color: plan.habit.color,
      frequency: frequencyFor(plan.habit.days), goal_id: done.goalId, is_active: true, sort_order: 0,
    }).select('id').single()
    if (error) throw error
    done.habitId = (data as { id: string }).id
  }
  if (plan.task && !done.taskId) {
    done.taskId = (await insertTask(userId, { title: plan.task.title, due_date: today, goal_id: done.goalId, is_focus: true })).id
  }
  if (done.taskId && !done.priority) {
    // La tarea queda entre las 3 prioridades de hoy (sin pisar las que ya hubiera)
    const { data, error } = await db.from('life_daily_reviews').select('priorities')
      .eq('user_id', userId).eq('date', today).maybeSingle()
    if (error) throw error
    const priorities = prioritiesOf((data as { priorities?: unknown } | null)?.priorities)
    if (priorities.length < MAX_PRIORITIES && !priorities.some(p => p.kind === 'task' && p.task_id === done.taskId)) {
      const { error: err } = await db.from('life_daily_reviews').upsert(
        { user_id: userId, date: today, priorities: [...priorities, { id: newId(), kind: 'task', task_id: done.taskId }], updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' })
      if (err) throw err
    }
    done.priority = true
  }
  for (const module of ['goals', 'habits', 'brain']) window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module } }))
  remindersChanged()
}

/** Si hay que mostrar el onboarding y cómo cerrarlo (terminado o salteado: no vuelve a aparecer). */
export function useLifeOnboarding() {
  const userId = useAuthStore(s => s.user?.id ?? null)
  // Lo que ya se decidió para esta cuenta; sin decisión, se pregunta a la base (salvo que este dispositivo ya lo vio)
  const [decided, setDecided] = useState<{ userId: string; show: boolean } | null>(null)

  useEffect(() => {
    if (!userId || seenHere(userId)) return
    let alive = true
    needsOnboarding(userId)
      .then(show => {
        if (!show) rememberHere(userId)   // ya tiene datos o ya lo vio: no hace falta volver a preguntar
        if (alive) setDecided({ userId, show })
      })
      .catch(() => { if (alive) setDecided({ userId, show: false }) })
    return () => { alive = false }
  }, [userId])

  const status: OnboardingStatus = !userId ? 'hidden'
    : decided?.userId === userId ? (decided.show ? 'show' : 'hidden')
      : seenHere(userId) ? 'hidden' : 'checking'

  const finish = useCallback(() => {
    if (!userId) return
    setDecided({ userId, show: false })
    void markSeen(userId).catch(() => { /* sin red: queda la marca del dispositivo */ })
  }, [userId])

  return { status, userId, finish }
}
