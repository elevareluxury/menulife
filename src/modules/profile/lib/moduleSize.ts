import type { ModuleType, ProfileModule } from './profileTypes'
import { parseMediaUrl } from './media'

/**
 * Tamaño de cada módulo en la grilla del perfil (`config.size`, sin migración). Puro: lo usan la página pública, la
 * vista previa de Studio y el selector "Tamaño" del editor.
 *   square   = cuadrado (dos por fila en el celular, cuatro en la compu en Bento)
 *   wide     = ancho (la franja de siempre; en Bento en la compu, media fila)
 *   featured = destacado (sólo Bento: toda la fila también en la compu)
 *   bar      = barra de 80 px (música de Spotify: mide lo mismo que su reproductor compacto), siempre toda la fila
 *   vertical = 9:16 (video de TikTok, Reels o Shorts), del ancho de un cuadrado
 */
export type ModuleSize = 'square' | 'wide' | 'featured' | 'bar' | 'vertical'

export const MODULE_SIZES: readonly ModuleSize[] = ['square', 'wide', 'featured', 'bar', 'vertical']

/** Tamaño de cada tipo en Bento cuando el dueño no eligió. Redes y botón destacado van a toda la fila: a media fila
 *  quedaban íconos sueltos con un hueco, o un botón estirado al alto de su vecino. */
const BENTO_DEFAULT: Record<ModuleType, ModuleSize> = {
  link: 'square', social: 'featured', contact: 'wide', location: 'wide', image: 'featured', text: 'wide',
  featured_action: 'featured', contact_card: 'square', gallery: 'featured', product: 'wide', testimonials: 'wide',
  hours: 'wide', cards: 'featured', project: 'featured', portfolio: 'featured', link_group: 'wide',
  contact_form: 'wide', collab: 'wide', subscribe: 'wide', media: 'wide', latest_video: 'featured', support: 'wide',
  listen_on: 'wide',
}

/** Los tipos que se ven bien en un cuadrado (el resto parte sus textos o sus botones) */
const SQUARE_TYPES = new Set<string>(['link', 'image', 'product', 'project', 'location'])

/** Tamaños que ofrece un módulo, en el orden del selector. `bento` suma "Destacado". */
export function sizeOptions(module: Pick<ProfileModule, 'type' | 'content'>, bento: boolean): ModuleSize[] {
  const out: ModuleSize[] = []
  const media = module.type === 'media' ? parseMediaUrl(module.content?.url) : null
  if (SQUARE_TYPES.has(module.type) || media) out.push('square')
  if (media?.kind === 'music' && media.provider === 'spotify') out.push('bar')
  out.push('wide')
  if (media?.kind === 'video') out.push('vertical')
  if (bento) out.push('featured')
  return out
}

/** Tamaño elegido por el dueño (si este módulo lo admite en esta estructura) o el de siempre de la estructura */
export function moduleSize(module: Pick<ProfileModule, 'type' | 'content' | 'config'>, bento: boolean): ModuleSize {
  const chosen = module.config?.size
  if (typeof chosen === 'string' && sizeOptions(module, bento).includes(chosen as ModuleSize)) return chosen as ModuleSize
  if (!bento) return 'wide'
  if (module.type === 'media') return parseMediaUrl(module.content?.url)?.kind === 'video' ? 'featured' : 'wide'
  return (BENTO_DEFAULT as Record<string, ModuleSize | undefined>)[module.type] ?? 'wide'
}

/** Columnas que ocupa cada tamaño en una grilla de 2 (celular, columna angosta) o 4 (Bento en la compu) */
export function sizeSpan(size: ModuleSize, cols: 2 | 4): number {
  if (size === 'square' || size === 'vertical') return 1
  if (cols === 2) return 2
  // La barra mide 80 px: a media fila quedaría estirada al lado de un cuadrado
  return size === 'featured' || size === 'bar' ? 4 : 2
}

/**
 * Ubica los bloques en filas, en el orden del dueño (sin reordenar): si el que sigue no entra en lo que queda de la
 * fila, el último de esa fila se estira hasta el borde. Así nunca queda un hueco en el medio (un cuadrado solo pasa a
 * ancho). La última fila queda como está: un cuadrado al final sigue cuadrado (estirado al lado de un vertical era una
 * tarjeta enorme y vacía).
 */
export function packSpans(sizes: ModuleSize[], cols: 2 | 4): number[] {
  const spans = sizes.map(s => sizeSpan(s, cols))
  let used = 0
  for (let i = 0; i < spans.length; i++) {
    if (used > 0 && used + spans[i] > cols) {
      spans[i - 1] += cols - used
      used = 0
    }
    used += spans[i]
    if (used === cols) used = 0
  }
  return spans
}
