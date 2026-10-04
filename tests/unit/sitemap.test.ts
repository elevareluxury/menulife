import { readFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { buildSitemap } from '../../api/sitemap'

// /sitemap.xml (Lanzamiento L2): páginas fijas + lo público que devuelve public_sitemap.

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
})
afterEach(() => vi.unstubAllGlobals())

describe('sitemap', () => {
  it('lista las páginas fijas y las públicas, con fecha', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { path: '/ana', lastmod: '2026-10-01T12:00:00Z' },
      { path: '/ana/estudio', lastmod: '2026-10-02T12:00:00Z' },
      { path: '/ana/projects/cafe-luna', lastmod: null },
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handler(new Request('https://mycen.id/api/sitemap'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<loc>https://mycen.id/</loc>')
    expect(xml).toContain('<loc>https://mycen.id/terminos</loc>')
    expect(xml).toContain('<url><loc>https://mycen.id/ana</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></url>')
    expect(xml).toContain('<loc>https://mycen.id/ana/estudio</loc>')
    expect(xml).toContain('<url><loc>https://mycen.id/ana/projects/cafe-luna</loc></url>')
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('/rpc/public_sitemap')
  })

  it('si la base falla, igual responde con las páginas fijas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('caída') }))
    const xml = await (await handler(new Request('https://mycen.id/api/sitemap'))).text()
    expect(xml).toContain('<loc>https://mycen.id/</loc>')
    expect(xml.match(/<url>/g)).toHaveLength(3)
  })

  it('descarta direcciones raras y escapa el XML', () => {
    const xml = buildSitemap('https://mycen.id', [
      { path: '/ana', lastmod: 'no-es-fecha' },
      { path: '/<script>', lastmod: null },
      { path: 'https://otro.com/x', lastmod: null },
      { path: '/ana/projects/a&b', lastmod: null },
    ])
    expect(xml).toContain('<url><loc>https://mycen.id/ana</loc></url>')
    expect(xml).not.toContain('script')
    expect(xml).not.toContain('otro.com')
    expect(xml).not.toContain('a&b')
  })
  it('robots.txt no bloquea usernames que empiezan como una ruta privada (ej. /lifestyle)', () => {
    const robots = readFileSync(join(__dirname, '..', '..', 'public', 'robots.txt'), 'utf8')
    const rules = robots.split('\n').filter(l => l.startsWith('Disallow:')).map(l => l.slice('Disallow:'.length).trim())
    expect(rules.length).toBeGreaterThan(0)
    for (const r of rules) expect(r, r).toMatch(/\/$|\$$/)
    expect(robots).toContain('Sitemap: https://mycen.id/sitemap.xml')
  })
})
