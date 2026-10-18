// Lo que ya se pidió desde index.html (scripts/profilePrefetch.ts) para que el perfil llegue antes: los datos de
// `get_public_profile` y, cuando llegan, las imágenes de la primera pantalla.
import { safeHref } from './safeUrl'
import { profileLook } from './profileLook'
import type { PublicProfile } from './profileTypes'

declare global {
  interface Window { __mycenProfile?: { handle: string; data: Promise<unknown> } }
}

/** Respuesta del pedido temprano si es del mismo handle (se usa una sola vez: después, siempre el pedido normal) */
export function takePrefetchedProfile(handle: string): Promise<unknown> | null {
  const early = window.__mycenProfile
  if (!early) return null
  delete window.__mycenProfile
  return early.handle === handle ? early.data : null
}

/** Imagen principal de un módulo: portada de video o música, primera tarjeta o imagen suelta */
function moduleImage(m: PublicProfile['modules'][number]): unknown {
  if (m.type === 'media') return m.content.cover_url
  if (m.type === 'image') return m.content.url
  if (m.type === 'cards' && Array.isArray(m.content.items)) return (m.content.items[0] as { image_url?: unknown } | undefined)?.image_url
  return null
}

/**
 * Foto, portada (estructura Portada) e imagen principal de los primeros módulos. Las mismas que pide index.html al
 * llegar los datos (scripts/profilePrefetch.ts): si cambia una, cambiar la otra.
 */
export function firstScreenImages(profile: PublicProfile): string[] {
  const urls = [
    safeHref(profile.avatar_url),
    profileLook(profile.theme).layout === 'portada' ? safeHref(profile.cover_url) : null,
    ...profile.modules.slice(0, 3).map(m => safeHref(moduleImage(m))),
  ]
  return [...new Set(urls.filter((u): u is string => !!u))]
}

/**
 * Pide las imágenes apenas se conocen, mientras bajan la estructura y los módulos (antes esperaban a que se
 * dibujaran y una portada `loading="lazy"` era el LCP). El `<img>` después las toma de la caché.
 */
export function preloadImages(urls: string[]) {
  for (const href of urls) {
    if (document.head.querySelector(`link[rel="preload"][href="${CSS.escape(href)}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    link.fetchPriority = 'high'
    document.head.appendChild(link)
  }
}
