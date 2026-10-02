import { useEffect, useState } from 'react'

/** Fecha local YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * "Hoy" que se actualiza solo a medianoche y al volver a la app
 * (si quedó abierta de un día para otro, no sigue marcando el día anterior).
 */
export function useToday(): string {
  const [today, setToday] = useState(dayKey)
  useEffect(() => {
    const refresh = () => setToday(prev => (prev === dayKey() ? prev : dayKey()))
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime()
    const timer = window.setTimeout(refresh, nextMidnight)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [today])
  return today
}
