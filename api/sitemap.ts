// Sitemap para buscadores (Lanzamiento L2; en partes desde 20261206000001 para millones de perfiles).
//   /sitemap.xml            → índice: /sitemap-static.xml + una parte por cada bloque de Spaces o proyectos
//   /sitemap-static.xml     → la landing en los 12 idiomas (hreflang) y las páginas fijas
//   /sitemap-p-<id>.xml     → hasta SITEMAP_CHUNK Spaces públicos desde ese id (RPC public_sitemap_page)
//   /sitemap-j-<id>.xml     → lo mismo con proyectos
// Las partes viven en la raíz: un sitemap sólo puede listar direcciones de su carpeta. vercel.json las manda acá con
// ?kind=&from=. Si la base no responde, 503 sin caché (un sitemap vacío guardado en la CDN le diría a Google que no hay
// perfiles por un día); el índice igual lista la parte fija.

import { APP_LANGS } from '../src/i18n/app/languages'

export const config = { runtime: 'edge' }

const STATIC_PATHS = ['/', '/terminos', '/privacidad', '/soporte', '/eliminar-cuenta']
/** Direcciones por parte: igual a mycen_sitemap_chunk() en la base */
export const SITEMAP_CHUNK = 5000
/** Límite de URLs por sitemap (protocolo sitemaps.org) */
const MAX_URLS = 50000
/** La landing en cada idioma (`?lang=xx`, el español sin parámetro): la misma regla que `landingUrl` */
const landingPath = (lang: string) => (lang === 'es' ? '/' : `/?lang=${lang}`)

interface Row { path: string; lastmod: string | null }
export interface SitemapPart { kind: 'p' | 'j'; from: string; lastmod: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** Sólo direcciones internas con la forma de un perfil, Space o proyecto */
const SAFE_PATH = /^\/[a-z0-9][a-z0-9_-]{0,62}(\/[a-z0-9][a-z0-9-]{0,39}|\/projects\/[a-z0-9][a-z0-9-]{0,79})?$/

function xmlEscape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
const lastmodTag = (v: string | null) =>
  v && !Number.isNaN(Date.parse(v)) ? `<lastmod>${new Date(v).toISOString()}</lastmod>` : ''

const urlset = (body: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body.join('\n')}\n</urlset>\n`

/** La parte fija: la landing en los 12 idiomas, cada una con sus versiones (hreflang), y las páginas fijas */
export function buildStaticSitemap(origin: string): string {
  const alternates = [...APP_LANGS.map(l => [l, landingPath(l)]), ['x-default', '/']]
    .map(([l, path]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(origin + path)}"/>`).join('')
  const landing = APP_LANGS.map(l => `<url><loc>${xmlEscape(origin + landingPath(l))}</loc>${alternates}</url>`)
  const pages = STATIC_PATHS.filter(p => p !== '/').map(p => `<url><loc>${xmlEscape(origin + p)}</loc></url>`)
  return urlset([...landing, ...pages])
}

/** Una parte: Spaces o proyectos públicos */
export function buildPartSitemap(origin: string, rows: Row[]): string {
  return urlset(rows.filter(r => r && typeof r.path === 'string' && SAFE_PATH.test(r.path)).slice(0, MAX_URLS)
    .map(r => `<url><loc>${xmlEscape(origin + r.path)}</loc>${lastmodTag(r.lastmod)}</url>`))
}

/** El índice: la parte fija y una entrada por parte */
export function buildSitemapIndex(origin: string, parts: SitemapPart[]): string {
  const entries = [`<sitemap><loc>${xmlEscape(origin)}/sitemap-static.xml</loc></sitemap>`,
    ...parts.filter(p => (p.kind === 'p' || p.kind === 'j') && UUID.test(p.from)).slice(0, MAX_URLS - 1)
      .map(p => `<sitemap><loc>${xmlEscape(`${origin}/sitemap-${p.kind}-${p.from}.xml`)}</loc>${lastmodTag(p.lastmod)}</sitemap>`)]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`
}

const xml = (body: string) => new Response(body, {
  status: 200,
  headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
})
const unavailable = () =>
  new Response('Service unavailable', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '120' } })

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`rpc ${res.status}`)
  return res.json()
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  const kind = url.searchParams.get('kind')

  if (kind === 'static') return xml(buildStaticSitemap(origin))

  if (kind === 'p' || kind === 'j') {
    const from = (url.searchParams.get('from') ?? '').toLowerCase()
    if (!UUID.test(from)) return new Response('Not found', { status: 404 })
    try {
      const rows = await rpc('public_sitemap_page', { p_kind: kind, p_from: from })
      return xml(buildPartSitemap(origin, Array.isArray(rows) ? rows as Row[] : []))
    } catch { return unavailable() }
  }

  try {
    const parts = await rpc('public_sitemap_index', {})
    return xml(buildSitemapIndex(origin, Array.isArray(parts) ? parts as SitemapPart[] : []))
  } catch { return unavailable() }
}
