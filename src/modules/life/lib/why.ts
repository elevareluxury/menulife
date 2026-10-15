// "¿Por qué lo hago?" de hábitos y metas (columna `why`, ≤ 200 y no en blanco en la base).

export const WHY_MAX = 200

/** Lo que se guarda: sin espacios de más; vacío = null (la base no acepta frases en blanco). */
export function whyValue(s: string | null | undefined): string | null {
  const v = (s ?? '').replace(/\s+/g, ' ').trim().slice(0, WHY_MAX)
  return v || null
}
