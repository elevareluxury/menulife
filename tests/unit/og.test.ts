import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/og'

// Vista previa para WhatsApp/Facebook/buscadores (api/og.ts, Vercel Edge).

const req = (slug: string) => new Request(`https://mycen.id/api/og?slug=${encodeURIComponent(slug)}`)

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

function mockRpc(body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api/og', () => {
  it('arma título, descripción e imagen escapados desde el perfil publicado', async () => {
    mockRpc({ username: 'ana', display_name: 'Ana <Pérez>', descriptor: 'Diseño & marca', bio: 'Hola "mundo"', avatar_url: null, cover_url: 'https://cdn/x.jpg', status: 'published' })
    const html = await (await handler(req('ana'))).text()
    expect(html).toContain('<title>Ana &lt;Pérez&gt; · Diseño &amp; marca</title>')
    expect(html).toContain('content="Hola &quot;mundo&quot;"')
    expect(html).toContain('<meta property="og:image" content="https://cdn/x.jpg">')
    expect(html).toContain('<link rel="canonical" href="https://mycen.id/ana">')
  })

  it('redirige (301) un username anterior', async () => {
    mockRpc({ redirect: 'ana-studio' })
    const res = await handler(req('ana'))
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://mycen.id/ana-studio')
  })

  it('no expone perfiles sin publicar ni consulta usernames reservados', async () => {
    mockRpc({ status: 'unavailable' })
    expect(await (await handler(req('ana'))).text()).toContain('<title>Mycen</title>')

    const fetchMock = mockRpc({})
    expect(await (await handler(req('studio'))).text()).toContain('<title>Mycen</title>')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
