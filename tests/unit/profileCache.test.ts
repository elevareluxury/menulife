import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { PROFILE_CDN_CACHE } from '../../api/profile'

// /api/profile: el perfil público desde la CDN (salida web). Pide la RPC como anónimo, la CDN la guarda 30 s, y no se
// puede esquivar la caché con parámetros de más ni guardar un error de la base.
beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
})
afterEach(() => vi.unstubAllGlobals())

const req = (q: string) => new Request(`https://mycen.id/api/profile${q}`)

describe('api/profile', () => {
  it('devuelve el perfil y lo deja en la CDN 30 s (el navegador no lo guarda)', async () => {
    const fetchMock = vi.fn(async () => new Response('{"id":"p1","display_name":"Ana"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler(req('?h=Ana'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ display_name: 'Ana' })
    expect(res.headers.get('cdn-cache-control')).toBe(PROFILE_CDN_CACHE)
    expect(res.headers.get('cache-control')).toContain('max-age=0')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://test.supabase.co/rest/v1/rpc/get_public_profile')
    // Siempre como visitante anónimo (nunca la vista del dueño) y con el handle en minúsculas
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer anon')
    expect(JSON.parse(String(init.body))).toEqual({ p_username: 'ana' })
  })

  it('acepta Spaces secundarios y usernames heredados', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('null', { status: 200 })))
    for (const q of ['?h=ana/estudio', '?h=cafe_luna', '?h=bar.centro']) expect((await handler(req(q))).status).toBe(200)
  })

  it('perfil que no existe: null, también cacheado (no se consulta la base en cada intento)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })))
    const res = await handler(req('?h=nadie'))
    expect(await res.text()).toBe('null')
    expect(res.headers.get('cdn-cache-control')).toBe(PROFILE_CDN_CACHE)
  })

  it('400 con parámetros de más o un handle raro (no se esquiva la caché)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const q of ['?h=ana&x=1', '?x=1', '', '?h=', '?h=../etc', '?h=a%20b', '?h=ana/estudio/otro']) {
      expect((await handler(req(q))).status).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('un error o un corte de la base no se guarda en la CDN', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    let res = await handler(req('?h=ana'))
    expect(res.status).toBe(502)
    expect(res.headers.get('cdn-cache-control')).toBe('no-store')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    res = await handler(req('?h=ana'))
    expect(res.status).toBe(502)
    expect(res.headers.get('cdn-cache-control')).toBe('no-store')
  })
})
