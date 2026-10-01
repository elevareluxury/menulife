import type { DaySchedule, WeekSchedule } from './profileTypes'

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
type Day = (typeof WEEK_DAYS)[number]

const JS_DAYS: Day[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function toMinutes(hhmm: string | undefined): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** Día y minuto actuales en la zona horaria del negocio (no la del visitante). */
export function nowInTimezone(timezone: string | null | undefined, date = new Date()): { day: Day; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Argentina/Buenos_Aires',
      weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
    const day = get('weekday').toLowerCase() as Day
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
  } catch {
    return { day: JS_DAYS[date.getDay()], minutes: date.getHours() * 60 + date.getMinutes() }
  }
}

function isWithin(slot: DaySchedule | undefined, minutes: number, part: 'same_day' | 'after_midnight'): boolean {
  if (!slot || slot.closed) return false
  const open = toMinutes(slot.open)
  const close = toMinutes(slot.close)
  if (open == null || close == null) return false
  const overnight = close <= open // ej. 20:00–02:00 o 11:00–00:00
  if (part === 'same_day') return overnight ? minutes >= open : minutes >= open && minutes < close
  return overnight && minutes < close
}

/**
 * ¿Está abierto ahora? Soporta horarios que cruzan la medianoche.
 * Devuelve null si no hay datos suficientes (no se inventa un estado).
 */
export function isOpenNow(schedule: WeekSchedule | null | undefined, timezone?: string | null, date = new Date()): boolean | null {
  if (!schedule || typeof schedule !== 'object') return null
  const hasData = WEEK_DAYS.some(d => schedule[d]?.closed || (schedule[d]?.open && schedule[d]?.close))
  if (!hasData) return null

  const { day, minutes } = nowInTimezone(timezone, date)
  const prevDay = WEEK_DAYS[(WEEK_DAYS.indexOf(day) + 6) % 7]
  return isWithin(schedule[day], minutes, 'same_day') || isWithin(schedule[prevDay], minutes, 'after_midnight')
}

export function todayKey(timezone?: string | null, date = new Date()): Day {
  return nowInTimezone(timezone, date).day
}
