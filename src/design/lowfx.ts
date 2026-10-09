// Vidrio con caída (sistema de diseño §6): `backdrop-filter` es caro en celulares. Con "reducir transparencia"
// o en equipos lentos (4 núcleos o menos) se marca <html data-mycen-lowfx> y el vidrio pasa a un color sólido.

export function prefersLowFx(): boolean {
  if (typeof window === 'undefined') return false
  const reduced = !!window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined
  return reduced || (typeof cores === 'number' && cores > 0 && cores <= 4)
}

/** Marca el documento y lo mantiene al día si la persona cambia la preferencia. */
export function installLowFx(): void {
  if (typeof document === 'undefined') return
  const apply = () => document.documentElement.toggleAttribute('data-mycen-lowfx', prefersLowFx())
  apply()
  window.matchMedia?.('(prefers-reduced-transparency: reduce)').addEventListener?.('change', apply)
}
