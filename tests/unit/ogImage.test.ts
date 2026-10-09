import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/og/[slug]'

// Imagen al compartir (V1 · etapa 08): cielo del tema, huella y nombre, desde la RPC pública.

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

function mock(profile: unknown) {
  const fetchMock = vi.fn(async (u: string | URL | Request) => {
    const url = String(u)
    if (url.includes('/fonts/og/')) return new Response(readFileSync(join(__dirname, '../../public', new URL(url).pathname)))
    return new Response(JSON.stringify(profile))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api/og/[slug]', () => {
  it('dibuja un PNG de 1200×630 para un perfil publicado, en los dos temas', async () => {
    for (const mode of ['universo', 'amanecer']) {
      const fetchMock = mock({ id: 'p-ana', username: 'ana', display_name: 'Ana Pérez', descriptor: 'Diseño', avatar_url: null, theme: { mode }, status: 'published' })
      const res = await handler(new Request('https://mycen.id/api/og/ana?space=estudio&v=1'))
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/png')
      const png = new Uint8Array(await res.arrayBuffer())
      const view = new DataView(png.buffer)
      expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630])
      // Pide el Space por su handle completo
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(JSON.parse(String(init.body))).toEqual({ p_username: 'ana/estudio' })
    }
  }, 30000)

  it('sin perfil publicado (o con un nombre inválido) manda a la imagen de marca', async () => {
    mock({ status: 'unavailable' })
    const res = await handler(new Request('https://mycen.id/api/og/ana'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://mycen.id/og-image.png')
    const fetchMock = mock({})
    expect((await handler(new Request('https://mycen.id/api/og/..%2Fx'))).status).toBe(302)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
