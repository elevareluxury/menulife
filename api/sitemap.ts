// /sitemap.xml para buscadores (Lanzamiento L2). Lista las páginas fijas y lo público de verdad, que devuelve la RPC
// public_sitemap: Spaces publicados y públicos (no los "no listados" ni privados, ni suspendidos) y sus proyectos.
// vercel.json manda /sitemap.xml acá. Si la base no responde, igual devuelve las páginas fijas.

import { APP_LANGS } from '../src/i18n/app/languages'

export const config = { runtime: 'edge' }

const STATIC_PATHS = ['/', '/terminos', '/privacidad', '/soporte', '/eliminar-cuenta']
/** La landing en cada idioma (`?lang=xx`, el español sin parámetro): la misma regla que `landingUrl` */
const landingPath = (lang: string) => (lang === 'es' ? '/' : `/?lang=${lang}`)
/** Límite de URLs por sitemap (protocolo sitemaps.org) */
const MAX_URLS = 50000

interface Row { path: string; lastmod: string | null }

function xmlEscape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/** Sólo direcciones internas con la forma de un perfil, Space o proyecto */
const SAFE_PATH = /^\/[a-z0-9][a-z0-9_-]{0,62}(\/[a-z0-9][a-z0-9-]{0,39}|\/projects\/[a-z0-9][a-z0-9-]{0,79})?$/

export function buildSitemap(origin: string, rows: Row[]): string {
  const urls = [
    ...STATIC_PATHS.map(path => ({ path, lastmod: null as string | null })),
    ...rows.filter(r => SAFE_PATH.test(r.path)),
  ].slice(0, MAX_URLS)
  // La landing en los 12 idiomas, cada una con sus versiones (hreflang) para que el buscador muestre la de cada país
  const alternates = [...APP_LANGS.map(l => [l, landingPath(l)]), ['x-default', '/']]
    .map(([l, path]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(origin + path)}"/>`).join('')
  const landing = APP_LANGS.map(l => `<url><loc>${xmlEscape(origin + landingPath(l))}</loc>${alternates}</url>`)
  const body = [...landing, ...urls.filter(u => u.path !== '/').map(u => {
    const lastmod = u.lastmod && !Number.isNaN(Date.parse(u.lastmod)) ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''
    return `<url><loc>${xmlEscape(origin + u.path)}</loc>${lastmod}</url>`
  })].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY

  let rows: Row[] = []
  let failed = false
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/public_sitemap`, {
        method: 'POST',
        headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_offset: 0, p_limit: MAX_URLS - STATIC_PATHS.length - APP_LANGS.length }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) rows = ((await res.json()) as Row[] | null) ?? []
      else failed = true
    } catch { failed = true }
  }
  // Sin base, 503 y sin caché: un sitemap vacío guardado en la CDN le diría a Google que no hay perfiles por un día
  if (failed) {
    return new Response('Service unavailable', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '120' } })
  }

  return new Response(buildSitemap(origin, rows), {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
