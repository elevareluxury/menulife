// Teclado del celular (sobre todo en iPhone): el teclado tapa la parte de abajo sin achicar la página, así que una hoja
// fija abajo quedaba detrás del teclado y el navegador la corría para mostrar el campo, cortando lo de arriba.
// Con `visualViewport` se anota en <html> cuánto ocupa el teclado (`--kb`) y el alto visible (`--vvh`); las hojas y
// paneles fijos (LifeSheet, Sheet del sistema de diseño, cajones de Studio) se apoyan arriba del teclado y nunca son
// más altos que lo visible. Sin `visualViewport` quedan en 0 y 100dvh.

export function installViewportVars() {
  if (typeof window === 'undefined' || !window.visualViewport) return
  const vv = window.visualViewport
  const root = document.documentElement
  let frame = 0
  const update = () => {
    frame = 0
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    root.style.setProperty('--kb', `${kb}px`)
    root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  vv.addEventListener('resize', schedule)
  vv.addEventListener('scroll', schedule)
  update()
}

/**
 * Para usar como `ref`: enfoca el campo al aparecer sin que el navegador mueva la pantalla para buscarlo (con
 * `autoFocus`, en el iPhone la hoja que todavía venía subiendo quedaba corrida y no se veía desde arriba).
 * Es una función fija: React la llama una sola vez al montar.
 */
export function focusOnMount(el: HTMLElement | null) {
  el?.focus({ preventScroll: true })
}
