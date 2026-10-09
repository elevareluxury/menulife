// Video y música integrados (V1 · etapa 04). Lista cerrada de proveedores: cualquier otro link se rechaza.
// Igual que en video.ts, nunca se usa la URL pegada como src: el iframe se arma con el id validado.
// El iframe se carga recién cuando el visitante toca "Reproducir" (fachada: MediaModule).
import { parseVideoUrl } from './video'

export const MEDIA_PROVIDERS = ['youtube', 'vimeo', 'spotify', 'soundcloud', 'tiktok'] as const
export type MediaProvider = typeof MEDIA_PROVIDERS[number]
export type MediaKind = 'video' | 'music'

export interface MediaEmbed {
  provider: MediaProvider
  kind: MediaKind
  id: string
  /** URL del iframe (sólo dominios del proveedor) */
  src: string
  /** Alto fijo del reproductor (música) o null si va con proporción (video) */
  height: number | null
  /** Proporción ancho / alto del video */
  ratio: number
  /** Permisos mínimos del iframe */
  allow: string
}

export const MEDIA_PROVIDER_NAME: Record<MediaProvider, string> = {
  youtube: 'YouTube', vimeo: 'Vimeo', spotify: 'Spotify', soundcloud: 'SoundCloud', tiktok: 'TikTok',
}

/** Por qué no se aceptó un link (para el mensaje del editor) */
export type MediaError = 'empty' | 'invalid' | 'unsupported' | 'short_link'

const SPOTIFY_TYPES = ['track', 'album', 'playlist', 'episode', 'show'] as const

function asUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

/** Lee el link y devuelve el reproductor o el motivo por el que no se acepta. */
export function inspectMediaUrl(raw: unknown): { embed: MediaEmbed } | { error: MediaError } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'empty' }
  const url = asUrl(raw)
  if (!url) return { error: 'invalid' }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')

  // Links cortos que no dicen qué contenido es (habría que seguir la redirección): se pide el link completo
  if (host === 'on.soundcloud.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || host === 'spotify.link') {
    return { error: 'short_link' }
  }

  const video = parseVideoUrl(raw)
  if (video?.provider === 'youtube') {
    return { embed: { provider: 'youtube', kind: 'video', id: video.id, src: `${video.src}?autoplay=1&rel=0`, height: null, ratio: 16 / 9,
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen' } }
  }
  if (video?.provider === 'vimeo') {
    return { embed: { provider: 'vimeo', kind: 'video', id: video.id, src: `${video.src}&autoplay=1`, height: null, ratio: 16 / 9,
      allow: 'autoplay; fullscreen; picture-in-picture' } }
  }

  if (host === 'open.spotify.com') {
    // /track/ID, /intl-es/track/ID, /embed/track/ID
    const parts = url.pathname.split('/').filter(Boolean).filter(p => !/^intl-[a-z]{2}(-[a-z]{2})?$/i.test(p) && p !== 'embed')
    const [type, id] = parts
    if ((SPOTIFY_TYPES as readonly string[]).includes(type) && /^[A-Za-z0-9]{22}$/.test(id ?? '')) {
      const compact = type === 'track' || type === 'episode'
      return { embed: { provider: 'spotify', kind: 'music', id: `${type}/${id}`, src: `https://open.spotify.com/embed/${type}/${id}`,
        height: compact ? 152 : 352, ratio: 0, allow: 'autoplay; encrypted-media; clipboard-write' } }
    }
    return { error: 'invalid' }
  }

  if (host === 'soundcloud.com') {
    const m = /^\/([a-z0-9_-]{2,40})\/(sets\/)?([a-z0-9_-]{1,120})\/?$/i.exec(url.pathname)
    if (!m) return { error: 'invalid' }
    const path = `${m[1]}/${m[2] ?? ''}${m[3]}`.toLowerCase()
    const canonical = encodeURIComponent(`https://soundcloud.com/${path}`)
    return { embed: { provider: 'soundcloud', kind: 'music', id: path,
      src: `https://w.soundcloud.com/player/?url=${canonical}&auto_play=true&visual=false&show_comments=false`,
      height: m[2] ? 400 : 166, ratio: 0, allow: 'autoplay' } }
  }

  if (host === 'tiktok.com') {
    const m = /^\/@[A-Za-z0-9_.]{1,30}\/video\/(\d{15,21})\/?$/.exec(url.pathname)
    if (!m) return { error: 'invalid' }
    return { embed: { provider: 'tiktok', kind: 'video', id: m[1], src: `https://www.tiktok.com/embed/v2/${m[1]}`,
      height: null, ratio: 9 / 16, allow: 'encrypted-media; fullscreen' } }
  }

  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) return { error: 'invalid' }
  return { error: 'unsupported' }
}

export function parseMediaUrl(raw: unknown): MediaEmbed | null {
  const r = inspectMediaUrl(raw)
  return 'embed' in r ? r.embed : null
}
