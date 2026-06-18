import { useState, useEffect } from 'react'

/** Animates a number from 0 to `target` over `duration` ms using easeOutCubic. */
export function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const startTime = Date.now()
    const ids = { raf: 0 }

    function tick() {
      const progress = Math.min((Date.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) { ids.raf = requestAnimationFrame(tick) }
    }

    ids.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ids.raf)
  }, [target, duration])

  return value
}
