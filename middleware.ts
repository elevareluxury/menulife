import { NextRequest, NextResponse } from '@vercel/edge'

const BOT_UA =
  /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|DuckDuckBot|Applebot|vkShare|Pinterest|Snapchat/i

// Paths that should never be rewritten to the bot-meta handler
const SKIP = /^\/(?:api|assets|_vercel|favicon\.ico|robots\.txt|sitemap\.xml|manifest\.json|apple-touch-icon|android-chrome|browserconfig|mstile|safari-pinned)/

// Reserved slug names — mirror the list in LifeHubPage.tsx
const RESERVED_SLUGS = new Set([
  'login', 'register', 'onboarding', 'dashboard', 'life',
  'auth', 'admin', 'app', 'help', 'about', 'terms',
  'privacy', 'contact', 'support', 'settings', 'profile',
  'signup', 'signin', 'logout', 'me', 'my', 'account',
  'hub', 'id', 'mycen', 'menulife',
])

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (SKIP.test(pathname)) return NextResponse.next()

  const ua = req.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) return NextResponse.next()

  // Match single-segment slug: /abc-def (no dots, no extra slashes)
  const match = pathname.match(/^\/([a-z0-9][a-z0-9-]{1,48}[a-z0-9])$/)
  if (!match) return NextResponse.next()

  const slug = match[1]
  if (RESERVED_SLUGS.has(slug)) return NextResponse.next()

  let restaurant: {
    name: string
    description: string | null
    category: string | null
    city: string | null
  } | null = null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?slug=eq.${slug}&select=name,description,category,city&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    const rows = await res.json() as typeof restaurant[]
    restaurant = rows?.[0] ?? null
  } catch {
    return NextResponse.next()
  }

  if (!restaurant) return NextResponse.next()

  const origin = req.nextUrl.origin
  const ogImage = `${origin}/api/og/${slug}`
  const title = esc(`${restaurant.name} — mycen.id/${slug}`)
  const description = esc(restaurant.description ?? `Perfil digital de ${restaurant.name} en Mycen`)
  const canonicalUrl = esc(`${origin}/${slug}`)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="profile" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Mycen" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImage}" />
<link rel="canonical" href="${canonicalUrl}" />
</head>
<body></body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

export const config = {
  matcher: ['/((?!api|assets|_vercel|favicon\\.ico).*)'],
}
