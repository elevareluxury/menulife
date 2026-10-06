import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Movimiento de la landing: efectos que se enganchan por atributos, así cada sección sólo marca qué se anima.
//   data-split     → título que entra palabra por palabra (ver SplitText)
//   data-tilt      → tarjeta que se inclina en 3D siguiendo el puntero (y brillo que lo sigue: --mx/--my)
//   data-magnetic  → botón que se acerca al puntero
//   data-parallax  → decoración que se desplaza más lento/rápido que el scroll (valor = intensidad, ej. "0.3")
//   data-rise      → bloque que sube y aparece al entrar en pantalla (en grupo con sus hermanos)
// Con "reducir movimiento" del sistema no se anima nada: todo queda en su lugar, visible.

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const finePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

/** Activa los efectos por atributo dentro de `root`. Se vuelve a enganchar cuando cambia `key` (ej. el idioma). */
export function useLandingMotion(root: React.RefObject<HTMLElement | null>, key: unknown) {
  // Pausa las animaciones CSS de las secciones que no se ven (corre también con "reducir movimiento": no molesta)
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      for (const e of entries) e.target.classList.toggle('ml-paused', !e.isIntersecting)
    }, { rootMargin: '200px 0px' })
    el.querySelectorAll('main > *').forEach(s => io.observe(s))
    return () => io.disconnect()
  }, [root, key])

  useEffect(() => {
    const el = root.current
    if (!el || reducedMotion()) return
    gsap.registerPlugin(ScrollTrigger)
    const cleanups: Array<() => void> = []

    const ctx = gsap.context(() => {
      // Títulos palabra por palabra
      el.querySelectorAll<HTMLElement>('[data-split]').forEach(title => {
        const words = title.querySelectorAll('[data-word]')
        if (!words.length) return
        gsap.fromTo(words,
          { yPercent: 110, opacity: 0, rotate: 4 },
          { yPercent: 0, opacity: 1, rotate: 0, duration: 0.8, ease: 'power4.out', stagger: 0.06,
            scrollTrigger: { trigger: title, start: 'top 88%' } })
      })

      // Bloques que suben en grupo
      const groups = new Map<Element, HTMLElement[]>()
      el.querySelectorAll<HTMLElement>('[data-rise]').forEach(n => {
        const parent = n.parentElement ?? el
        groups.set(parent, [...(groups.get(parent) ?? []), n])
      })
      groups.forEach((items, parent) => {
        gsap.fromTo(items,
          { y: 48, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: parent, start: 'top 85%' } })
      })

      // Parallax de decoraciones
      el.querySelectorAll<HTMLElement>('[data-parallax]').forEach(n => {
        const speed = Number(n.dataset.parallax) || 0.2
        gsap.fromTo(n, { yPercent: -60 * speed }, {
          yPercent: 60 * speed, ease: 'none',
          scrollTrigger: { trigger: n.parentElement ?? n, start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })
    }, el)

    if (finePointer()) {
      // Tarjetas con inclinación 3D
      el.querySelectorAll<HTMLElement>('[data-tilt]').forEach(card => {
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' })
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
        gsap.set(card, { transformPerspective: 900, transformStyle: 'preserve-3d' })
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width
          const py = (e.clientY - r.top) / r.height
          ry((px - 0.5) * 12)
          rx((0.5 - py) * 10)
          card.style.setProperty('--mx', `${px * 100}%`)
          card.style.setProperty('--my', `${py * 100}%`)
        }
        const enter = () => gsap.to(card, { y: -8, scale: 1.02, duration: 0.4, ease: 'power3.out' })
        const leave = () => { rx(0); ry(0); gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }) }
        card.addEventListener('pointermove', move)
        card.addEventListener('pointerenter', enter)
        card.addEventListener('pointerleave', leave)
        cleanups.push(() => {
          card.removeEventListener('pointermove', move)
          card.removeEventListener('pointerenter', enter)
          card.removeEventListener('pointerleave', leave)
          gsap.set(card, { clearProps: 'transform' })
        })
      })

      // Botones magnéticos
      el.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(btn => {
        const x = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' })
        const y = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' })
        const move = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect()
          x((e.clientX - (r.left + r.width / 2)) * 0.3)
          y((e.clientY - (r.top + r.height / 2)) * 0.4)
        }
        const leave = () => { x(0); y(0) }
        btn.addEventListener('pointermove', move)
        btn.addEventListener('pointerleave', leave)
        cleanups.push(() => {
          btn.removeEventListener('pointermove', move)
          btn.removeEventListener('pointerleave', leave)
          gsap.set(btn, { clearProps: 'transform' })
        })
      })
    }

    // Las alturas cambian al cargar el idioma o las fuentes: recalcular disparadores
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300)
    return () => {
      window.clearTimeout(refresh)
      cleanups.forEach(f => f())
      ctx.revert()
    }
  }, [root, key])
}
