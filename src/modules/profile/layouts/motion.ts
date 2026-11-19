import { useLayoutEffect, useRef, type RefObject } from 'react'
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

/**
 * La huella de la tapa sigue apenas al mouse (compu) o a la inclinación del celular (Android: el iPhone pide permiso
 * para eso y no se lo pedimos a nadie). Escribe --mp-tx / --mp-ty (-1…1) en el elemento; el CSS las usa con
 * `translate`. Quieto con "reducir movimiento" y en la vista previa.
 */
export function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled || window.matchMedia?.(REDUCE).matches) return
    let frame = 0
    const set = (x: number, y: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mp-tx', Math.max(-1, Math.min(1, x)).toFixed(3))
        el.style.setProperty('--mp-ty', Math.max(-1, Math.min(1, y)).toFixed(3))
      })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      set(e.gamma / 30, (e.beta - 45) / 30)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('deviceorientation', onTilt, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('deviceorientation', onTilt)
      cancelAnimationFrame(frame)
    }
  }, [enabled])
  return ref
}

/** Lo que se inclina al pasar el mouse (tarjetas con foto). Con el dedo, nada: el toque ya responde con su escala. */
const TILT_TARGETS = '.mp-project, .mp-portfolio-item, .mp-cards-item, .mp-link-card'
const TILT_MAX = 4

/**
 * En la compu, las tarjetas con foto se inclinan apenas hacia el mouse (hasta 4°) y vuelven al salir. Un solo par
 * de eventos en la grilla de módulos (no uno por tarjeta). Escribe --mp-rx / --mp-ry y la clase `mp-tilting`; el CSS
 * (profile-motion.css) arma el giro con `perspective`. Sólo con mouse (`pointerType`): con el dedo o el lápiz, nada.
 * Quieto con "reducir movimiento" y en la vista previa.
 */
export function useCardTilt(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !enabled || window.matchMedia?.(REDUCE).matches) return
    let current: HTMLElement | null = null
    let frame = 0
    const reset = () => {
      if (!current) return
      current.classList.remove('mp-tilting')
      current.style.removeProperty('--mp-rx')
      current.style.removeProperty('--mp-ry')
      current = null
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(TILT_TARGETS) ?? null
      if (card !== current) { reset(); current = card }
      if (!card) return
      const x = e.clientX, y = e.clientY
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect()
        if (!r.width || !r.height) return
        const px = Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1))
        const py = Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1))
        card.style.setProperty('--mp-rx', `${(-py * TILT_MAX).toFixed(2)}deg`)
        card.style.setProperty('--mp-ry', `${(px * TILT_MAX).toFixed(2)}deg`)
        card.classList.add('mp-tilting')
      })
    }
    const onLeave = () => { cancelAnimationFrame(frame); reset() }
    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      onLeave()
    }
  }, [ref, enabled])
}
