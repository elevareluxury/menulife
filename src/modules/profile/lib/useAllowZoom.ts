import { useEffect } from 'react'

/**
 * Las páginas públicas permiten hacer zoom (WCAG 1.4.4). El index.html lo bloquea para la app
 * (formularios de Business/Studio); acá se libera y al salir se restaura.
 */
export function useAllowZoom() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return
    const prev = meta.content
    meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover'
    return () => { meta.content = prev }
  }, [])
}
