// Módulo "Eventos" (ticketera para productoras): reglas puras que comparten la página pública y Studio.
// Cada evento tiene portada (flyer), título, fecha y hora, lugar, una etiqueta corta, la descripción que se lee al
// entrar al evento y el link de entradas. Un evento con fecha pasada se oculta solo (con la fecha de quien mira).
import { safeHref } from './safeUrl'

export interface EventItem {
  /** Id corto y estable: la ficha del evento se abre con ?evento=<id> */
  id: string
  image_url?: string
  title?: string
  /** AAAA-MM-DD */
  date?: string
  /** HH:MM */
  time?: string
  venue?: string
  /** Género, edad o lo que la productora quiera destacar ("Techno · +18") */
  tag?: string
  description?: string
  /** Link de entradas */
  url?: string
  en?: { title?: string; description?: string }
}

export const EVENTS_MAX = 20
export const EVENT_TITLE_MAX = 80
export const EVENT_VENUE_MAX = 80
export const EVENT_TAG_MAX = 30
export const EVENT_DESCRIPTION_MAX = 1500
const ID_RE = /^[a-z0-9]{4,16}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const str = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined
  const s = v.trim().slice(0, max)
  return s || undefined
}

export const validEventId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v)

/** Lo guardado, vuelto a validar (la página no confía en lo que llega): sin id válido o sin portada ni título, afuera */
export function readEvents(raw: unknown): EventItem[] {
  if (!Array.isArray(raw)) return []
  const out: EventItem[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const r = x as Record<string, unknown>
    if (!validEventId(r.id) || seen.has(r.id)) continue
    const image = typeof r.image_url === 'string' ? safeHref(r.image_url) ?? undefined : undefined
    const title = str(r.title, EVENT_TITLE_MAX)
    if (!image && !title) continue
    seen.add(r.id)
    const en = r.en && typeof r.en === 'object' ? r.en as Record<string, unknown> : null
    const enTitle = en ? str(en.title, EVENT_TITLE_MAX) : undefined
    const enDescription = en ? str(en.description, EVENT_DESCRIPTION_MAX) : undefined
    out.push(Object.fromEntries(Object.entries({
      id: r.id,
      image_url: image && /^https:/.test(image) ? image : undefined,
      title,
      date: typeof r.date === 'string' && DATE_RE.test(r.date) ? r.date : undefined,
      time: typeof r.time === 'string' && TIME_RE.test(r.time) ? r.time : undefined,
      venue: str(r.venue, EVENT_VENUE_MAX),
      tag: str(r.tag, EVENT_TAG_MAX),
      description: str(r.description, EVENT_DESCRIPTION_MAX),
      url: typeof r.url === 'string' ? safeHref(r.url) ?? undefined : undefined,
      en: enTitle || enDescription ? { title: enTitle, description: enDescription } : undefined,
    }).filter(([, v]) => v !== undefined)) as unknown as EventItem)
    if (out.length >= EVENTS_MAX) break
  }
  return out
}

/** Fecha local de hoy (AAAA-MM-DD) de quien mira */
export function localToday(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Ya pasó: su fecha es anterior a hoy (el mismo día sigue visible hasta la medianoche). Sin fecha, nunca. */
export const eventIsPast = (e: Pick<EventItem, 'date'>, today: string): boolean => !!e.date && e.date < today

/** Los que se muestran: los que no pasaron, en el orden del dueño */
export const upcomingEvents = (items: EventItem[], today: string): EventItem[] => items.filter(e => !eventIsPast(e, today))

/** Proporción del flyer (ancho / alto) para dibujarlo entero: entre 9:16 (historia) y 1:1 */
export const posterRatio = (w: number, h: number): number => (w > 0 && h > 0 ? Math.min(1, Math.max(0.5625, w / h)) : 0.8)

/** Link a la ficha de un evento: la misma página con ?evento=<id> (conserva los demás parámetros) */
export function eventHref(current: string, id: string | null): string {
  const u = new URL(current)
  if (id) u.searchParams.set('evento', id)
  else u.searchParams.delete('evento')
  return u.pathname + u.search + u.hash
}
