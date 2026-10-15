// "Último video" (módulo latest_video): el video más nuevo de un canal de YouTube aparece solo, sin volver a publicar.
// Reglas puras (sin DOM ni red) que comparten Studio, la página pública y la función Edge `api/youtube-latest.ts`
// (por eso sólo imports relativos, como profileLook.ts). El dueño pega el link del canal; se guarda el id del canal
// (UC…) o el @usuario. El servidor de Mycen lee el feed público del canal y devuelve sólo id, título y fecha.

export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/
export const HANDLE_RE = /^@[A-Za-z0-9._-]{3,30}$/
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
/** Largo máximo del título que se muestra (en caracteres) */
export const TITLE_MAX = 200
/** Cuántos videos devuelve el servidor como mucho (el módulo muestra 1 o 3) */
export const FEED_MAX = 3

export type ChannelRef = { channel_id: string } | { handle: string }
/** Por qué no se aceptó un link (para el mensaje del editor) */
export type ChannelError = 'empty' | 'invalid' | 'not_channel' | 'legacy'

export interface LatestVideo {
  id: string
  title: string
  /** Fecha ISO o '' si el feed no la trae */
  published: string
}

export interface LatestVideosResponse {
  channel_id: string
  videos: LatestVideo[]
}

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])
// Secciones de un canal que se pueden pegar detrás del @usuario o del id
const CHANNEL_TABS = new Set(['', 'videos', 'featured', 'shorts', 'streams', 'live', 'playlists', 'community', 'about', 'podcasts', 'releases', 'posts'])

/** Lee lo que pegó el dueño (link del canal, "@usuario" o el id "UC…") y devuelve el canal o el motivo del rechazo. */
export function inspectChannelUrl(raw: unknown): { ref: ChannelRef } | { error: ChannelError } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'empty' }
  const value = raw.trim()
  if (HANDLE_RE.test(value)) return { ref: { handle: value } }
  if (CHANNEL_ID_RE.test(value)) return { ref: { channel_id: value } }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return { error: 'invalid' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'invalid' }
  const host = url.hostname.toLowerCase()
  // youtu.be y los links de un video: es un video, no el canal
  if (host === 'youtu.be' || host === 'www.youtu.be') return { error: 'not_channel' }
  if (!YT_HOSTS.has(host)) return { error: 'invalid' }

  const parts = url.pathname.split('/').filter(Boolean)
  const [first = '', second = '', third = ''] = parts
  const tabOk = (tab: string, rest: number) => parts.length <= rest && CHANNEL_TABS.has(tab.toLowerCase())

  if (first.startsWith('@')) {
    return HANDLE_RE.test(first) && tabOk(second, 2) ? { ref: { handle: first } } : { error: 'invalid' }
  }
  if (first === 'channel') {
    return CHANNEL_ID_RE.test(second) && tabOk(third, 3) ? { ref: { channel_id: second } } : { error: 'invalid' }
  }
  if (first === 'c' || first === 'user') return { error: 'legacy' }
  if (first === 'watch' || first === 'shorts' || first === 'live' || first === 'embed' || first === 'playlist') return { error: 'not_channel' }
  return { error: 'invalid' }
}

export function parseChannelUrl(raw: unknown): ChannelRef | null {
  const r = inspectChannelUrl(raw)
  return 'ref' in r ? r.ref : null
}

/** Query string para `/api/youtube-latest` a partir del contenido guardado del módulo (se vuelve a validar). */
export function channelQuery(content: Record<string, unknown> | null | undefined): string | null {
  const id = content?.channel_id
  if (typeof id === 'string' && CHANNEL_ID_RE.test(id)) return `channel=${id}`
  const handle = content?.handle
  if (typeof handle === 'string' && HANDLE_RE.test(handle)) return `handle=${encodeURIComponent(handle)}`
  return null
}

// ── Feed de YouTube (sólo en el servidor) ──────────────────────────────────

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function codePoint(n: number): string {
  // Sin nulos, sustitutos sueltos ni fuera de rango; los controles se limpian después
  if (!Number.isInteger(n) || n <= 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return ''
  return String.fromCodePoint(n)
}

/** Decodifica las entidades XML (nombradas y numéricas). Lo desconocido queda tal cual. */
export function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, cdata: string) => cdata.replace(/&/g, '&amp;'))
    .replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,4});/g, (whole, ref: string) => {
      if (ref[0] === '#') return codePoint(ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10))
      return NAMED[ref] ?? whole
    })
}

/** Título seguro para mostrar: sin controles, espacios juntados y hasta TITLE_MAX caracteres. */
export function cleanTitle(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  // eslint-disable-next-line no-control-regex -- se sacan a propósito los caracteres de control
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()
  const chars = Array.from(text)
  return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX - 1).join('').trimEnd()}…` : text
}

function isoDate(raw: string): string {
  const t = Date.parse(raw.trim())
  return Number.isFinite(t) ? new Date(t).toISOString() : ''
}

const tag = (body: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(body)
  return m ? m[1] : null
}

/**
 * Lee el feed Atom público de un canal (https://www.youtube.com/feeds/videos.xml?channel_id=UC…) y devuelve los
 * videos más nuevos primero. Parser mínimo sin dependencias: ignora lo que no entiende y valida cada id.
 */
export function parseYoutubeFeed(xml: string, max = FEED_MAX): LatestVideo[] {
  if (typeof xml !== 'string') return []
  const out: LatestVideo[] = []
  const seen = new Set<string>()
  const entries = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g
  let m: RegExpExecArray | null
  let n = 0
  while ((m = entries.exec(xml)) && n++ < 50) {
    const body = m[1]
    const id = (tag(body, 'yt:videoId') ?? '').trim()
    if (!VIDEO_ID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: cleanTitle(decodeXml(tag(body, 'title') ?? '')), published: isoDate(decodeXml(tag(body, 'published') ?? '')) })
  }
  // Más nuevo primero (el feed ya viene así); lo que no trae fecha va al final, en el orden del feed
  const dated = out.filter(v => v.published).sort((a, b) => b.published.localeCompare(a.published))
  return [...dated, ...out.filter(v => !v.published)].slice(0, Math.max(0, Math.min(max, FEED_MAX)))
}

/** Id del canal en la página de un @usuario: la canónica, si no los datos de la página. */
export function extractChannelId(html: string): string | null {
  if (typeof html !== 'string') return null
  const patterns = [
    /<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/,
    /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
    /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
  ]
  for (const re of patterns) {
    const m = re.exec(html)
    if (m && CHANNEL_ID_RE.test(m[1])) return m[1]
  }
  return null
}

/** Valida la respuesta de `/api/youtube-latest` en el navegador (nunca se confía en lo que llega). */
export function sanitizeLatestResponse(json: unknown): LatestVideosResponse | null {
  if (!json || typeof json !== 'object') return null
  const { channel_id, videos } = json as Record<string, unknown>
  if (typeof channel_id !== 'string' || !CHANNEL_ID_RE.test(channel_id) || !Array.isArray(videos)) return null
  const list: LatestVideo[] = []
  for (const v of videos.slice(0, FEED_MAX)) {
    const r = (v ?? {}) as Record<string, unknown>
    if (typeof r.id !== 'string' || !VIDEO_ID_RE.test(r.id)) continue
    list.push({ id: r.id, title: cleanTitle(r.title), published: typeof r.published === 'string' ? isoDate(r.published) : '' })
  }
  return { channel_id, videos: list }
}
