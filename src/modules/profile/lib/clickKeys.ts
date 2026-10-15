// Analítica "Lo que más tocan": cada botón de un módulo se identifica con una clave corta y estable (≤ 64, sólo
// [A-Za-z0-9:_.-], lo valida la base). Sale del contenido del módulo, nunca del visitante: la página pública la manda
// con el toque y Studio la vuelve a calcular con el contenido actual para ponerle nombre.

/** FNV-1a de 32 bits en base 36 (≤ 7 caracteres): alcanza para distinguir los links de un mismo módulo. */
function hash(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : ''
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Un link dentro de un módulo (grupo de links, tarjetas): por su dirección guardada, así no cambia al reordenar. */
export const urlKey = (url: unknown): string => `u:${hash(url)}`

/** Un medio de "Apoyame": tipo + valor (dos "otro link" distintos no se mezclan). */
export const supportKey = (m: { kind: string; value: string }): string => `${m.kind}:${hash(m.value)}`

/** Un proyecto del portfolio */
export const projectKey = (id: string): string => `p:${id}`

/** Botón "Reservar" (cuenta como acción principal) */
export const RESERVE_KEY = 'reserve'
