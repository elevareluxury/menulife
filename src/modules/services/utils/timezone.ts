// Timezone utilities using native Intl API — no external library needed.
// All DB timestamps are UTC (TIMESTAMPTZ). Display uses restaurants.timezone.

const pad = (n: number) => String(n).padStart(2, '0')

/** Format a UTC date in the given IANA timezone */
export function formatInTz(
  date: Date | string,
  timezone: string,
  opts: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', { timeZone: timezone, ...opts }).format(d)
}

/** Extract { hour, minute } for a UTC date in a given timezone */
export function getLocalHourMinute(date: Date | string, timezone: string): { hour: number; minute: number } {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(d)
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]))
  // hour12: false returns 24 as midnight
  return { hour: p.hour === 24 ? 0 : (p.hour ?? 0), minute: p.minute ?? 0 }
}

/** Get the date string "YYYY-MM-DD" for a UTC date in a given timezone */
export function getLocalDateStr(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/**
 * Convert local date+time in a given timezone to a UTC Date.
 * Uses a two-pass offset correction without any external library.
 *
 * Example: localTimeToUtc(someDate, 10, 0, "America/Argentina/Buenos_Aires")
 *   → Date representing 13:00 UTC (Buenos Aires UTC-3)
 */
export function localTimeToUtc(
  localDay: Date,  // any Date whose local-TZ date we want
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const dateStr = getLocalDateStr(localDay, timezone)

  // Step 1: treat the local time naively as UTC (initial estimate)
  const guessMs = Date.UTC(
    parseInt(dateStr.slice(0, 4), 10),
    parseInt(dateStr.slice(5, 7), 10) - 1,
    parseInt(dateStr.slice(8, 10), 10),
    hour, minute, 0,
  )

  // Step 2: see what local time this UTC value appears as in the target timezone
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(new Date(guessMs))

  const p = Object.fromEntries(
    parts.filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]),
  )
  const guessLocalMs = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, 0)

  // Step 3: compute offset and correct
  const targetMs = guessMs
  const diff = guessLocalMs - targetMs
  return new Date(guessMs - diff)
}

/** Get the UTC Date for the start of a day in a given timezone */
export function startOfDayInTz(date: Date, timezone: string): Date {
  return localTimeToUtc(date, 0, 0, timezone)
}

/** Get the UTC Date for the end of a day in a given timezone */
export function endOfDayInTz(date: Date, timezone: string): Date {
  return localTimeToUtc(date, 23, 59, timezone)
}

/** Check if two UTC dates are on the same local day in a timezone */
export function isSameLocalDay(a: Date | string, b: Date | string, timezone: string): boolean {
  return getLocalDateStr(a, timezone) === getLocalDateStr(b, timezone)
}

/** HH:MM string from UTC date in timezone */
export function formatLocalTime(date: Date | string, timezone: string): string {
  const { hour, minute } = getLocalHourMinute(date, timezone)
  return `${pad(hour)}:${pad(minute)}`
}

/** Advance a Date by N days (UTC), keeping it a Date */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

/** Start of UTC week (Monday) containing the given date, in a timezone */
export function startOfWeekInTz(date: Date, timezone: string): Date {
  const dayStr = getLocalDateStr(date, timezone)
  const localDate = new Date(dayStr + 'T12:00:00Z') // midday to avoid DST edge cases
  // getDay() is browser local, so use Intl to get the local weekday
  const weekdayStr = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(dayStr + 'T12:00:00Z'))
  const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  const offset = weekdayMap[weekdayStr] ?? 0
  return startOfDayInTz(new Date(localDate.getTime() - offset * 86_400_000), timezone)
}

/** Get start of the month for a given date in timezone */
export function startOfMonthInTz(date: Date, timezone: string): Date {
  const dateStr = getLocalDateStr(date, timezone)
  const year = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(5, 7), 10)
  return localTimeToUtc(new Date(`${year}-${pad(month)}-01T12:00:00Z`), 0, 0, timezone)
}

/** Number of days in a month, given a date in timezone */
export function daysInMonth(date: Date, timezone: string): number {
  const dateStr = getLocalDateStr(date, timezone)
  const year = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(5, 7), 10)
  return new Date(year, month, 0).getDate()
}
