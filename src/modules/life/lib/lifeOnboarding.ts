// Onboarding de Life OS: la primera vez, "¿Qué querés mejorar?" → una propuesta ya armada (meta + hábito chico +
// primera tarea para hoy, todo unido a la meta). Funciones puras: los textos salen del diccionario del idioma activo.

import type { LifeDict } from '@/i18n/app/life'
import { ALL_DAYS, type HabitFrequency } from './habitStreak'

export const ONBOARDING_AREAS = ['health', 'money', 'learn', 'order', 'work', 'relationships', 'rest', 'other'] as const
export type OnboardingArea = (typeof ONBOARDING_AREAS)[number]

/** Topes de las hojas de meta, hábito y tarea (GoalSheet, HabitSheet, TaskSheet) */
export const MAX_GOAL = 80
export const MAX_HABIT = 60
export const MAX_TASK = 200

export interface OnboardingPlan {
  area: OnboardingArea
  goal: { name: string; color: string }
  /** null = la persona lo salteó */
  habit: { name: string; icon: string; color: string; days: number[] } | null
  task: { title: string } | null
}

// Ícono, color y días sugeridos por área (0 = domingo). Los colores son de LIFE_COLORS.
const LOOK: Record<OnboardingArea, { color: string; icon: string; days: number[] }> = {
  health:        { color: '#22C55E', icon: 'Dumbbell', days: [1, 3, 5] },
  money:         { color: '#F59E0B', icon: 'PenLine',  days: ALL_DAYS },
  learn:         { color: '#3B82F6', icon: 'BookOpen', days: [1, 2, 3, 4, 5] },
  order:         { color: '#06B6D4', icon: 'Leaf',     days: ALL_DAYS },
  work:          { color: '#8B5CF6', icon: 'Zap',      days: [1, 2, 3, 4, 5] },
  relationships: { color: '#EC4899', icon: 'Heart',    days: [2, 4, 6] },
  rest:          { color: '#3B82F6', icon: 'Moon',     days: ALL_DAYS },
  other:         { color: '#F4705A', icon: 'Star',     days: ALL_DAYS },
}

export const isOnboardingArea = (v: unknown): v is OnboardingArea =>
  typeof v === 'string' && (ONBOARDING_AREAS as readonly string[]).includes(v)

/** Días sugeridos, siempre con hoy: el hábito tiene que aparecer en Mi día para tildarlo. */
export function suggestedDays(area: OnboardingArea, todayWeekday: number): number[] {
  const days = LOOK[area].days
  return days.includes(todayWeekday) ? [...days] : [...days, todayWeekday].sort((a, b) => a - b)
}

/** La propuesta ya armada para un área. Con "otra", la meta es lo que escribió la persona. */
export function proposalFor(area: OnboardingArea, dict: LifeDict, todayWeekday: number, otherText = ''): OnboardingPlan {
  const p = dict.onboarding.proposals[area]
  const look = LOOK[area]
  const goal = area === 'other' ? (otherText.trim() || dict.onboarding.areas.other) : p.goal
  return {
    area,
    goal: { name: goal.slice(0, MAX_GOAL), color: look.color },
    habit: { name: p.habit.slice(0, MAX_HABIT), icon: look.icon, color: look.color, days: suggestedDays(area, todayWeekday) },
    task: { title: p.task.slice(0, MAX_TASK) },
  }
}

/** Frecuencia del hábito como la guarda HabitSheet: los 7 días = "daily". */
export function frequencyFor(days: number[]): HabitFrequency {
  const clean = [...new Set(days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  return { type: clean.length === 7 ? 'daily' : 'weekly', days: clean }
}

/** Lo que falta para poder crear el plan (null = está listo). */
export function planProblem(plan: OnboardingPlan): 'goal' | 'habit' | 'days' | 'task' | null {
  if (!plan.goal.name.trim()) return 'goal'
  if (plan.habit && !plan.habit.name.trim()) return 'habit'
  if (plan.habit && plan.habit.days.length === 0) return 'days'
  if (plan.task && !plan.task.title.trim()) return 'task'
  return null
}
