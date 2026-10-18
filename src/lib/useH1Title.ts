import { useEffect } from 'react'

/**
 * Título de la pestaña = el título visible de la pantalla (su h1, ya traducido) + `suffix`, por ejemplo
 * "Analítica · Mycen Studio". Las pantallas se cargan aparte y cambian de idioma: se sigue el h1 mientras se navega.
 * Al salir vuelve el título de antes.
 */
export function useH1Title(suffix: string) {
  useEffect(() => {
    const prev = document.title
    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h1 = document.querySelector('main h1, h1')?.textContent?.trim()
        const next = h1 ? `${h1} · ${suffix}` : suffix
        if (document.title !== next) document.title = next
      })
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => { observer.disconnect(); cancelAnimationFrame(frame); document.title = prev }
  }, [suffix])
}
