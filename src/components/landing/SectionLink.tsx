import { useEffect, useRef } from 'react'

/**
 * Hilo entre dos secciones de la landing: una línea con el degradé de la marca y un nodo en el medio, montada sobre el
 * borde (no ocupa lugar). Al entrar en pantalla se dibuja y una luz la recorre: la página se lee como un solo recorrido.
 * Sin texto. Con "reducir movimiento" queda dibujada y quieta (landing-motion.css).
 */
export function SectionLink() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      el.classList.add('is-in')
      io.disconnect()
    }, { rootMargin: '0px 0px -15% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="ml-link" aria-hidden="true">
      <div ref={ref} className="ml-link-thread">
        <span className="ml-link-line" />
        <span className="ml-link-pulse" />
        <span className="ml-link-node" />
      </div>
    </div>
  )
}
