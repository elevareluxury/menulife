import { useEffect } from 'react'

// Con una hoja o un diálogo abierto, lo de atrás queda quieto. Life OS y Studio no scrollean la página sino su marco
// (`[data-scroll-root]`), así que bloquear sólo <body> no alcanzaba: en el iPhone, arrastrar sobre la hoja movía el
// marco de atrás (y la hoja con el rebote). Se cuentan las hojas abiertas: la última que se cierra desbloquea.

let locks = 0
let saved: { el: HTMLElement; overflow: string; overscroll: string }[] = []
let bodyStyle = { overflow: '', overscroll: '' }

function lock() {
  if (locks++ > 0) return
  const body = document.body
  bodyStyle = { overflow: body.style.overflow, overscroll: body.style.overscrollBehavior }
  body.style.overflow = 'hidden'
  body.style.overscrollBehavior = 'none'
  saved = [...document.querySelectorAll<HTMLElement>('[data-scroll-root]')].map(el => {
    const prev = { el, overflow: el.style.overflowY, overscroll: el.style.overscrollBehavior }
    el.style.overflowY = 'hidden'
    el.style.overscrollBehavior = 'none'
    return prev
  })
}

function unlock() {
  if (--locks > 0) return
  locks = 0
  document.body.style.overflow = bodyStyle.overflow
  document.body.style.overscrollBehavior = bodyStyle.overscroll
  for (const s of saved) {
    s.el.style.overflowY = s.overflow
    s.el.style.overscrollBehavior = s.overscroll
  }
  saved = []
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return
    lock()
    return unlock
  }, [active])
}
