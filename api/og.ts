// Vista previa al compartir (WhatsApp, Instagram, Facebook, X, LinkedIn, Telegram…).
// vercel.json manda acá sólo a los "previsualizadores" que piden /{username};
// las personas siguen viendo la app normal. Usa la misma RPC pública que la app,
// así que nunca expone datos que el perfil público no muestre.

export const config = { runtime: 'edge' }

interface PublicProfile {
  username: string
  display_name: string
  descriptor: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  status?: string
}

const RESERVED = new Set([
  'dashboard', 'login', 'logout', 'register', 'signup', 'auth', 'forgot-password', 'reset-password',
  'solicitar-acceso', 'onboarding', 'life', 'portal', 'q', 'r', 'kitchen', 'mozo', 'waiter', 'delivery',
  'super-admin', 'superadmin', 'catalogo', 'catalog', 'studio', 'profile', 'profiles', 'exchange',
  'analytics', 'settings', 'business', 'hub', 'terminos', 'privacidad', 'api', 'app', 'www', 'admin',
])

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function page(origin: string, path: string, title: string, description: string, image: string | null): Response {
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
<meta name="twitter:image" content="${esc(img)}">
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`
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
    if (!data.display_name || data.status === 'unavailable') return generic()

    const title = data.descriptor ? `${data.display_name} · ${data.descriptor}` : data.display_name
    const description = (data.bio ?? data.descriptor ?? 'Mi identidad en Mycen.').slice(0, 200)
    return page(origin, `/${data.username}`, title, description, data.cover_url ?? data.avatar_url)
  } catch {
    return generic()
  }
}
