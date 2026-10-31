import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/health'

// /api/health: lo que mira el monitor externo para avisar si la web o la base se caen.
beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

describe('api/health', () => {
  it('200 cuando la base responde, sin caché', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toMatchObject({ ok: true, db: 'ok' })
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('/rpc/get_site_flags')
  })

  it('503 cuando la base falla o no contesta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    expect((await handler()).status).toBe(503)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    const res = await handler()
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ ok: false, db: 'down' })
  })
})

describe('api/health?deep=1 (Estado del sistema)', () => {
  const JWT = 'Bearer aaa.bbb.ccc'
  const req = (q: string, auth?: string) =>
    new Request(`https://mycen.id/api/health${q}`, { headers: auth ? { authorization: auth } : {} })

  it('devuelve la versión publicada', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abcdef1234567'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    expect(await (await handler(req(''))).json()).toMatchObject({ release: 'abcdef1' })
    delete process.env.VERCEL_GIT_COMMIT_SHA
  })

  it('sin sesión de super-admin no prueba nada (403)', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response('{}', { status: String(url).includes('admin_pending_counts') ? 401 : 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await handler(req('?deep=1'))).status).toBe(403)
    const res = await handler(req('?deep=1', JWT))
    expect(res.status).toBe(403)
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('sitemap'))).toBe(false)
  })

  it('con super-admin prueba vista previa, imagen, sitemap, video, portadas y calendario', async () => {
    const seen: { url: string; ua: string | null }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      seen.push({ url: u, ua: new Headers(init?.headers).get('user-agent') })
      if (u.includes('/api/og/')) return new Response('png', { status: 200, headers: { 'content-type': 'image/png' } })
      if (u.endsWith('/ana')) return new Response('<meta property="og:title" content="Ana">', { status: 200 })
      if (u.endsWith('/sitemap.xml')) return new Response('<urlset><url><loc>a</loc></url><url><loc>b</loc></url></urlset>', { status: 200 })
      if (u.includes('/api/media-cover')) return new Response('img', { status: 200, headers: { 'content-type': 'image/webp' } })
      if (u.includes('/cal/')) return new Response('Not found', { status: 404 })
      if (u.includes('youtube-latest')) return new Response('{}', { status: 502 })
      return new Response('{}', { status: 200 })
    }))
    const res = await handler(req('?deep=1&u=Ana', JWT))
    expect(res.status).toBe(200)
    const body = await res.json() as { checks: { id: string; ok: boolean; count?: number }[] }
    const by = Object.fromEntries(body.checks.map(c => [c.id, c]))
    expect(by.og.ok).toBe(true)
    expect(by.og_image.ok).toBe(true)
    expect(by.sitemap).toMatchObject({ ok: true, count: 2 })
    expect(by.media_cover.ok).toBe(true)
    expect(by.calendar.ok).toBe(true)
    expect(by.youtube_latest.ok).toBe(false)
    expect(seen.find(s => s.url === 'https://mycen.id/ana')?.ua).toMatch(/WhatsApp/)
  })

  it('un usuario inválido no se usa para armar direcciones', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { urls.push(String(url)); return new Response('{}', { status: 200 }) }))
    const body = await (await handler(req('?deep=1&u=../../etc', JWT))).json() as { checks: { id: string }[] }
    expect(body.checks.map(c => c.id)).not.toContain('og')
    expect(urls.some(u => u.includes('etc'))).toBe(false)
  })
})
