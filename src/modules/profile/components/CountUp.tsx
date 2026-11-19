import { useEffect, useRef, useState } from 'react'

/**
 * Número que cuenta hasta su valor la primera vez que se ve. Decorativo (`aria-hidden`): quien lo usa dice el valor
 * de otra forma (las estrellas, un texto para lectores de pantalla). Quieto con "reducir movimiento".
 */
export function CountUp({ value, className, decimals = 1, suffix = '' }: {
  value: number; className?: string; decimals?: number; suffix?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const animate = typeof IntersectionObserver !== 'undefined' && typeof window !== 'undefined'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(animate ? 0 : value)
  const from = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const base = from.current
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 900)
        const v = base + (value - base) * (1 - Math.pow(1 - k, 3))
        from.current = v
        setShown(v)
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [animate, value])
  return <strong ref={ref} className={className} aria-hidden="true">{(animate ? shown : value).toFixed(decimals)}{suffix}</strong>
}
