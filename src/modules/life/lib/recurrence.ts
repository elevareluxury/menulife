// Tareas que se repiten (V1 · etapa 09). Fechas locales "YYYY-MM-DD" del usuario: nunca UTC, así "mañana" es el
// mañana de la persona. Función pura, sin React ni Supabase (la prueban tests/unit/recurrence.test.ts).

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'interval'

export interface Recurrence {
  freq: RecurrenceFreq
  /** Cada cuántos días (interval) o semanas (weekly); por defecto 1 */
  interval?: number
  /** weekly: días de la semana, 0 = domingo … 6 = sábado */
  weekdays?: number[]
  /** monthly: día del mes (1–31); si el mes no lo tiene, el último día */
  monthday?: number
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
/** Lunes de la semana de d (las semanas cuentan de lunes a domingo para "cada N semanas") */
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))

/** ¿Es una repetición válida? (forma que guarda la base en life_brain_items.recurrence) */
export function isValidRecurrence(r: unknown): r is Recurrence {
  if (!r || typeof r !== 'object') return false
  const v = r as Recurrence
  const n = v.interval ?? 1
  if (!Number.isInteger(n) || n < 1 || n > 365) return false
  if (v.freq === 'daily' || v.freq === 'interval') return true
  if (v.freq === 'weekly') {
    return Array.isArray(v.weekdays) && v.weekdays.length > 0 && v.weekdays.every(w => Number.isInteger(w) && w >= 0 && w <= 6)
  }
  if (v.freq === 'monthly') return v.monthday === undefined || (Number.isInteger(v.monthday) && v.monthday >= 1 && v.monthday <= 31)
  return false
}

/** La fecha siguiente a `due` según la repetición (sin mirar hoy). */
function step(due: Date, r: Recurrence): Date {
  const n = Math.max(1, r.interval ?? 1)
  switch (r.freq) {
    case 'daily': return addDays(due, 1)
    case 'interval': return addDays(due, n)
    case 'monthly': {
      const day = r.monthday ?? due.getDate()
      const y = due.getFullYear() + Math.floor((due.getMonth() + 1) / 12)
      const m = (due.getMonth() + 1) % 12
      return new Date(y, m, Math.min(day, daysInMonth(y, m)))
    }
    case 'weekly': {
      const days = [...new Set(r.weekdays?.length ? r.weekdays : [due.getDay()])]
      for (let i = 1; i <= 7; i++) {
        const d = addDays(due, i)
        if (!days.includes(d.getDay())) continue
        // Pasó a otra semana: con "cada N semanas" se saltean las N-1 del medio
        const sameWeek = weekStart(d).getTime() === weekStart(due).getTime()
        return sameWeek || n === 1 ? d : addDays(d, (n - 1) * 7)
      }
      return addDays(due, 7 * n)
    }
  }
}

/**
 * Próxima ocurrencia de una tarea que vence `dueDate`. Si se completa atrasada, salta las fechas que ya pasaron:
 * la siguiente es la primera desde `today` (incluido). Sin fecha no hay repetición.
 */
export function nextOccurrence(dueDate: string, recurrence: Recurrence, today?: string): string {
  let d = step(parse(dueDate), recurrence)
  if (today) {
    const t = parse(today)
    for (let i = 0; i < 2000 && d < t; i++) d = step(d, recurrence)
  }
  return toKey(d)
}

/** Las próximas `count` fechas desde `dueDate` (sin incluirla): para mostrarlas en el calendario. */
export function upcomingOccurrences(dueDate: string, recurrence: Recurrence, until: string, max = 60): string[] {
  const out: string[] = []
  let key = dueDate
  for (let i = 0; i < max; i++) {
    key = nextOccurrence(key, recurrence)
    if (key > until) break
    out.push(key)
  }
  return out
}

// ── Selector simple de la ficha (TaskSheet) ───────────────────────────────────

export type RepeatChoice = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'
export interface CustomRepeat { every: number; unit: 'days' | 'weeks'; weekdays: number[] }

const WORKDAYS = [1, 2, 3, 4, 5]
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every(x => b.includes(x))

/** Qué opción del selector corresponde a una repetición guardada (con la fecha de la tarea). */
export function repeatChoiceOf(r: Recurrence | null, due: string | null): RepeatChoice {
  if (!r) return 'none'
  const n = r.interval ?? 1
  const day = due ? parse(due).getDay() : null
  const date = due ? parse(due).getDate() : null
  if (r.freq === 'daily' && n === 1) return 'daily'
  if (r.freq === 'weekly' && n === 1 && sameSet(r.weekdays ?? [], WORKDAYS)) return 'weekdays'
  if (r.freq === 'weekly' && n === 1 && r.weekdays?.length === 1 && r.weekdays[0] === day) return 'weekly'
  if (r.freq === 'monthly' && (r.monthday ?? date) === date) return 'monthly'
  return 'custom'
}

/** La repetición que guarda cada opción. La semanal y la mensual toman el día de la fecha elegida. */
export function recurrenceFor(choice: RepeatChoice, due: string, custom: CustomRepeat): Recurrence | null {
  const d = parse(due)
  switch (choice) {
    case 'none': return null
    case 'daily': return { freq: 'daily' }
    case 'weekdays': return { freq: 'weekly', weekdays: WORKDAYS }
    case 'weekly': return { freq: 'weekly', weekdays: [d.getDay()] }
    case 'monthly': return { freq: 'monthly', monthday: d.getDate() }
    case 'custom': {
      const every = Math.min(365, Math.max(1, Math.round(custom.every) || 1))
      if (custom.unit === 'weeks') {
        const days = custom.weekdays.length ? [...custom.weekdays].sort((a, b) => a - b) : [d.getDay()]
        return { freq: 'weekly', interval: every, weekdays: days }
      }
      return every === 1 ? { freq: 'daily' } : { freq: 'interval', interval: every }
    }
  }
}

/** Valores iniciales del modo "Personalizado" a partir de lo guardado. */
export function customOf(r: Recurrence | null, due: string | null): CustomRepeat {
  const day = due ? parse(due).getDay() : 1
  if (r?.freq === 'weekly') return { every: r.interval ?? 1, unit: 'weeks', weekdays: r.weekdays ?? [day] }
  if (r?.freq === 'interval') return { every: r.interval ?? 2, unit: 'days', weekdays: [day] }
  return { every: 2, unit: 'days', weekdays: [day] }
}
