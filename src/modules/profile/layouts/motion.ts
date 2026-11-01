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
