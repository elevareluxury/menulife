import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { buildFeed, rrule, type FeedTask } from '../../api/calendar'

// /cal/<token>.ics (Life OS, V1.1): tareas pendientes para suscribirse desde el calendario del celular.

const TOKEN = 'a'.repeat(64)
const task = (over: Partial<FeedTask> = {}): FeedTask => ({
  id: 't1', title: 'Dentista', due_date: '2026-10-20', due_time: '10:30:00', remind_minutes: 15, recurrence: null, ...over,
})

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

describe('calendario', () => {
  it('arma eventos con hora local, todo el día, aviso y repetición', () => {
    const ics = buildFeed([
      task(),
      task({ id: 't2', title: 'Pagar luz; gas, agua', due_time: null, remind_minutes: null, recurrence: { freq: 'monthly', monthday: 31 } }),
    ], 'Mycen', new Date('2026-10-15T12:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261020T103000\r\nDURATION:PT30M')
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021')
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1')
    expect(ics).toContain('SUMMARY:Pagar luz\\; gas\\, agua')
    expect(ics).toContain('UID:t1@mycen.id')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('traduce cada repetición de Mycen', () => {
    expect(rrule({ freq: 'daily' }, '2026-10-20')).toBe('FREQ=DAILY')
    expect(rrule({ freq: 'interval', interval: 3 }, '2026-10-20')).toBe('FREQ=DAILY;INTERVAL=3')
    expect(rrule({ freq: 'weekly', interval: 2, weekdays: [1, 3] }, '2026-10-20')).toBe('FREQ=WEEKLY;INTERVAL=2;WKST=MO;BYDAY=MO,WE')
    expect(rrule({ freq: 'monthly' }, '2026-10-15')).toBe('FREQ=MONTHLY;BYMONTHDAY=15')
    expect(rrule({ freq: 'monthly', monthday: 30 }, '2026-10-15')).toBe('FREQ=MONTHLY;BYMONTHDAY=28,29,30;BYSETPOS=-1')
    expect(rrule(null, '2026-10-15')).toBeNull()
  })

  it('corta líneas largas sin partir caracteres', () => {
    const ics = buildFeed([task({ title: 'á'.repeat(100) })], 'Mycen')
    const lines = ics.split('\r\n')
    expect(lines.every(l => new TextEncoder().encode(l).length <= 75)).toBe(true)
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'á'.repeat(100)}`)
  })

  it('el link pide la RPC con el token y responde un calendario', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([task()]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler(new Request(`https://mycen.id/api/calendar?f=${TOKEN}.ics`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    expect(await res.text()).toContain('SUMMARY:Dentista')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/rpc/life_calendar_feed')
    expect(JSON.parse(String(init.body))).toEqual({ p_token: TOKEN })
  })

  it('un link con forma rara ni consulta la base', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const f of ['abc.ics', `${'g'.repeat(64)}.ics`, `${TOKEN}x`]) {
      expect((await handler(new Request(`https://mycen.id/api/calendar?f=${f}`))).status).toBe(404)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
