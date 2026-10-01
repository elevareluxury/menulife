import { useEffect } from 'react'

/**
 * Pinta html y body con el fondo de la app mientras está montada.
 * Evita franjas de otro color (y flashes) cuando el navegador muestra el borde de la página.
 */
export function useAppBackground(color: string) {
  useEffect(() => {
    const html = document.documentElement
    const prevHtml = html.style.background
    const prevBody = document.body.style.background
    html.style.background = color
    document.body.style.background = color
    return () => {
      html.style.background = prevHtml
      document.body.style.background = prevBody
    }
  }, [color])
}
