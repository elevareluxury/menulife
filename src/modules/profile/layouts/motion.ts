import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

/**
 * Movimiento del perfil público (CSS en profile-motion.css). `inAt(n)` = posición en la cascada de entrada
 * (0 foto/huella, 1 nombre, 2 descriptor, 3 estado, 4 etiquetas, 5 bio, 6 acciones, 7+ módulos).
 */
export const inAt = (n: number) => ({ '--mp-i': n }) as CSSProperties

const REDUCE = '(prefers-reduced-motion: reduce)'

/**
 * Los módulos que al abrir quedan debajo de la pantalla aparecen suaves al llegar a ellos. Lo oculto lo pone sólo
 * este efecto (clase `mp-reveal`): sin JS, sin IntersectionObserver, con "reducir movimiento" o en la vista previa
 * de Studio, todo se ve desde el principio. Lo que ya se ve al abrir entra con la cascada normal.
 */
export function useReveal<T extends HTMLElement>(key: string, enabled: boolean) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !enabled || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.(REDUCE).matches) return
    const fold = window.innerHeight * 0.95
    const below = ([...root.children] as HTMLElement[]).filter(el => el.getBoundingClientRect().top > fold)
    if (!below.length) return
    let batch = 0
    const io = new IntersectionObserver(entries => {
      batch = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        // Aparecen un poco antes de llegar (al bajar rápido no se ven tarjetas vacías). Si entran varios juntos (scroll rápido), se escalonan un poco
        el.style.setProperty('--mp-r', String(batch++))
        el.classList.add('mp-revealed')
        io.unobserve(el)
      }
    }, { rootMargin: '0px 0px 20% 0px', threshold: 0.01 })
    for (const el of below) { el.classList.add('mp-reveal'); io.observe(el) }
    return () => {
      io.disconnect()
      for (const el of below) { el.classList.remove('mp-reveal', 'mp-revealed'); el.style.removeProperty('--mp-r') }
    }
  }, [key, enabled])
  return ref
}
