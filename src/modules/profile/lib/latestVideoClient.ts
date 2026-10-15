// Pide los videos más nuevos de un canal a la función de Mycen (`api/youtube-latest.ts`, mismo origen: no es un
// tercero). Una sola consulta por canal mientras la página está abierta; la respuesta se vuelve a validar.
import { sanitizeLatestResponse, type LatestVideosResponse } from './latestVideo'

const cache = new Map<string, Promise<LatestVideosResponse | null>>()

/** `query` = channelQuery(content). Devuelve null si el canal no existe, no hay red o la respuesta no sirve. */
export function loadLatestVideos(query: string): Promise<LatestVideosResponse | null> {
  const hit = cache.get(query)
  if (hit) return hit
  const p = fetch(`/api/youtube-latest?${query}`, { headers: { accept: 'application/json' } })
    .then(res => (res.ok ? res.json() : null))
    .then(sanitizeLatestResponse)
    .catch(() => null)
    .then(r => {
      if (!r) cache.delete(query) // un error no queda guardado: se reintenta la próxima vez
      return r
    })
  cache.set(query, p)
  return p
}
