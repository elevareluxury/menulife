// Módulo "Escuchá en" (listen_on, V1.1): un link inteligente de música. Una canción o un disco con un botón por
// plataforma. No se carga nada de terceros (ni reproductores ni íconos remotos): son links comunes.
// Reglas puras (sin DOM): las usan el editor de Studio, la página pública y los tests.

export const LISTEN_PLATFORMS = [
  'spotify', 'apple_music', 'youtube_music', 'youtube', 'deezer', 'tidal', 'soundcloud', 'amazon_music',
] as const
export type ListenPlatform = typeof LISTEN_PLATFORMS[number]

export const LISTEN_MAX_LINKS = 8
export const LISTEN_TITLE_MAX = 120
export const LISTEN_ARTIST_MAX = 120
const URL_MAX = 400

/** Nombres de marca (no se traducen) */
export const LISTEN_PLATFORM_NAME: Record<ListenPlatform, string> = {
  spotify: 'Spotify', apple_music: 'Apple Music', youtube_music: 'YouTube Music', youtube: 'YouTube',
  deezer: 'Deezer', tidal: 'TIDAL', soundcloud: 'SoundCloud', amazon_music: 'Amazon Music',
}

/** Dominios de cada plataforma (exactos: music.youtube.com es YouTube Music, no YouTube) */
const HOSTS: Record<ListenPlatform, (host: string) => boolean> = {
  spotify: h => h === 'open.spotify.com',
  apple_music: h => h === 'music.apple.com' || h === 'geo.music.apple.com',
  youtube_music: h => h === 'music.youtube.com',
  youtube: h => /^(www\.|m\.)?youtube\.com$/.test(h) || h === 'youtu.be',
  deezer: h => /^(www\.|link\.)?deezer\.com$/.test(h),
  tidal: h => /^(www\.|listen\.)?tidal\.com$/.test(h),
  soundcloud: h => /^(www\.|m\.|on\.)?soundcloud\.com$/.test(h),
  amazon_music: h => /^music\.amazon\.(com|[a-z]{2}|com?\.[a-z]{2})$/.test(h),
}

export interface ListenLink {
  platform: ListenPlatform
  url: string
}

export type ListenError = 'empty' | 'bad_url' | 'unknown_platform' | 'wrong_platform'

export function isListenPlatform(v: unknown): v is ListenPlatform {
  return typeof v === 'string' && (LISTEN_PLATFORMS as readonly string[]).includes(v)
}

/** https (o sin protocolo, se completa), sin usuario/contraseña y con algo después del dominio */
function asUrl(raw: string): URL | null {
  const v = raw.trim()
  if (!v || /\s/.test(v) || v.length > URL_MAX) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (url.pathname.replace(/\/+$/, '') === '') return null
    return url
  } catch {
    return null
  }
}

/** Plataforma de un link (por su dominio), o null. */
export function detectListenPlatform(raw: unknown): ListenPlatform | null {
  if (typeof raw !== 'string') return null
  const url = asUrl(raw)
  if (!url) return null
  const host = url.hostname.toLowerCase()
  return LISTEN_PLATFORMS.find(p => HOSTS[p](host)) ?? null
}

/** Motivo por el que un link no sirve (para `platform`, si se indica), o null. */
export function checkListenLink(raw: unknown, platform?: ListenPlatform): ListenError | null {
  if (typeof raw !== 'string' || !raw.trim()) return 'empty'
  const url = asUrl(raw)
  if (!url) return 'bad_url'
  const host = url.hostname.toLowerCase()
  if (platform) return HOSTS[platform](host) ? null : 'wrong_platform'
  return detectListenPlatform(raw) ? null : 'unknown_platform'
}

/** URL lista para el href si es de esa plataforma, o null. */
export function listenHref(platform: ListenPlatform, raw: unknown): string | null {
  if (checkListenLink(raw, platform)) return null
  return asUrl(raw as string)!.href
}

/** Lo guardado en `content.links`: sólo lo válido, una vez por plataforma y hasta 8. */
export function readListenLinks(raw: unknown): ListenLink[] {
  if (!Array.isArray(raw)) return []
  const out: ListenLink[] = []
  for (const item of raw) {
    if (out.length >= LISTEN_MAX_LINKS) break
    if (!item || typeof item !== 'object') continue
    const { platform, url } = item as Record<string, unknown>
    if (!isListenPlatform(platform) || out.some(l => l.platform === platform)) continue
    const href = listenHref(platform, url)
    if (href) out.push({ platform, url: href })
  }
  return out
}
