// Podcast (Identity · entrega 2): los últimos episodios de un feed RSS. Reglas puras, sin DOM: las usa la función
// Edge (`api/podcast-latest.ts`, que lee el feed desde el servidor de Mycen) y la página (que vuelve a validar).
// Imports relativos: también corre en la función Edge.

export const EPISODES_MAX = 5
export const FEED_URL_MAX = 500

export interface PodcastEpisode {
  title: string
  /** Fecha ISO (o null) */
  date: string | null
  /** Audio https del episodio (lo trae el navegador recién al tocar "Escuchar") */
  audio: string
  /** Duración "mm:ss" o "h:mm:ss" (o null) */
  duration: string | null
  /** Página del episodio (https) o null */
  link: string | null
}

export interface PodcastResponse {
  title: string
  image: string | null
  episodes: PodcastEpisode[]
}

export type FeedProblem = 'empty' | 'not_https' | 'too_long' | 'bad_host'

/** Un link de feed aceptable: https, con dominio (no IP ni localhost) y sin usuario/clave */
export function inspectFeedUrl(input: string | null | undefined): { url: string } | { error: FeedProblem } {
  const raw = (input ?? '').trim()
  if (!raw) return { error: 'empty' }
  if (raw.length > FEED_URL_MAX) return { error: 'too_long' }
  let u: URL
  try { u = new URL(raw) } catch { return { error: 'not_https' } }
  if (u.protocol !== 'https:') return { error: 'not_https' }
  const host = u.hostname.toLowerCase()
  if (u.username || u.password || !host.includes('.') || host === 'localhost' || host.endsWith('.local')
    || /^[\d.]+$/.test(host) || host.includes(':') || u.port) return { error: 'bad_host' }
  return { url: u.toString() }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Texto plano de un nodo XML: CDATA, entidades y sin etiquetas */
function plain(value: string | undefined): string {
  if (!value) return ''
  let s = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  s = s.replace(/<[^>]*>/g, ' ')
  s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ''
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
  return s.replace(/\s+/g, ' ').trim()
}

const tag = (xml: string, name: string) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml)?.[1]
const attr = (xml: string, name: string, at: string) => {
  const el = new RegExp(`<${name}\\s[^>]*>`, 'i').exec(xml)?.[0]
  return el ? new RegExp(`${at}\\s*=\\s*["']([^"']+)["']`, 'i').exec(el)?.[1] : undefined
}
const https = (u: string | undefined) => {
  const v = plain(u)
  return /^https:\/\/[^\s"'<>]+$/.test(v) && v.length <= 2048 ? v : null
}

/** "3725" → "1:02:05"; "62:05" queda; vacío o raro → null */
export function formatDuration(raw: string | undefined): string | null {
  const v = plain(raw)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) return v
  if (/^\d+$/.test(v)) {
    const n = Number(v)
    const h = Math.floor(n / 3600)
    const m = Math.floor((n % 3600) / 60)
    const s = n % 60
    const pad = (x: number) => String(x).padStart(2, '0')
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
  }
  return null
}

/** Lee un feed RSS de podcast (iTunes o común). Episodios sin audio https se saltean. */
export function parsePodcastFeed(xml: string, max = EPISODES_MAX): PodcastResponse | null {
  const channel = tag(xml, 'channel')
  if (!channel) return null
  const head = channel.split(/<item[\s>]/i)[0]
  const title = plain(tag(head, 'title')).slice(0, 200)
  const image = https(attr(head, 'itunes:image', 'href')) ?? https(tag(tag(head, 'image') ?? '', 'url'))
  const episodes: PodcastEpisode[] = []
  for (const m of channel.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    const item = m[1]
    const audio = https(attr(item, 'enclosure', 'url'))
    const type = attr(item, 'enclosure', 'type') ?? 'audio/'
    if (!audio || !/^audio\//i.test(type)) continue
    const t = plain(tag(item, 'title')).slice(0, 200)
    const date = new Date(plain(tag(item, 'pubDate')))
    episodes.push({
      title: t || title,
      date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      audio,
      duration: formatDuration(tag(item, 'itunes:duration')),
      link: https(tag(item, 'link')),
    })
    if (episodes.length >= max) break
  }
  if (!title && !episodes.length) return null
  return { title, image, episodes }
}

/** La página vuelve a validar lo que devuelve la función (nunca confía en el cuerpo tal cual) */
export function sanitizePodcastResponse(body: unknown): PodcastResponse | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const episodes = (Array.isArray(b.episodes) ? b.episodes : []).slice(0, EPISODES_MAX).flatMap((e): PodcastEpisode[] => {
    if (!e || typeof e !== 'object') return []
    const x = e as Record<string, unknown>
    const audio = typeof x.audio === 'string' && /^https:\/\//.test(x.audio) ? x.audio : null
    if (!audio || typeof x.title !== 'string') return []
    return [{
      title: x.title.slice(0, 200), audio,
      date: typeof x.date === 'string' && !Number.isNaN(Date.parse(x.date)) ? x.date : null,
      duration: typeof x.duration === 'string' && /^\d{1,2}(:\d{2}){1,2}$/.test(x.duration) ? x.duration : null,
      link: typeof x.link === 'string' && /^https:\/\//.test(x.link) ? x.link : null,
    }]
  })
  return {
    title: typeof b.title === 'string' ? b.title.slice(0, 200) : '',
    image: typeof b.image === 'string' && /^https:\/\//.test(b.image) ? b.image : null,
    episodes,
  }
}
