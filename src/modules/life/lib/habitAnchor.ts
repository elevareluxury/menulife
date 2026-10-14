// Ancla de un hábito ("después de…"). Si la persona ya escribió la frase completa ("después del café"), se muestra
// tal cual en vez de "Después de después del café". Sirve en cualquier idioma: mira la palabra de la plantilla
// traducida que va antes del ancla ("Después", "After") o después ("다음에", "の後").

const MARK = '\u0000'

function templateWords(template: (a: string) => string): { first: string; last: string } {
  const full = template(MARK)
  const i = full.indexOf(MARK)
  const before = full.slice(0, i).trim()
  const after = full.slice(i + 1).trim()
  return {
    first: before.split(/\s+/)[0]?.toLocaleLowerCase() ?? '',
    last: after.split(/\s+/).pop()?.toLocaleLowerCase() ?? '',
  }
}

/** El ancla ya trae la palabra de la plantilla. */
export function anchorHasPrefix(anchor: string, template: (a: string) => string): boolean {
  const a = anchor.trim().toLocaleLowerCase()
  const { first, last } = templateWords(template)
  return (!!first && (a === first || a.startsWith(first + ' '))) || (!!last && a.endsWith(last))
}

/** "Después de el café" o, si ya venía completa, "Después del café". */
export function anchorLabel(anchor: string, template: (a: string) => string): string {
  const a = anchor.trim()
  if (!anchorHasPrefix(a, template)) return template(a)
  // Con la palabra adelante ("Después…") la frase empieza con mayúscula, como la plantilla
  return templateWords(template).first ? a.charAt(0).toLocaleUpperCase() + a.slice(1) : a
}
