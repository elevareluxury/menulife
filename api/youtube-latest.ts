// GET /api/youtube-latest?channel=UC… | ?handle=@usuario → los videos más nuevos de un canal de YouTube (módulo
// "Último video"). El servidor de Mycen lee el feed público del canal (y, con un @usuario, la página del canal para
// saber su id): el navegador del visitante no se conecta con YouTube hasta que toca "Reproducir".
// Respuesta: { channel_id, videos: [{ id, title, published }] }, en caché 30 min en la CDN. Nunca devuelve lo que
// llegó en la consulta: los errores son códigos fijos.

import {
  CHANNEL_ID_RE, extractChannelId, FEED_MAX, HANDLE_RE, parseYoutubeFeed, type LatestVideosResponse,
} from '../src/modules/profile/lib/latestVideo'

export const config = { runtime: 'edge' }

const TIMEOUT_MS = 5000
/** Tope de lo que se lee de YouTube (la página de un canal pesa ~1 MB; el feed, ~40 KB) */
const PAGE_MAX = 2_500_000
const FEED_MAX_BYTES = 1_000_000
const UA = 'Mozilla/5.0 (compatible; MycenBot/1.0; +https://mycen.id)'

type Fail = 'bad_request' | 'not_found' | 'upstream'

class Upstream extends Error {
  kind: Fail
  constructor(kind: Fail) { super(kind); this.kind = kind }
}

function json(body: unknown, status: number, cache: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
    },
  })
}

const fail = (kind: Fail) => kind === 'bad_request'
  ? json({ error: kind }, 400, 'public, max-age=3600, s-maxage=86400')
  : kind === 'not_found'
    ? json({ error: kind }, 404, 'public, max-age=300, s-maxage=600')
    : json({ error: kind }, 502, 'no-store')

/** Lee el cuerpo hasta `max` bytes; con `done` deja de leer apenas encuentra lo que busca. */
async function readText(res: Response, max: number, done?: (text: string) => boolean): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { value, done: end } = await reader.read()
    if (end) break
    size += value.byteLength
    text += decoder.decode(value, { stream: true })
    if (size >= max || done?.(text)) { await reader.cancel().catch(() => undefined); break }
  }
  return text
}

async function get(url: string, max: number, done?: (text: string) => boolean): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      // SOCS=CAI: sin la pantalla de consentimiento de cookies (si no, la página no trae el canal)
      headers: { 'user-agent': UA, 'accept-language': 'en', cookie: 'SOCS=CAI' },
    })
    if (res.status === 404 || res.status === 410) throw new Upstream('not_found')
    if (!res.ok) throw new Upstream('upstream')
    // Una redirección fuera de YouTube (por ejemplo, la de consentimiento) no sirve
    if (res.url && !/^https:\/\/www\.youtube\.com\//.test(res.url)) throw new Upstream('upstream')
    return await readText(res, max, done)
  } catch (e) {
    throw e instanceof Upstream ? e : new Upstream('upstream')
  } finally {
    clearTimeout(timer)
  }
}

export async function latestVideos(query: { channel?: string; handle?: string }): Promise<LatestVideosResponse> {
  let channelId = query.channel ?? null
  if (!channelId && query.handle) {
    const html = await get(`https://www.youtube.com/${query.handle}`, PAGE_MAX, text => /<link\s+rel="canonical"[^>]*>/.test(text))
    channelId = extractChannelId(html)
    if (!channelId) throw new Upstream('not_found')
  }
  if (!channelId || !CHANNEL_ID_RE.test(channelId)) throw new Upstream('bad_request')
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, FEED_MAX_BYTES)
  if (!/<feed[\s>]/.test(xml)) throw new Upstream('upstream')
  return { channel_id: channelId, videos: parseYoutubeFeed(xml, FEED_MAX) }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
  }
  const params = new URL(req.url).searchParams
  const channel = params.get('channel')
  const handle = params.get('handle')
  // Exactamente uno de los dos, con formato estricto
  if ((channel === null) === (handle === null)) return fail('bad_request')
  if (channel !== null && !CHANNEL_ID_RE.test(channel)) return fail('bad_request')
  if (handle !== null && !HANDLE_RE.test(handle)) return fail('bad_request')

  try {
    const body = await latestVideos(channel !== null ? { channel } : { handle: handle! })
    return json(body, 200, 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400')
  } catch (e) {
    return fail(e instanceof Upstream ? e.kind : 'upstream')
  }
}
