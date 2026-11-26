import { readFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { buildPartSitemap, buildSitemapIndex, buildStaticSitemap } from '../../api/sitemap'

// Sitemap en partes (Lanzamiento L2 → 20261206000001): /sitemap.xml es un índice; la parte fija y las de Spaces y
// proyectos se piden por separado (public_sitemap_index / public_sitemap_page).

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

const P1 = '11111111-0000-4000-8000-000000000001'
const J1 = '66666666-0000-4000-8000-000000000006'

describe('sitemap', () => {
  it('/sitemap.xml es un índice: la parte fija y una entrada por parte, con fecha', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { kind: 'p', from: P1, lastmod: '2026-10-01T12:00:00Z' },
      { kind: 'j', from: J1, lastmod: null },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler(new Request('https://mycen.id/api/sitemap'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<sitemap><loc>https://mycen.id/sitemap-static.xml</loc></sitemap>')
    expect(xml).toContain(`<sitemap><loc>https://mycen.id/sitemap-p-${P1}.xml</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></sitemap>`)
    expect(xml).toContain(`<sitemap><loc>https://mycen.id/sitemap-j-${J1}.xml</loc></sitemap>`)
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('/rpc/public_sitemap_index')
  })

  it('la parte fija: la landing en 12 idiomas con hreflang y las páginas fijas (sin ir a la base)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const xml = await (await handler(new Request('https://mycen.id/api/sitemap?kind=static'))).text()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(xml).toContain('<loc>https://mycen.id/</loc>')
    expect(xml).toContain('<loc>https://mycen.id/?lang=en</loc>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ja" href="https://mycen.id/?lang=ja"/>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://mycen.id/"/>')
    // La landing en 12 idiomas + 4 páginas fijas
    expect(xml.match(/<url>/g)).toHaveLength(16)
    expect(xml).toContain('<loc>https://mycen.id/terminos</loc>')
    expect(xml).toContain('<loc>https://mycen.id/eliminar-cuenta</loc>')
  })

  it('una parte lista sus Spaces o proyectos desde su id', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { path: '/ana', lastmod: '2026-10-01T12:00:00Z' },
      { path: '/ana/estudio', lastmod: '2026-10-02T12:00:00Z' },
      { path: '/ana/projects/cafe-luna', lastmod: null },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const xml = await (await handler(new Request(`https://mycen.id/api/sitemap?kind=p&from=${P1}`))).text()
    expect(xml).toContain('<url><loc>https://mycen.id/ana</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></url>')
    expect(xml).toContain('<loc>https://mycen.id/ana/estudio</loc>')
    expect(xml).toContain('<url><loc>https://mycen.id/ana/projects/cafe-luna</loc></url>')
    expect(xml).not.toContain('?lang=')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/rpc/public_sitemap_page')
    expect(JSON.parse(String(init.body))).toEqual({ p_kind: 'p', p_from: P1 })
  })

  it('una parte con un inicio que no es un id: 404 sin ir a la base', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const q of ['kind=p&from=ana', 'kind=j&from=', `kind=p&from=${P1}x`]) {
      expect((await handler(new Request(`https://mycen.id/api/sitemap?${q}`))).status, q).toBe(404)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('si la base falla, 503 sin caché (un sitemap vacío no queda guardado en la CDN)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('caída') }))
    for (const q of ['', `?kind=p&from=${P1}`]) {
      const res = await handler(new Request(`https://mycen.id/api/sitemap${q}`))
      expect(res.status).toBe(503)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('sin perfiles todavía, el índice igual lista la parte fija', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })))
    const xml = await (await handler(new Request('https://mycen.id/api/sitemap'))).text()
    expect(xml.match(/<sitemap>/g)).toHaveLength(1)
    expect(xml).toContain('https://mycen.id/sitemap-static.xml')
  })

  it('descarta direcciones y partes raras y escapa el XML', () => {
    const xml = buildPartSitemap('https://mycen.id', [
      { path: '/ana', lastmod: 'no-es-fecha' },
      { path: '/<script>', lastmod: null },
      { path: 'https://otro.com/x', lastmod: null },
      { path: '/ana/projects/a&b', lastmod: null },
    ])
    expect(xml).toContain('<url><loc>https://mycen.id/ana</loc></url>')
    expect(xml).not.toContain('script')
    expect(xml).not.toContain('otro.com')
    expect(xml).not.toContain('a&b')
    const idx = buildSitemapIndex('https://mycen.id', [
      { kind: 'p', from: '../x', lastmod: null },
      { kind: 'z' as 'p', from: P1, lastmod: null },
    ])
    expect(idx.match(/<sitemap>/g)).toHaveLength(1)
    expect(buildStaticSitemap('https://mycen.id')).not.toContain('sitemap-')
  })

  it('vercel.json manda cada parte a la función, y las partes no chocan con un username (llevan punto)', () => {
    const { rewrites } = JSON.parse(readFileSync(join(__dirname, '..', '..', 'vercel.json'), 'utf8')) as {
      rewrites: { source: string; destination: string }[]
    }
    const part = rewrites.find(r => r.destination.startsWith('/api/sitemap?kind=:kind'))!
    expect(part.source).toBe('/sitemap-:kind(p|j)-:from([0-9a-f-]{36}).xml')
    expect(rewrites.find(r => r.source === '/sitemap-static.xml')?.destination).toBe('/api/sitemap?kind=static')
    // Las partes van antes de la app (si no, devolvería index.html)
    const order = (pred: (r: { source: string; destination: string }) => boolean) => rewrites.findIndex(pred)
    expect(order(r => r === part)).toBeLessThan(order(r => r.destination === '/index.html'))
  })

  it('robots.txt no bloquea usernames que empiezan como una ruta privada (ej. /lifestyle)', () => {
    const robots = readFileSync(join(__dirname, '..', '..', 'public', 'robots.txt'), 'utf8')
    expect(robots).toMatch(/Allow: \/api\/og\/\nDisallow: \/api\//)
    const rules = robots.split('\n').filter(l => l.startsWith('Disallow:')).map(l => l.slice('Disallow:'.length).trim())
    expect(rules.length).toBeGreaterThan(0)
    for (const r of rules) expect(r, r).toMatch(/\/$|\$$/)
    expect(robots).toContain('Sitemap: https://mycen.id/sitemap.xml')
  })
})
