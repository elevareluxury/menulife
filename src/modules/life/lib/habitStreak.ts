// Hábitos que se adaptan a la vida real (V1 · etapa 10). Funciones puras con fechas locales "YYYY-MM-DD".
//  · Días programados: un día programado perdido no corta la racha (y no suma); la cortan dos seguidos.
//  · "X veces por semana": la racha cuenta semanas cumplidas; una semana sin cumplir no la corta, dos seguidas sí.
//  · Hoy (o esta semana) sin cumplir nunca cuenta como perdido: el día no terminó.

export type HabitFrequency =
  | { type: 'daily' | 'weekly'; days: number[] }
  | { type: 'times_per_week'; times: number }

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function shiftDate(key: string, days: number): string {
  const d = parse(key)
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))
}
export const weekdayOf = (key: string) => parse(key).getDay()

/** Primer día de la semana de `key` (weekStart 0 = domingo, 1 = lunes). */
export function weekStartOf(key: string, weekStart: 0 | 1): string {
  const offset = (weekdayOf(key) - weekStart + 7) % 7
  return shiftDate(key, -offset)
}

/** ¿Está cumplido ese día? Con cantidad: el valor llega a la meta; sin cantidad: hay registro. */
export function isDone(value: number | undefined, target: number | null | undefined): boolean {
  if (value === undefined) return false
  return target != null && target > 0 ? value >= target : value > 0
}

/** Días cumplidos en la semana de `key` (para "2 de 3 esta semana"). */
export function doneInWeek(done: Set<string>, key: string, weekStart: 0 | 1): number {
  const start = weekStartOf(key, weekStart)
  let n = 0
  for (let i = 0; i < 7; i++) if (done.has(shiftDate(start, i))) n++
  return n
}

const MAX_DAYS = 800
const MAX_WEEKS = 120

/**
 * Racha que perdona. `done` = días cumplidos. Devuelve días (días programados) o semanas (times_per_week).
 */
export function calculateStreak(done: Set<string>, frequency: HabitFrequency, today: string, weekStart: 0 | 1 = 1): number {
  if (frequency.type === 'times_per_week') {
    const times = Math.min(7, Math.max(1, frequency.times))
    let streak = 0
    let misses = 0
    let week = weekStartOf(today, weekStart)
    for (let i = 0; i < MAX_WEEKS; i++) {
      const met = doneInWeek(done, week, weekStart) >= times
      if (met) { streak++; misses = 0 }
      else if (i > 0) { if (++misses >= 2) break }
      week = shiftDate(week, -7)
    }
    return streak
  }

  const days = frequency.days?.length ? frequency.days : ALL_DAYS
  let streak = 0
  let misses = 0
  let cur = today
  for (let i = 0; i < MAX_DAYS; i++) {
    if (done.has(cur)) { streak++; misses = 0 }
    else if (cur !== today && days.includes(weekdayOf(cur))) { if (++misses >= 2) break }
    cur = shiftDate(cur, -1)
  }
  return streak
}

/** ¿Le toca hoy? Los de "X veces por semana" se pueden hacer cualquier día. */
export function isScheduledOn(frequency: HabitFrequency, key: string): boolean {
  if (frequency.type === 'times_per_week') return true
  const days = frequency.days?.length ? frequency.days : ALL_DAYS
  return days.includes(weekdayOf(key))
}

/** Normaliza lo guardado (los hábitos de antes tienen { type, days }). */
export function frequencyOf(raw: unknown): HabitFrequency {
  const f = raw as Partial<{ type: string; days: number[]; times: number }> | null
  if (f?.type === 'times_per_week' && Number.isInteger(f.times) && f.times! >= 1 && f.times! <= 7) {
    return { type: 'times_per_week', times: f.times! }
  }
  const days = Array.isArray(f?.days) && f!.days!.length ? f!.days!.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : ALL_DAYS
  return { type: f?.type === 'weekly' ? 'weekly' : 'daily', days: days.length ? days : ALL_DAYS }
}
