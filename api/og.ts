// Vista previa al compartir (WhatsApp, Instagram, Facebook, X, LinkedIn, Telegram…).
// vercel.json manda acá sólo a los "previsualizadores" que piden /{username};
// las personas siguen viendo la app normal. Usa la misma RPC pública que la app,
// así que nunca expone datos que el perfil público no muestre.

export const config = { runtime: 'edge' }

interface PublicModule {
  type: string
  title: string | null
  content: Record<string, unknown> | null
  /** project/portfolio: tarjetas de los proyectos publicados */
  projects?: { title?: string | null; summary?: string | null; path?: string }[]
}

interface PublicProject {
  title: string
  summary: string | null
  cover_url: string | null
  slug: string
  status?: string
  visibility?: string
  blocks?: { type: string; data: Record<string, unknown> | null }[]
  space?: { username: string; display_name: string | null; avatar_url: string | null; visibility?: string; default_locale?: string | null }
}

interface PublicProfile {
  /** Idioma en que el dueño escribe (va al <html lang>, Lanzamiento L2) */
  default_locale?: string | null
  username: string
  /** "ana" o "ana/estudio" (Space secundario, Fase 10) */
  handle?: string
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

/** Ruta interna de un proyecto: /{username}/projects/{slug} */
const PROJECT_PATH = /^\/[a-z0-9][a-z0-9_-]*\/projects\/[a-z0-9][a-z0-9-]*$/
const originOf = (url: string) => new URL(url).origin

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
    } else if (m.type === 'link_group' && Array.isArray(c.items)) {
      if (title) parts.push(`<h2>${esc(title)}</h2>`)
      for (const item of c.items as Record<string, unknown>[]) {
        const href = safeLink(item?.url)
        if (href && str(item.title)) links.push(`<li><a href="${esc(href)}" rel="noopener">${esc(str(item.title))}</a></li>`)
      }
    } else if (m.type === 'project' || m.type === 'portfolio') {
      for (const card of m.projects ?? []) {
        if (!card.path || !PROJECT_PATH.test(card.path)) continue
        links.push(`<li><a href="${esc(originOf(url) + card.path)}">${esc(str(card.title) || card.path)}</a>${str(card.summary) ? ` — ${esc(str(card.summary))}` : ''}</li>`)
      }
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

/** Contenido publicado de un proyecto para buscadores (Fase 5): título, resumen, textos y créditos. */
function projectBody(p: PublicProject, url: string, profileUrl: string, owner: string): { html: string; jsonLd: string } {
  const parts: string[] = [`<h1>${esc(p.title)}</h1>`]
  if (p.summary) parts.push(`<p>${esc(p.summary)}</p>`)
  const cover = safeLink(p.cover_url)
  if (cover && /^https:/i.test(cover)) parts.push(`<img src="${esc(cover)}" alt="${esc(p.title)}">`)
  for (const b of p.blocks ?? []) {
    const d = b.data ?? {}
    if (b.type === 'heading' && str(d.text)) parts.push(`<h2>${esc(str(d.text))}</h2>`)
    else if (b.type === 'paragraph' && str(d.text)) parts.push(`<p>${esc(str(d.text))}</p>`)
    else if (b.type === 'quote' && str(d.text)) parts.push(`<blockquote>${esc(str(d.text))}</blockquote>`)
    else if (b.type === 'image') {
      const src = safeLink(d.url)
      if (src && /^https:/i.test(src)) parts.push(`<img src="${esc(src)}" alt="${esc(str(d.alt) || str(d.caption))}">`)
    } else if (b.type === 'credits' && Array.isArray(d.items)) {
      const rows = (d.items as Record<string, unknown>[])
        .filter(i => i && (str(i.role) || str(i.name)))
        .map(i => `<dt>${esc(str(i.role))}</dt><dd>${esc(str(i.name))}</dd>`)
      if (rows.length) parts.push(`<dl>${rows.join('')}</dl>`)
    }
  }
  parts.push(`<p><a href="${esc(profileUrl)}">${esc(owner)}</a></p>`)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    description: p.summary ?? undefined,
    url,
    image: cover ?? undefined,
    author: { '@type': 'Person', name: owner, url: profileUrl },
  }
  return { html: parts.join('\n'), jsonLd: JSON.stringify(ld).replace(/</g, '\\u003c') }
}

