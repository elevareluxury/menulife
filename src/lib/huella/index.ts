// Huella Mycen (sistema de diseño §8): generador determinista, TypeScript puro sin DOM ni React (sirve también en la
// función Edge de api/og). El algoritmo es una copia exacta de docs/design/huella.ts: las huellas tienen que ser
// idénticas a las del diseño.
export { generateHuella, huellaToSvg, HUELLA_VARIANTS } from './huella'
export type { Huella, HuellaStroke, HuellaVariant, HuellaSvgOptions } from './huella'

/**
 * Semilla de la huella de un perfil: su id (estable) + `huella_salt`, que cambia cuando la persona toca "Generar otra".
 * Nunca el nombre: si la persona cambia de nombre, su huella no cambia.
 */
export function huellaSeed(profile: { id: string; huella_salt?: string | null }): string {
  return `${profile.id}:${profile.huella_salt ?? ''}`
}
