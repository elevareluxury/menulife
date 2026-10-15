// /cal/<token>.ics → calendario de tareas para suscribirse desde Google Calendar o el iPhone (Life OS, V1.1).
// vercel.json manda /cal/:file acá. Sin sesión: el link es el secreto (token de 64 caracteres); la RPC
// life_calendar_feed sólo devuelve tareas pendientes con fecha (sin notas). Horas "flotantes": el calendario las
// muestra en la zona de la persona, igual que en Mycen.

export const config = { runtime: 'edge' }

export interface FeedTask {
  id: string
  title: string
  due_date: string
  due_time: string | null
  remind_minutes: number | null
  recurrence: { freq: string; interval?: number; weekdays?: number[]; monthday?: number } | null
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** Líneas de hasta 75 bytes (RFC 5545), cortando sin partir caracteres. */
function fold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) { parts.push(cur); cur = '' }
    cur += ch
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

/** Repetición de Mycen → RRULE (mensual con "el último día si el mes no lo tiene", como en la app). */
export function rrule(r: FeedTask['recurrence'], dueDate: string): string | null {
  if (!r) return null
  const n = Number.isInteger(r.interval) && (r.interval ?? 1) > 1 ? r.interval! : 1
  const interval = n > 1 ? `;INTERVAL=${n}` : ''
  switch (r.freq) {
    case 'daily': return 'FREQ=DAILY'
    case 'interval': return `FREQ=DAILY${interval}`
    case 'weekly': {
      const days = (r.weekdays ?? []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
      return `FREQ=WEEKLY${interval};WKST=MO${days.length ? `;BYDAY=${days.map(d => DAYS[d]).join(',')}` : ''}`
    }
    case 'monthly': {
      const day = r.monthday ?? Number(dueDate.slice(8, 10))
      if (day <= 28) return `FREQ=MONTHLY;BYMONTHDAY=${day}`
      return `FREQ=MONTHLY;BYMONTHDAY=${Array.from({ length: day - 27 }, (_, i) => 28 + i).join(',')};BYSETPOS=-1`
    }
    default: return null
  }
}

const compact = (d: string) => d.replace(/-/g, '')
function nextDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  const n = new Date(Date.UTC(y, m - 1, day + 1))
  return `${n.getUTCFullYear()}${String(n.getUTCMonth() + 1).padStart(2, '0')}${String(n.getUTCDate()).padStart(2, '0')}`
}

export function buildFeed(tasks: FeedTask[], name: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mycen//Life OS//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
  ]
  for (const t of tasks) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.due_date)) continue
    lines.push('BEGIN:VEVENT', `UID:${t.id}@mycen.id`, `DTSTAMP:${stamp}`)
    const time = t.due_time?.match(/^(\d{2}):(\d{2})/)
    if (time) lines.push(`DTSTART:${compact(t.due_date)}T${time[1]}${time[2]}00`, 'DURATION:PT30M')
    else lines.push(`DTSTART;VALUE=DATE:${compact(t.due_date)}`, `DTEND;VALUE=DATE:${nextDay(t.due_date)}`)
    const rule = rrule(t.recurrence, t.due_date)
    if (rule) lines.push(`RRULE:${rule}`)
    lines.push(`SUMMARY:${esc(t.title)}`)
    if (t.remind_minutes != null && t.remind_minutes >= 0) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(t.title)}`, `TRIGGER:-PT${t.remind_minutes}M`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const token = (url.searchParams.get('f') ?? url.searchParams.get('t') ?? '').replace(/\.ics$/i, '')
  const notFound = () => new Response('Not found', { status: 404, headers: { 'x-robots-tag': 'noindex' } })
  if (!/^[a-f0-9]{64}$/.test(token)) return notFound()

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return new Response('Unavailable', { status: 503 })

  let tasks: FeedTask[]
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/life_calendar_feed`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    })
    if (!res.ok) return new Response('Unavailable', { status: 503 })
    tasks = ((await res.json()) as FeedTask[] | null) ?? []
  } catch {
    return new Response('Unavailable', { status: 503 })
  }

  return new Response(buildFeed(tasks, 'Mycen'), {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="mycen.ics"',
      'cache-control': 'private, max-age=900',
      'x-robots-tag': 'noindex',
    },
  })
}
