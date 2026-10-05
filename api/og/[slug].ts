import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const css = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
  }).then(r => r.text())
  const match = css.match(/src: url\((.+?)\) format\('woff2'\)/)
  if (!match) throw new Error('woff2 url not found')
  return fetch(match[1]).then(r => r.arrayBuffer())
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const slug = url.pathname.replace(/^\/api\/og\//, '').replace(/^\/+|\/+$/g, '')

  if (!slug) {
    return new Response('Bad Request', { status: 400 })
  }

  const [res, syneFont, sansFont] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?slug=eq.${slug}&select=name,description,category,city,cover_image_url,logo_url&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    ),
    fetchFont('https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap'),
    fetchFont('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400&display=swap'),
  ])

  const rows = await res.json()
  const r = rows?.[0] as {
    name: string
    description: string | null
    category: string | null
    city: string | null
    cover_image_url: string | null
    logo_url: string | null
  } | undefined

  if (!r) {
    return new Response('Not Found', { status: 404 })
  }

  const name = r.name ?? slug
  const description = r.description ?? ''
  const category = r.category ?? null
  const city = r.city ?? null
  const coverUrl = r.cover_image_url ?? null
  const logoUrl = r.logo_url ?? null

  const pills: string[] = []
  if (category) pills.push(category)
  if (city) pills.push(city)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"DM Sans", sans-serif',
          background: '#0A0B0F',
        }}
      >
        {/* Background: cover image or gradient */}
        {coverUrl ? (
          <img
            src={coverUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.22,
            }}
          />
        ) : null}

        {/* Coral gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(244,112,90,0.18) 0%, rgba(10,11,15,0.0) 55%, rgba(99,102,241,0.14) 100%)',
          }}
        />

        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '260px',
            background: 'linear-gradient(to top, #0A0B0F 60%, transparent)',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 72px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Avatar + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(255,255,255,0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F4705A 0%, #6366F1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#fff',
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  fontFamily: '"Syne", sans-serif',
                  fontWeight: 800,
                  fontSize: '52px',
                  color: '#FFFFFF',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                }}
              >
                {name}
              </div>
              {pills.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {pills.map(p => (
                    <div
                      key={p}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '20px',
                        padding: '4px 14px',
                        fontSize: '15px',
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div
              style={{
                fontSize: '20px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.45,
                maxWidth: '800px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </div>
          )}

          {/* URL watermark */}
          <div
            style={{
              fontSize: '16px',
              color: 'rgba(244,112,90,0.7)',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}
          >
            mycen.id/{slug}
          </div>
        </div>

        {/* Mycen brand top-right */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '56px',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: '22px',
            color: 'rgba(255,255,255,0.22)',
            letterSpacing: '-0.01em',
          }}
        >
          mycen.id
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Syne', data: syneFont, weight: 800, style: 'normal' },
        { name: 'DM Sans', data: sansFont, weight: 400, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
