import { apiUrl } from '@/lib/platform'
import { sanitizePodcastResponse, type PodcastResponse } from './podcast'

// Pide los episodios a la función de Mycen (`api/podcast-latest.ts`, mismo origen). Una consulta por feed mientras
// la página está abierta; un error no queda guardado.
const cache = new Map<string, Promise<PodcastResponse | null>>()

export function loadPodcast(feed: string): Promise<PodcastResponse | null> {
  const hit = cache.get(feed)
  if (hit) return hit
  const p = fetch(apiUrl(`/api/podcast-latest?feed=${encodeURIComponent(feed)}`), { headers: { accept: 'application/json' } })
    .then(res => (res.ok ? res.json() : null))
    .then(sanitizePodcastResponse)
    .catch(() => null)
    .then(r => { if (!r) cache.delete(feed); return r })
  cache.set(feed, p)
  return p
}
