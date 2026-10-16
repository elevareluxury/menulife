import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { safeHref } from '@/modules/profile/lib/safeUrl'
import { buildVCard } from '@/modules/profile/lib/vcard'
import { csvCell } from '@/modules/life/lib/lifeData'
import { replyLinks } from '@/modules/studio/lib/useUnreadMessages'
import { buildFeed } from '../../api/calendar'
import ogHandler, { ogAvatar } from '../../api/og/[slug]'

// Auditoría web V2 (docs/seguridad/auditoria-v2-web.md): cada arreglo con su prueba.

describe('safeHref: trucos con mayúsculas, espacios y barras', () => {
  it.each([
    ['JaVaScRiPt:alert(1)'], ['\tjavascript:alert(1)'], ['\u0000javascript:alert(1)'], ['java\tscript:alert(1)'],
    ['java\nscript:alert(1)'], ['  vbscript:msgbox(1)'], ['DATA:text/html;base64,PHNjcmlwdD4='], ['/\\evil.com'],
    ['//evil.com/x'], ['javascript://evil.com/%0aalert(1)'],
  ])('bloquea %j', raw => {
    expect(safeHref(raw)).toBeNull()
  })

  it('sigue aceptando rutas internas y links normales', () => {
    expect(safeHref('/r/ana')).toBe('/r/ana')
    expect(safeHref('HTTPS://ana.design')).toBe('HTTPS://ana.design')
  })
})

describe('vCard y calendario: un retorno suelto no abre otro campo', () => {
  it('vCard', () => {
    const vcf = buildVCard({ username: 'ana', name: 'Ana\rEMAIL:otro@evil.com', title: 'a\r\nb' } as never, 'https://mycen.id/ana')
    const lines = vcf.split(/\r\n|\r|\n/)
    expect(lines.filter(l => l.startsWith('EMAIL'))).toEqual([])
    expect(vcf).toContain('FN:Ana\\nEMAIL:otro@evil.com')
  })

  it('calendario', () => {
    const ics = buildFeed([{ id: 't1', title: 'Pagar\rATTACH:https://evil.com/x', due_date: '2026-11-02', due_time: null, remind_minutes: null, recurrence: null }], 'Mycen')
    expect(ics.split(/\r\n|\r|\n/).filter(l => l.startsWith('ATTACH'))).toEqual([])
  })
})

describe('CSV de Dinero: sin fórmulas', () => {
  it.each([['=HYPERLINK("https://evil.com","x")'], ['+1+1'], ['-2+3'], ['@SUM(A1)'], ['\tx']])('neutraliza %j', v => {
    expect(csvCell(v).replace(/^"/, '')).toMatch(/^'/)
  })
  it('deja números, fechas y textos comunes como estaban', () => {
    expect(csvCell(1500.5)).toBe('1500.5')
    expect(csvCell('2026-10-01')).toBe('2026-10-01')
    expect(csvCell('Súper, carnicería')).toBe('"Súper, carnicería"')
  })
})

describe('Responder un mensaje por mail', () => {
  it('no arma un mailto con copias ni texto agregado', () => {
    expect(replyLinks('ana@example.com?bcc=otro@evil.com&body=hola').email).toBeNull()
    expect(replyLinks('ana@example.com,otro@evil.com').email).toBeNull()
    expect(replyLinks("o'brien@example.com").email).toBe("mailto:o'brien@example.com")
    expect(replyLinks('ana.perez+mycen@example.com').email).toBe('mailto:ana.perez+mycen@example.com')
  })
})

describe('Imagen al compartir: sólo fotos subidas a Mycen (sin SSRF)', () => {
  const base = 'https://test.supabase.co'
  afterEach(() => vi.unstubAllGlobals())

  it('acepta el almacenamiento público de Supabase y nada más', () => {
    const ok = `${base}/storage/v1/object/public/profile-media/u1/avatar.webp`
    expect(ogAvatar(ok, base)).toBe(ok)
    for (const bad of [
      'https://evil.com/storage/v1/object/public/x.png', 'http://test.supabase.co/storage/v1/object/public/x.png',
      `${base}/rest/v1/profiles`, 'https://test.supabase.co.evil.com/storage/v1/object/public/x.png',
      'https://user:pw@test.supabase.co/storage/v1/object/public/x.png', 'http://169.254.169.254/latest/meta-data', 'nada', null,
    ]) expect(ogAvatar(bad, base), String(bad)).toBeNull()
  })

  it('la función nunca pide una foto de otro sitio', async () => {
    process.env.VITE_SUPABASE_URL = base
    process.env.VITE_SUPABASE_ANON_KEY = 'test'
    const fetchMock = vi.fn(async (u: string | URL | Request) => {
      const url = String(u)
      if (url.includes('/fonts/og/')) return new Response(readFileSync(join(__dirname, '../../public', new URL(url).pathname)))
      return new Response(JSON.stringify({ id: 'p1', username: 'ana', display_name: 'Ana', descriptor: null, avatar_url: 'https://evil.example/x.png', status: 'published' }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await ogHandler(new Request('https://mycen.id/api/og/ana'))
    expect(res.status).toBe(200)
    expect(fetchMock.mock.calls.map(c => String(c[0])).some(u => u.includes('evil.example'))).toBe(false)
  }, 30000)
})

describe('vercel.json: encabezados de seguridad', () => {
  const config = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  const all = Object.fromEntries(config.headers.find(h => h.source === '/(.*)')!.headers.map(h => [h.key, h.value]))

  it('limita los iframes a los reproductores de la lista cerrada', () => {
    const csp = all['Content-Security-Policy']
    for (const d of ["object-src 'none'", "frame-ancestors 'self'", "base-uri 'self'"]) expect(csp).toContain(d)
    const frames = csp.split(';').map(s => s.trim()).find(s => s.startsWith('frame-src'))!.split(/\s+/).slice(1)
    expect(frames.sort()).toEqual([
      "'self'", 'https://open.spotify.com', 'https://player.vimeo.com', 'https://w.soundcloud.com', 'https://www.tiktok.com',
      'https://www.youtube-nocookie.com',
    ].sort())
  })

  it('el micrófono queda para Mycen ("Dictar"); cámara y ubicación, apagadas', () => {
    expect(all['Permissions-Policy']).toBe('camera=(), microphone=(self), geolocation=()')
    expect(all['X-Content-Type-Options']).toBe('nosniff')
    expect(all['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(all['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })
})
