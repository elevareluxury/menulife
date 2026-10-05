import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  // El navegador no restaura posiciones viejas: cada pantalla arranca arriba de todo
  window.history.scrollRestoration = 'manual'
}

/** Al cambiar de pantalla, vuelve al inicio (salvo links a una sección: /#precios). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useLayoutEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    // Life OS y Studio scrollean dentro de su propio contenedor
    document.querySelectorAll<HTMLElement>('[data-scroll-root]').forEach(el => { el.scrollTop = 0 })
  }, [pathname, hash])
  return null
}
