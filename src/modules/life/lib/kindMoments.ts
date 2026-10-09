// Momentos amables de Life OS (V1 · etapa 12): "Qué bueno verte de vuelta" después de 3 días o más sin entrar,
// "nuevos comienzos" el primer día de la semana y del mes, y el progreso del mes comparado con uno mismo.
// Las funciones de fechas son puras (las prueba tests/unit/kindMoments.test.ts); lo guardado vive en este dispositivo.

/** Días sin entrar a partir de los cuales se da la bienvenida (sin mostrar rachas perdidas). */
export const RETURN_AFTER_DAYS = 3

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** Días entre dos fechas locales YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)
}

export function isReturning(lastSeen: string | null, today: string): boolean {
  return !!lastSeen && daysBetween(lastSeen, today) >= RETURN_AFTER_DAYS
}

/** "Nuevos comienzos": el día 1 del mes (gana si coincide) o el primer día de la semana de la persona. */
export function freshStartOf(today: string, weekStart: 0 | 1): 'month' | 'week' | null {
  const d = parse(today)
  if (d.getDate() === 1) return 'month'
  if (d.getDay() === weekStart) return 'week'
  return null
}

/**
 * Días de este mes (hasta hoy) con al menos un hábito cumplido, y cuántos más que en el mismo tramo del mes pasado
 * (del 1 al mismo número de día). Si fueron menos, `more` es 0: nunca se muestra una comparación en contra.
 */
export function monthHabitDays(doneDates: Iterable<string>, today: string): { days: number; more: number } {
  const t = parse(today)
  const thisMonth = today.slice(0, 7)
  const prev = new Date(t.getFullYear(), t.getMonth() - 1, 1, 12)
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  const day = t.getDate()
  const now = new Set<string>()
  const before = new Set<string>()
  for (const d of doneDates) {
    if (d.slice(0, 7) === thisMonth && d <= today) now.add(d)
    else if (d.slice(0, 7) === prevMonth && Number(d.slice(8, 10)) <= day) before.add(d)
  }
  return { days: now.size, more: Math.max(0, now.size - before.size) }
}

// ── Lo guardado en el dispositivo ─────────────────────────────────────────────

const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

const seenKey = (uid: string) => `mycen.life.seen.${uid}`
const welcomeKey = (uid: string) => `mycen.life.welcome.${uid}`
const freshKey = (uid: string) => `mycen.life.fresh.${uid}`

/**
 * Anota la visita de hoy (una vez por persona y día) y devuelve si corresponde dar la bienvenida. Si la persona
 * volvió después de 3 días o más, la bienvenida queda marcada para todo el día hasta que la cierre.
 */
export function registerVisit(uid: string, today: string): boolean {
  const last = get(seenKey(uid))
  if (last !== today) {
    if (isReturning(last, today)) set(welcomeKey(uid), today)
    set(seenKey(uid), today)
  }
  return get(welcomeKey(uid)) === today
}

export function dismissWelcome(uid: string) { set(welcomeKey(uid), 'closed') }

export const freshDismissed = (uid: string, today: string) => get(freshKey(uid)) === today
export function dismissFresh(uid: string, today: string) { set(freshKey(uid), today) }
