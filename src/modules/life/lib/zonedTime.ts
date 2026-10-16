// Fechas y horas "locales" de Life OS en la zona horaria de la cuenta (`user_settings.timezone`).
// Sin dependencias: sólo `Intl.DateTimeFormat`. Todo es puro salvo la zona activa de la cuenta, que `src/lib/prefs.ts`
// anota con `setAccountTimeZone` al cargar o cambiar las preferencias.
//
// Dos tipos de fecha conviven en Life OS:
// - Claves de calendario (YYYY-MM-DD) armadas con `new Date(y, m, d)`: son días, no instantes; se leen con los campos
//   locales y no dependen de la zona.
// - Instantes (created_at, completed_at, occurred_at, "ahora"): su día y su hora dependen de la zona. Esos pasan por acá.
//
// Si la cuenta no eligió zona o la guardada no es válida, se usa la del dispositivo (lo de siempre).

const pad = (n: number) => String(n).padStart(2, '0')

/** Zona del dispositivo (IANA). */
export function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

const validCache = new Map<string, boolean>()

/** ¿El navegador conoce esta zona IANA? */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false
  const hit = validCache.get(tz)
  if (hit !== undefined) return hit
  let ok: boolean
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); ok = true } catch { ok = false }
  validCache.set(tz, ok)
  return ok
}

/** ¿Son la misma zona? (compara los nombres canónicos: "America/Buenos_Aires" = "America/Argentina/Buenos_Aires") */
export function sameTimeZone(a: string, b: string): boolean {
  if (a === b) return true
  if (!isValidTimeZone(a) || !isValidTimeZone(b)) return false
  const canon = (z: string) => new Intl.DateTimeFormat('en-US', { timeZone: z }).resolvedOptions().timeZone
  return canon(a) === canon(b)
}

/** La zona a usar: la pedida si es válida; si no, la del dispositivo. */
export function resolveTimeZone(tz?: string | null): string {
  return isValidTimeZone(tz) ? tz : deviceTimeZone()
}

export interface ZonedParts {
  year: number
  /** 1–12 */
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = domingo … 6 = sábado */
  weekday: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
    })
    formatters.set(tz, f)
  }
  return f
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Fecha y hora de pared de un instante en la zona `tz`. */
export function zonedParts(date: Date, tz: string): ZonedParts {
  const parts = formatterFor(resolveTimeZone(tz)).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const hour = Number(get('hour'))
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: hour === 24 ? 0 : hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 0,
  }
}

/** Día (YYYY-MM-DD) de un instante en la zona `tz`. Una fecha sola ("2026-10-05", lo que guarda un fijo) queda igual. */
export function dateKeyOf(date: Date | string, tz: string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const p = zonedParts(typeof date === 'string' ? new Date(date) : date, tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Hoy (YYYY-MM-DD) en la zona `tz`. */
export function todayKey(tz: string, now: Date = new Date()): string {
  return dateKeyOf(now, tz)
}

/** Mes (YYYY-MM) de un instante en la zona `tz`. */
export function monthKeyOf(date: Date | string, tz: string): string {
  return dateKeyOf(date, tz).slice(0, 7)
}

/** Diferencia de la hora de pared con UTC (ms) en ese instante: Buenos Aires = −3 h. */
export function zoneOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz)
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return wall - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * Instante en que la hora de pared `time` (HH:MM) del día `key` empieza en la zona `tz`.
 * Con el cambio de horario: una hora que no existe (el reloj salta) pasa a la primera que sí; una que se repite toma
 * la primera vez.
 */
export function zonedTimeToDate(key: string, time: string, tz: string): Date {
  const zone = resolveTimeZone(tz)
  const [y, m, d] = key.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  const t1 = guess - zoneOffsetMs(new Date(guess), zone)
  const t2 = guess - zoneOffsetMs(new Date(t1), zone)
  const matches = (t: number) => {
    const p = zonedParts(new Date(t), zone)
    return p.year === y && p.month === m && p.day === d && p.hour === (hh || 0) && p.minute === (mm || 0)
  }
  const ok = [t1, t2].filter(matches)
  if (ok.length) return new Date(Math.min(...ok))
  return new Date(Math.max(t1, t2))
}

/** Comienzo del día `key` en la zona `tz`, como ISO (para comparar con columnas timestamptz). */
export function startOfLocalDayISO(key: string, tz: string): string {
  return zonedTimeToDate(key, '00:00', tz).toISOString()
}

/** Mediodía del día `key` en la zona `tz`, como ISO (lo que guarda un movimiento con fecha elegida a mano). */
export function noonOfLocalDayISO(key: string, tz: string): string {
  return zonedTimeToDate(key, '12:00', tz).toISOString()
}

/**
 * "Ahora" como reloj de pared de la zona `tz`: un Date cuyos campos locales (getFullYear, getMonth, getDate, getHours,
 * getDay) son la fecha y hora de esa zona. Sirve para las cuentas de calendario que ya usan los campos locales.
 * No usarlo como instante (toISOString, comparar con timestamps).
 */
export function nowInZone(tz: string, now: Date = new Date()): Date {
  const p = zonedParts(now, tz)
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/** Milisegundos hasta la próxima medianoche de la zona `tz`. */
export function msUntilNextMidnight(tz: string, now: Date = new Date()): number {
  const p = zonedParts(now, tz)
  const tomorrow = new Date(Date.UTC(p.year, p.month - 1, p.day + 1))
  const key = `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())}`
  return Math.max(1000, zonedTimeToDate(key, '00:00', tz).getTime() - now.getTime())
}

/** Clave de calendario (YYYY-MM-DD) de un Date armado con `new Date(y, m, d)`: lee los campos locales, sin zona. */
export function calendarKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Zona de la cuenta ────────────────────────────────────────────────────────────────────────────

let accountZone: string | null = null

/** La anota `src/lib/prefs.ts` cuando carga o cambia `user_settings.timezone`. */
export function setAccountTimeZone(tz: string | null | undefined): void {
  accountZone = isValidTimeZone(tz) ? tz : null
}

/** Zona que usa Life OS: la de la cuenta o, si no hay (o no es válida), la del dispositivo. */
export function lifeTimeZone(): string {
  return accountZone ?? deviceTimeZone()
}

/** Hoy (YYYY-MM-DD) para Life OS. */
export function lifeToday(now: Date = new Date()): string {
  return todayKey(lifeTimeZone(), now)
}

/** Día (YYYY-MM-DD) de un instante para Life OS. */
export function lifeDayOf(instant: Date | string): string {
  return dateKeyOf(instant, lifeTimeZone())
}

/** "Ahora" como reloj de pared de Life OS (ver `nowInZone`). */
export function lifeNow(now: Date = new Date()): Date {
  return nowInZone(lifeTimeZone(), now)
}
