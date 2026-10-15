// Revisión semanal guiada ("Tu semana en 5 minutos"). Funciones puras de fechas y del resumen de la semana (las prueba
// tests/unit/weeklyReview.test.ts). Las semanas empiezan según las preferencias (week_start: 0 = domingo, 1 = lunes).
import { shiftDate, weekStartOf } from './habitStreak'
import { moodSummary, type MoodDay, type MoodSummary } from './mood'

export const MAX_FOCUS = 3
export const WEEKLY_TEXT_MAX = 500

/** Último día de la semana que empieza en `week`. */
export const weekEndOf = (week: string) => shiftDate(week, 6)

/** La tarjeta aparece en "Mi día" el último día de la semana. */
export function isWeekLastDay(today: string, weekStart: 0 | 1): boolean {
  return today === weekEndOf(weekStartOf(today, weekStart))
}

/**
 * La semana para revisar "cuando la persona quiera": la que está en curso, salvo en sus dos primeros días (todavía no
 * pasó casi nada), que es la anterior.
 */
export function weekToReview(today: string, weekStart: 0 | 1): string {
  const week = weekStartOf(today, weekStart)
  return today <= shiftDate(week, 1) ? shiftDate(week, -7) : week
}

/** Fecha para lo que pasa "a la semana que viene": el primer día de la semana siguiente (nunca antes de hoy). */
export function nextWeekDate(week: string, today: string): string {
  const next = shiftDate(week, 7)
  return next < today ? today : next
}

export interface WeekSummary {
  tasksDone: number
  habitsDone: number
  mood: MoodSummary | null
}

/**
 * Lo que salió bien en la semana, con datos reales: tareas completadas (por fecha local), veces que se cumplió un
 * hábito (los registros ya filtrados por meta) y el ánimo (sólo si se anotó algún día).
 */
export function summarizeWeek(
  week: string,
  data: { tasksCompletedOn: string[]; habitDoneOn: string[]; moods: MoodDay[] },
): WeekSummary {
  const end = weekEndOf(week)
  const inWeek = (d: string) => d >= week && d <= end
  return {
    tasksDone: data.tasksCompletedOn.filter(inWeek).length,
    habitsDone: data.habitDoneOn.filter(inWeek).length,
    mood: moodSummary(data.moods.filter(m => inWeek(m.date))),
  }
}

/** ¿La semana tuvo algo para mostrar en "lo que salió bien"? (Si no, se dice con calma que fue tranquila.) */
export const weekHasWins = (s: WeekSummary) => s.tasksDone > 0 || s.habitsDone > 0 || !!s.mood
