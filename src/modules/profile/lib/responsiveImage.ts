// Atributos para el <img> del perfil con las reglas de imageCdn.ts (ahí está el porqué).
import { IMAGE_QUALITY, IMAGE_SIZES, IMAGE_WIDTHS, MEDIA_PATH, imageCdnOn, imageSrcset, type ImageRole } from './imageCdn'

export type { ImageRole } from './imageCdn'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''

/** Atributos `srcSet`/`sizes` para un `<img>` del perfil; vacío si se usa la foto original */
export function responsiveImage(url: string | null | undefined, role: ImageRole): { srcSet?: string; sizes?: string } {
  if (!url || !SUPABASE_URL || typeof location === 'undefined' || !imageCdnOn(location.protocol, location.hostname)) return {}
  const srcSet = imageSrcset(url, SUPABASE_URL + MEDIA_PATH, IMAGE_WIDTHS, IMAGE_QUALITY)
  return srcSet ? { srcSet, sizes: IMAGE_SIZES[role] } : {}
}
