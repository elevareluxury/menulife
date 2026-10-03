/** Formato de la URL de un proyecto (igual al check content_objects.slug). */
export const PROJECT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/

/** "Marca Café Luna 2025" → "marca-cafe-luna-2025" */
export function slugify(text: string): string {
  return text
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

/** Slug válido y libre: agrega -2, -3… si ya existe. */
export function uniqueSlug(text: string, taken: Iterable<string>): string {
  let base = slugify(text)
  if (base.length < 2) base = base ? `${base}-1` : 'proyecto'
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, 76)}-${n}`
    if (!used.has(candidate)) return candidate
  }
}
