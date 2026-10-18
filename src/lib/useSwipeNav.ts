import type { TouchEvent } from 'react'

// Deslizar el dedo de costado para pasar a la vista de al lado (Brain: Capturas · Tareas · Archivo; Studio: secciones).
// Sólo cuenta un gesto claramente horizontal (≥ 60 px, el doble de lo que bajó o subió, en menos de 0,8 s), así el
// scroll para arriba y abajo nunca cambia de vista. No arranca sobre campos, controles deslizables ni zonas que se
// mueven de costado por su cuenta (`data-no-swipe`), ni dentro de una hoja o panel abierto (lo de atrás no cambia).
// En árabe (RTL) las direcciones se invierten.

const MIN_DX = 60
const MAX_MS = 800
const SKIP = 'input, textarea, select, [contenteditable="true"], [data-no-swipe], [role="slider"], [role="dialog"], [role="alertdialog"]'

export function useSwipeNav(onNext: () => void, onPrev: () => void) {
  // El final del gesto se escucha en la ventana: si la lista se vuelve a dibujar mientras el dedo se mueve, el
  // elemento donde empezó ya no está en la página y su "touchend" no llegaría hasta acá.
  const onTouchStart = (e: TouchEvent) => {
    const target = e.target as Element | null
    if (e.touches.length !== 1 || target?.closest(SKIP) || scrollsSideways(target)) return
    const p = e.touches[0]
    const s = { x: p.clientX, y: p.clientY, t: Date.now() }
    const rtl = getComputedStyle(e.currentTarget as Element).direction === 'rtl'
    const end = (ev: globalThis.TouchEvent) => {
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', cancel)
      const q = ev.changedTouches[0]
      if (!q || ev.touches.length) return
      const dx = q.clientX - s.x, dy = q.clientY - s.y
      if (Date.now() - s.t > MAX_MS || Math.abs(dx) < MIN_DX || Math.abs(dx) < 2 * Math.abs(dy)) return
      // Dedo hacia la izquierda = la vista siguiente (en RTL, al revés)
      if ((dx < 0) !== rtl) onNext()
      else onPrev()
    }
    const cancel = () => {
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', cancel)
    }
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', cancel)
  }

  return { onTouchStart }
}

function scrollsSideways(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const ox = getComputedStyle(n).overflowX
    if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true
  }
  return false
}
