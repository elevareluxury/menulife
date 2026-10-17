// Portada automática de un video o una canción (Identity): de dónde se saca la imagen de cada proveedor y qué
// servidores de imágenes se aceptan. Reglas puras con imports relativos: las usa la función Edge api/media-cover.ts.
// La imagen la trae el servidor de Mycen y Studio la guarda como una foto más del perfil, así que el visitante nunca
// se conecta con YouTube, Spotify, etc. para verla.
import { inspectMediaUrl, type MediaEmbed } from './media'

/** Cómo conseguir la portada: una imagen fija (YouTube) o la respuesta oEmbed del proveedor */
export type CoverSource =
  | { kind: 'image'; urls: string[] }
  | { kind: 'oembed'; endpoint: string }

export function coverSourceFor(embed: MediaEmbed, originalUrl: string): CoverSource {
  switch (embed.provider) {
    case 'youtube':
      // La más grande que tenga el video; si no existe, la de alta calidad (siempre está)
      return { kind: 'image', urls: [`https://i.ytimg.com/vi/${embed.id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg`] }
    case 'vimeo':
      return { kind: 'oembed', endpoint: `https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(`https://vimeo.com/${embed.id}`)}` }
    case 'spotify':
      return { kind: 'oembed', endpoint: `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${embed.id}`)}` }
    case 'soundcloud':
      return { kind: 'oembed', endpoint: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(`https://soundcloud.com/${embed.id}`)}` }
    case 'tiktok': {
      // El oEmbed de TikTok necesita el link con el usuario: se rearma sólo con lo validado
      const user = /tiktok\.com\/(@[A-Za-z0-9_.]{1,30})\/video\//.exec(originalUrl)?.[1] ?? '@_'
      return { kind: 'oembed', endpoint: `https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/${user}/video/${embed.id}`)}` }
    }
  }
}

/** Servidores de imágenes de cada proveedor (la respuesta oEmbed no puede mandar a buscar a otro lado) */
const COVER_HOSTS = [
  /^i\.ytimg\.com$/, /^i\.vimeocdn\.com$/, /^i\.scdn\.co$/, /^image-cdn-[a-z0-9]+\.spotifycdn\.com$/, /^mosaic\.scdn\.co$/,
  /^i[0-9]?\.sndcdn\.com$/, /^[a-z0-9-]+\.tiktokcdn(-us|-eu)?\.com$/,
]

export function isAllowedCoverUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length > 2048) return false
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && COVER_HOSTS.some(re => re.test(url.hostname))
  } catch {
    return false
  }
}

/** Lo que Studio le pide a /api/media-cover: sólo links que el módulo acepta */
export function coverRequestFor(raw: string): { embed: MediaEmbed; source: CoverSource } | null {
  const r = inspectMediaUrl(raw)
  return 'embed' in r ? { embed: r.embed, source: coverSourceFor(r.embed, raw) } : null
}

export const COVER_MAX_BYTES = 6_000_000
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
