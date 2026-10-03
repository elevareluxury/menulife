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

  it('sirve a los buscadores el contenido publicado, sin links peligrosos', async () => {
    mockRpc({
      username: 'ana', display_name: 'Ana', descriptor: 'Diseño', bio: 'Hago marcas', avatar_url: null, cover_url: null,
      purpose: 'professional', status: 'published', visibility: 'public',
      modules: [
        { type: 'link', title: 'Portfolio', content: { url: 'https://ana.design' } },
        { type: 'link', title: 'Malo', content: { url: 'javascript:alert(1)' } },
        { type: 'social', title: null, content: { url: 'https://instagram.com/ana', network: 'instagram' } },
        { type: 'text', title: 'Sobre mí', content: { body: '</script><b>hola</b>' } },
      ],
    })
    const html = await (await handler(req('ana'))).text()
    expect(html).toContain('<h1>Ana</h1>')
    expect(html).toContain('<a href="https://ana.design" rel="me noopener">Portfolio</a>')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('&lt;/script&gt;&lt;b&gt;hola&lt;/b&gt;')
    const ld = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)?.[1] ?? ''
    expect(JSON.parse(ld)).toMatchObject({ '@type': 'Person', name: 'Ana', sameAs: ['https://instagram.com/ana'] })
    expect(html).not.toContain('noindex')
  })

  it('marca noindex un Space no listado', async () => {
    mockRpc({ username: 'ana', display_name: 'Ana', descriptor: null, bio: null, avatar_url: null, cover_url: null, status: 'published', visibility: 'unlisted', modules: [] })
    expect(await (await handler(req('ana'))).text()).toContain('<meta name="robots" content="noindex">')
  })
})
