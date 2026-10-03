// Vista previa al compartir (WhatsApp, Instagram, Facebook, X, LinkedIn, Telegram…).
// vercel.json manda acá sólo a los "previsualizadores" que piden /{username};
// las personas siguen viendo la app normal. Usa la misma RPC pública que la app,
// así que nunca expone datos que el perfil público no muestre.

export const config = { runtime: 'edge' }

interface PublicModule {
  type: string
  title: string | null
  content: Record<string, unknown> | null
}

interface PublicProfile {
  username: string
  display_name: string
  descriptor: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  purpose?: string | null
  status?: string
  visibility?: string
  modules?: PublicModule[]
}

const PERSON_PURPOSES = new Set(['personal', 'professional', 'creator', 'artist'])

const RESERVED = new Set([
  'dashboard', 'login', 'logout', 'register', 'signup', 'auth', 'forgot-password', 'reset-password',
  'solicitar-acceso', 'onboarding', 'life', 'portal', 'q', 'r', 'kitchen', 'mozo', 'waiter', 'delivery',
  'super-admin', 'superadmin', 'catalogo', 'catalog', 'studio', 'profile', 'profiles', 'exchange',
  'analytics', 'settings', 'business', 'hub', 'terminos', 'privacidad', 'api', 'app', 'www', 'admin',
])

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Sólo links http(s), mailto y tel (nunca javascript: ni data:). */
function safeLink(v: unknown): string | null {
  const s = str(v)
  return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : null
}

/**
 * Contenido real de la versión publicada para buscadores (Fase 3, P9): nombre, descripción, links,
 * textos y productos/servicios. Los previsualizadores (WhatsApp, Facebook…) sólo leen las metas.
 */
function profileBody(p: PublicProfile, url: string): { html: string; jsonLd: string } {
  const parts: string[] = [`<h1>${esc(p.display_name)}</h1>`]
  if (p.descriptor) parts.push(`<p>${esc(p.descriptor)}</p>`)
  if (p.bio) parts.push(`<p>${esc(p.bio)}</p>`)
  const links: string[] = []
  const sameAs: string[] = []
  for (const m of p.modules ?? []) {
    const c = m.content ?? {}
    const title = str(m.title)
    if (m.type === 'link' || m.type === 'featured_action' || m.type === 'social') {
      const href = safeLink(c.url)
      if (!href) continue
      links.push(`<li><a href="${esc(href)}" rel="me noopener">${esc(title || str(c.label) || str(c.network) || href)}</a></li>`)
      if (m.type === 'social' && /^https?:/i.test(href)) sameAs.push(href)
    } else if (m.type === 'text') {
      const body = str(c.body)
      if (title) parts.push(`<h2>${esc(title)}</h2>`)
      if (body) parts.push(`<p>${esc(body)}</p>`)
    } else if (m.type === 'product') {
      const name = str(c.name) || title
      if (name) parts.push(`<h2>${esc(name)}</h2>`)
      if (str(c.description)) parts.push(`<p>${esc(str(c.description))}</p>`)
    } else if (m.type === 'location') {
      const address = [str(c.address), str(c.city)].filter(Boolean).join(', ')
      if (address) parts.push(`<address>${esc(address)}</address>`)
    }
  }
  if (links.length) parts.push(`<ul>${links.join('')}</ul>`)
  parts.push(`<p><a href="${esc(url)}">${esc(url)}</a></p>`)
  const ld = {
    '@context': 'https://schema.org',
    '@type': PERSON_PURPOSES.has(p.purpose ?? '') ? 'Person' : 'Organization',
    name: p.display_name,
    description: p.descriptor ?? p.bio ?? undefined,
    url,
    image: p.avatar_url ?? p.cover_url ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }
  // JSON dentro de <script>: escapar "<" evita cerrar la etiqueta desde el contenido
  return { html: parts.join('\n'), jsonLd: JSON.stringify(ld).replace(/</g, '\\u003c') }
}

function page(origin: string, path: string, title: string, description: string, image: string | null,
  extra: { body?: string; jsonLd?: string; noindex?: boolean } = {}): Response {
  const url = `${origin}${path}`
  const img = image ?? `${origin}/web-app-manifest-512x512.png`
  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Mycen">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">${extra.noindex ? '\n<meta name="robots" content="noindex">' : ''}${extra.jsonLd ? `\n<script type="application/ld+json">${extra.jsonLd}</script>` : ''}
</head><body>${extra.body ?? `<a href="${esc(url)}">${esc(title)}</a>`}</body></html>`
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url)
  const origin = `${reqUrl.protocol}//${reqUrl.host}`
  const slug = (reqUrl.searchParams.get('slug') ?? '').toLowerCase().trim()
  const generic = () => page(origin, `/${slug}`, 'Mycen', 'Tu identidad digital, todo en un solo lugar.', null)

  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(slug) || RESERVED.has(slug)) return generic()

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return generic()

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_username: slug }),
    })
    if (!res.ok) return generic()
    const data = (await res.json()) as (PublicProfile & { redirect?: string }) | null
    if (!data) return generic()
    if (data.redirect) return Response.redirect(`${origin}/${data.redirect}`, 301)
    if (!data.display_name || data.status === 'unavailable' || data.status !== 'published') return generic()

    const title = data.descriptor ? `${data.display_name} · ${data.descriptor}` : data.display_name
    const description = (data.bio ?? data.descriptor ?? 'Mi identidad en Mycen.').slice(0, 200)
    const path = `/${data.username}`
    const { html, jsonLd } = profileBody(data, `${origin}${path}`)
    return page(origin, path, title, description, data.cover_url ?? data.avatar_url,
      { body: html, jsonLd, noindex: data.visibility === 'unlisted' })
  } catch {
    return generic()
  }
}
