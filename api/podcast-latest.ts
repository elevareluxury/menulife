// GET /api/podcast-latest?feed=https://… → los últimos episodios de un podcast (módulo "Podcast"). El servidor de
// Mycen lee el feed RSS: el navegador del visitante no se conecta con el hosting del podcast hasta que toca
// "Escuchar". Respuesta: { title, image, episodes: [{ title, date, audio, duration, link }] }, en caché 30 min en
// la CDN. Errores con códigos fijos (nunca se devuelve lo que llegó).

import { EPISODES_MAX, inspectFeedUrl, parsePodcastFeed } from '../src/modules/profile/lib/podcast'

export const config = { runtime: 'edge' }

const TIMEOUT_MS = 5000
/** Tope de lo que se lee del feed (algunos traen cientos de episodios con notas largas) */
const FEED_MAX_BYTES = 3_000_000
const UA = 'Mozilla/5.0 (compatible; MycenBot/1.0; +https://mycen.id)'

type Fail = 'bad_request' | 'not_found' | 'upstream'

function json(body: unknown, status: number, cache: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'access-control-allow-origin': '*',
    },
  })
}

const fail = (kind: Fail) => kind === 'bad_request'
  ? json({ error: kind }, 400, 'public, max-age=3600, s-maxage=86400')
  : kind === 'not_found'
    ? json({ error: kind }, 404, 'public, max-age=300, s-maxage=600')
    : json({ error: kind }, 502, 'no-store')

/** Lee el cuerpo hasta `max` bytes; si el feed es más largo, alcanza con el principio (los episodios nuevos van primero) */
async function readText(res: Response, max: number): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    text += decoder.decode(value, { stream: true })
    // Con los primeros episodios alcanza
    if (size >= max || (text.match(/<\/item>/gi)?.length ?? 0) > EPISODES_MAX) { await reader.cancel().catch(() => undefined); break }
  }
  return text
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
  const checked = inspectFeedUrl(new URL(req.url).searchParams.get('feed'))
  if ('error' in checked) return fail('bad_request')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(checked.url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' } })
    if (res.status === 404 || res.status === 410) return fail('not_found')
    // Una redirección a algo que no es https o a una dirección interna no se sigue leyendo
    if (!res.ok || (res.url && 'error' in inspectFeedUrl(res.url))) return fail('upstream')
    const feed = parsePodcastFeed(await readText(res, FEED_MAX_BYTES))
    if (!feed) return fail('not_found')
    return json(feed, 200, 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400')
  } catch {
    return fail('upstream')
  } finally {
    clearTimeout(timer)
  }
}
