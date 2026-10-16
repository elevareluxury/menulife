// Pantalla de carga con la huella de Mycen (la arma scripts/bootSplash.ts en index.html). La app la saca cuando se
// dibuja la primera pantalla y la vuelve a mostrar mientras baja otra (fallback de las rutas).

const FADE_MS = 340  // un poco más que la transición (.28 s), así no se corta a mitad
let goneTimer: ReturnType<typeof setTimeout> | undefined

function splash(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('boot-splash')
}

export function hideBootSplash() {
  const el = splash()
  if (!el || el.className === 'is-gone') return
  el.className = 'is-hidden'
  clearTimeout(goneTimer)
  goneTimer = setTimeout(() => { if (el.className === 'is-hidden') el.className = 'is-gone' }, FADE_MS)
}

export function showBootSplash() {
  const el = splash()
  if (!el) return
  clearTimeout(goneTimer)
  el.className = ''
}
