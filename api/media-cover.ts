// GET /api/media-cover?url=<link de YouTube, Vimeo, Spotify, SoundCloud o TikTok> → la imagen de portada (JPEG/PNG/WebP).
// La usa Studio al pegar un video o una canción: trae la portada y la guarda como una foto del perfil (así el
// visitante no se conecta con el proveedor para verla). Sólo links que el módulo acepta, sólo los servidores de
// imágenes de cada proveedor y con tope de tamaño. Los errores son códigos fijos.

import { COVER_MAX_BYTES, COVER_TYPES, coverRequestFor, isAllowedCoverUrl } from '../src/modules/profile/lib/mediaCover'

export const config = { runtime: 'edge' }

const TIMEOUT_MS = 6000
const UA = 'Mozilla/5.0 (compatible; MycenBot/1.0; +https://mycen.id)'
type Fail = 'bad_request' | 'not_found' | 'upstream'

const fail = (kind: Fail) => new Response(JSON.stringify({ error: kind }), {
  status: kind === 'bad_request' ? 400 : kind === 'not_found' ? 404 : 502,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': kind === 'upstream' ? 'no-store' : 'public, max-age=300, s-maxage=3600', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex' },
})

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': UA, accept } })
  } finally {
    clearTimeout(timer)
  }
}

/** Baja la imagen sólo si viene de un servidor permitido, es una imagen y no pasa el tope */
async function image(url: string): Promise<{ body: Uint8Array; type: string } | null> {
  if (!isAllowedCoverUrl(url)) return null
  const res = await fetchWithTimeout(url, 'image/*')
  if (!res.ok || (res.url && !isAllowedCoverUrl(res.url))) return null
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!(COVER_TYPES as readonly string[]).includes(type)) return null
  if (Number(res.headers.get('content-length') ?? 0) > COVER_MAX_BYTES || !res.body) return null
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > COVER_MAX_BYTES) { await reader.cancel().catch(() => undefined); return null }
    chunks.push(value)
  }
  const body = new Uint8Array(new ArrayBuffer(size))
  let at = 0
  for (const c of chunks) { body.set(c, at); at += c.byteLength }
  // YouTube devuelve una imagen gris de 120 px cuando no existe la grande: se descarta para probar la siguiente
  return size > 2000 ? { body, type } : null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } })
  const raw = new URL(req.url).searchParams.get('url')
  if (!raw || raw.length > 600) return fail('bad_request')
  const request = coverRequestFor(raw)
  if (!request) return fail('bad_request')

  try {
    let candidates: string[] = []
    if (request.source.kind === 'image') candidates = request.source.urls
    else {
      const res = await fetchWithTimeout(request.source.endpoint, 'application/json')
      if (res.status === 404 || res.status === 400) return fail('not_found')
      if (!res.ok) return fail('upstream')
      const text = await res.text()
      if (text.length > 200_000) return fail('upstream')
      const data = JSON.parse(text) as { thumbnail_url?: unknown }
      if (isAllowedCoverUrl(data.thumbnail_url)) candidates = [data.thumbnail_url]
    }
    for (const url of candidates) {
      const img = await image(url)
      if (img) {
        return new Response(img.body.buffer as ArrayBuffer, {
          status: 200,
          headers: { 'content-type': img.type, 'cache-control': 'public, max-age=3600, s-maxage=86400', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex' },
        })
      }
    }
    return fail('not_found')
  } catch {
    return fail('upstream')
  }
}
