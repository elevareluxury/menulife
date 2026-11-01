// Sucursales del módulo Ubicación (`content.branches`): reglas puras para la página, Studio y los tests.
// "Ver la más cerca" ordena con la ubicación del celular, que nunca sale del dispositivo: las coordenadas de cada
// sucursal salen del link largo de Google Maps (o de Apple Maps) que pegó el dueño.
import { safeHref } from './safeUrl'

export const BRANCHES_MAX = 10

export interface Branch { name: string; address: string; city: string; maps_url: string }
export interface Coords { lat: number; lng: number }

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Sucursales guardadas, limpias (la página vuelve a validar lo que llega de la base) */
export function cleanBranches(raw: unknown): Branch[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, BRANCHES_MAX).flatMap(b => {
    if (!b || typeof b !== 'object') return []
    const o = b as Record<string, unknown>
    const branch = {
      name: str(o.name, 60), address: str(o.address, 120), city: str(o.city, 60),
      maps_url: safeHref(str(o.maps_url, 2048)) ?? '',
    }
    return branch.address || branch.maps_url ? [branch] : []
  })
}

const valid = (lat: number, lng: number): Coords | null =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
    ? { lat, lng } : null

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)'

/**
 * Coordenadas de un link de mapas, si las trae: el pin de Google (`!3d…!4d…`), `@lat,lng`, o `q=`/`ll=`/`query=`/
 * `destination=`/`daddr=` con "lat,lng". Los links cortos (maps.app.goo.gl) no las traen: devuelve null.
 */
export function coordsFromMapsUrl(url: string | null | undefined): Coords | null {
  if (!url) return null
  let decoded = url
  try { decoded = decodeURIComponent(url) } catch { /* se usa tal cual */ }
  const pin = new RegExp(`!3d${NUM}!4d${NUM}`).exec(decoded)
  if (pin) return valid(Number(pin[1]), Number(pin[2]))
  const param = new RegExp(`[?&](?:q|ll|query|destination|daddr|sll)=${NUM},\\s*${NUM}(?![\\d.])`).exec(decoded)
  if (param) return valid(Number(param[1]), Number(param[2]))
  const at = new RegExp(`@${NUM},${NUM}(?![\\d.])`).exec(decoded)
  if (at) return valid(Number(at[1]), Number(at[2]))
  return null
}

/** Distancia en km entre dos puntos (haversine) */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Ordena por cercanía (estable); las que no tienen coordenadas quedan al final, en el orden del dueño */
export function sortByDistance<T>(places: T[], coordsOf: (p: T) => Coords | null, here: Coords): { place: T; km: number | null }[] {
  return places
    .map((place, i) => {
      const c = coordsOf(place)
      return { place, km: c ? distanceKm(here, c) : null, i }
    })
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.i - b.i)
    .map(({ place, km }) => ({ place, km }))
}

/** "350 m", "1,2 km", "18 km" en el idioma de la página */
export function formatDistance(km: number, lang: string): string {
  if (km < 1) return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(Math.max(50, Math.round(km * 20) * 50))} m`
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`
}