/** Código de idioma seguro para <html lang> (ej. "es", "pt", "zh"); si no hay o no es válido, español */
function htmlLang(v: string | null | undefined): string {
  return v && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(v) ? v : 'es'
}

function page(origin: string, path: string, title: string, description: string, image: string | null,
  extra: { body?: string; jsonLd?: string; noindex?: boolean; type?: 'profile' | 'article'; lang?: string | null } = {}): Response {
  const url = `${origin}${path}`
  // Sin foto ni portada: la imagen de marca (1200×630)
  const img = image ?? `${origin}/og-image.png`
  const html = `<!doctype html>
<html lang="${htmlLang(extra.lang)}"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${extra.type ?? 'profile'}">
<meta property="og:site_name" content="Mycen">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
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

/** La app tal cual (index.html), para rutas que no son perfiles. */
async function spa(origin: string): Promise<Response> {
  try {
    const res = await fetch(`${origin}/index.html`)
    if (res.ok) {
      return new Response(await res.text(), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
  } catch { /* abajo */ }
  return Response.redirect(`${origin}/`, 302)
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url)
  const origin = `${reqUrl.protocol}//${reqUrl.host}`
  const slug = (reqUrl.searchParams.get('slug') ?? '').toLowerCase().trim()
  const projectSlug = reqUrl.searchParams.get('project')?.toLowerCase().trim() ?? null
  // Space secundario: /{username}/{space} (Fase 10)
  const space = reqUrl.searchParams.get('space')?.toLowerCase().trim() ?? null
  const handle = space ? `${slug}/${space}` : slug
  const generic = () => page(origin, `/${handle}`, 'Mycen', 'Tu identidad digital, todo en un solo lugar.', null)

  if (space !== null) {
    // Las rutas de la app con dos segmentos (/r/{menú}, /dashboard/…, /life/…) siguen siendo la app
    if (RESERVED.has(slug) || !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(slug)) return spa(origin)
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(space)) return generic()
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(slug) || RESERVED.has(slug)) return generic()

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return generic()

  if (projectSlug !== null) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(projectSlug)) return generic()
    return projectPage(origin, supabaseUrl, anonKey, slug, projectSlug, generic)
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_username: handle }),
    })
    if (!res.ok) return generic()
    const data = (await res.json()) as (PublicProfile & { redirect?: string }) | null
    if (!data) return generic()
    if (data.redirect) return Response.redirect(`${origin}/${data.redirect}`, 301)
    if (!data.display_name || data.status === 'unavailable' || data.status !== 'published') return generic()

    const title = data.descriptor ? `${data.display_name} · ${data.descriptor}` : data.display_name
    const description = (data.bio ?? data.descriptor ?? 'Mi identidad en Mycen.').slice(0, 200)
    const path = `/${data.handle ?? data.username}`
    const { html, jsonLd } = profileBody(data, `${origin}${path}`)
    return page(origin, path, title, description, data.cover_url ?? data.avatar_url,
      { body: html, jsonLd, noindex: data.visibility === 'unlisted', lang: data.default_locale })
  } catch {
    return generic()
  }
}

/** /{username}/projects/{slug} para previsualizadores y buscadores (Fase 5). */
async function projectPage(origin: string, supabaseUrl: string, anonKey: string, slug: string, projectSlug: string,
  generic: () => Response): Promise<Response> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_project`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_username: slug, p_slug: projectSlug }),
    })
    if (!res.ok) return generic()
    const data = (await res.json()) as (PublicProject & { redirect?: string }) | null
    if (!data) return generic()
    if (data.redirect) return Response.redirect(`${origin}/${data.redirect}/projects/${projectSlug}`, 301)
    if (!data.title || !data.space || data.status !== 'published') return generic()

    const owner = data.space.display_name || data.space.username
    const path = `/${data.space.username}/projects/${data.slug}`
    const { html, jsonLd } = projectBody(data, `${origin}${path}`, `${origin}/${data.space.username}`, owner)
    const description = (data.summary ?? `${data.title} · ${owner}`).slice(0, 200)
    return page(origin, path, `${data.title} · ${owner}`, description, data.cover_url, {
      body: html, jsonLd, type: 'article', lang: data.space.default_locale,
      noindex: data.visibility === 'unlisted' || data.space.visibility === 'unlisted',
    })
  } catch {
    return generic()
  }
}
