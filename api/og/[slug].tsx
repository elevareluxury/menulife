/// <reference types="node" />
// Imagen al compartir (V1 · etapa 08): 1200×630 con el cielo del tema del perfil (Universo / Amanecer), su huella
// (huellaToSvg, sin DOM: corre en Edge) y su nombre. La pide api/og.ts en og:image: /api/og/{username}[?space=slug].
// Usa la misma RPC pública que la app: nunca muestra nada que el perfil público no muestre.
import { ImageResponse } from '@vercel/og'
import { generateHuella, huellaToSvg, huellaSeed } from '../../src/lib/huella'
import { ACCENT_COLORS, SECONDARY_COLORS, THEME_BG, THEME_TEXT, type MycenTheme } from '../../src/design/themes'
import { profileLook } from '../../src/modules/profile/lib/profileLook'
import type { ProfileTheme } from '../../src/modules/profile/lib/profileTypes'

export const config = { runtime: 'edge' }

interface OgProfile {
  id: string
  username: string
  handle?: string
  display_name: string
  descriptor: string | null
  avatar_url: string | null
  theme?: ProfileTheme | null
  huella_salt?: string | null
  status?: string
  redirect?: string
}

/** El cielo de cada tema (mismos colores que --my-sky en src/design/tokens.css) */
const SKY: Record<MycenTheme, string> = {
  universo:
    'radial-gradient(circle at 88% 6%, rgba(255,122,89,0.22), transparent 45%), ' +
    'radial-gradient(circle at 6% 30%, rgba(99,76,224,0.32), transparent 50%), ' +
    'radial-gradient(circle at 90% 85%, rgba(56,152,236,0.18), transparent 45%)',
  amanecer: 'linear-gradient(180deg, #E9E3F7 0%, #F6DDD6 32%, #FFE9DA 52%, #FFF6EE 70%, #FBF4EE 100%)',
}

const brand = (origin: string) => Response.redirect(`${origin}/og-image.png`, 302)

async function font(origin: string, file: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${origin}/fonts/og/${file}`)
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  const username = decodeURIComponent(url.pathname.replace(/^\/api\/og\//, '')).replace(/\.png$/, '').toLowerCase()
  const space = url.searchParams.get('space')?.toLowerCase() ?? null
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(username) || (space !== null && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(space))) {
    return brand(origin)
  }

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return brand(origin)

  let p: OgProfile | null = null
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_username: space ? `${username}/${space}` : username }),
    })
    if (res.ok) p = (await res.json()) as OgProfile | null
  } catch { /* imagen de marca */ }
  if (!p || p.redirect || p.status !== 'published' || !p.display_name || !p.id) return brand(origin)

  const look = profileLook(p.theme)
  const ink = THEME_TEXT[look.mode]
  const accent = ACCENT_COLORS[look.accent][look.mode].accent
  const huella = huellaToSvg(generateHuella(huellaSeed(p), look.huellaVariant), {
    colorA: accent, colorB: SECONDARY_COLORS[look.mode], size: 460,
  })
  const handle = `${url.host.replace(/^www\./, '')}/${p.handle ?? p.username}`
  const avatar = p.avatar_url && /^https:\/\//i.test(p.avatar_url) ? p.avatar_url : null
  const initial = Array.from(p.display_name.trim())[0]?.toUpperCase() ?? '·'
  const nameSize = p.display_name.length > 22 ? 52 : p.display_name.length > 14 ? 64 : 76

  const [display, displayExt, ui, uiExt] = await Promise.all([
    font(origin, 'unbounded-600.woff'), font(origin, 'unbounded-ext-600.woff'),
    font(origin, 'geist-400.woff'), font(origin, 'geist-ext-400.woff'),
  ])
  const fonts = [
    display && { name: 'Unbounded', data: display, weight: 600 as const, style: 'normal' as const },
    displayExt && { name: 'Unbounded', data: displayExt, weight: 600 as const, style: 'normal' as const },
    ui && { name: 'Geist', data: ui, weight: 400 as const, style: 'normal' as const },
    uiExt && { name: 'Geist', data: uiExt, weight: 400 as const, style: 'normal' as const },
  ].filter(f => !!f)

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px', display: 'flex', alignItems: 'center', position: 'relative',
        background: THEME_BG[look.mode], backgroundImage: SKY[look.mode], fontFamily: 'Geist', color: ink.text,
        padding: '0 80px', gap: '64px',
      }}>
        <div style={{ position: 'relative', width: '460px', height: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(huella)}`} width={460} height={460}
            style={{ position: 'absolute', top: 0, left: 0 }} />
          {avatar ? (
            <img src={avatar} width={210} height={210} style={{ borderRadius: '50%', objectFit: 'cover', border: `4px solid ${THEME_BG[look.mode]}` }} />
          ) : (
            <div style={{
              width: '210px', height: '210px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: THEME_BG[look.mode], border: `4px solid ${accent}`, fontFamily: 'Unbounded', fontSize: '96px', color: ink.text,
            }}>{initial}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Unbounded', fontSize: `${nameSize}px`, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            {p.display_name.slice(0, 60)}
          </div>
          {p.descriptor && (
            <div style={{ fontSize: '32px', color: ink.muted, lineHeight: 1.3 }}>{p.descriptor.slice(0, 80)}</div>
          )}
          <div style={{ display: 'flex', marginTop: '12px', fontSize: '26px', color: ink.text }}>
            <span style={{ borderBottom: `3px solid ${accent}`, paddingBottom: '4px' }}>{handle}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', right: '56px', bottom: '40px', fontFamily: 'Unbounded', fontSize: '26px', color: ink.text, opacity: 0.85 }}>
          mycen
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    },
  )
}
