import { useEffect, useState } from 'react'
import { usePrefs } from '@/lib/prefs'
import { calendarKey, lifeToday, msUntilNextMidnight, resolveTimeZone } from '../lib/zonedTime'

/**
 * Fecha YYYY-MM-DD. Sin argumento: hoy en la zona de la cuenta (`user_settings.timezone`, o la del dispositivo).
 * Con un Date de calendario (`new Date(y, m, d)`): sus campos locales. Para el día de un instante (created_at,
 * completed_at…) usar `lifeDayOf` de lib/zonedTime.
 */
export function dayKey(d?: Date): string {
  return d ? calendarKey(d) : lifeToday()
}

/** Zona que usa Life OS (se actualiza si la persona la cambia en Ajustes). */
export function useLifeTimeZone(): string {
  return resolveTimeZone(usePrefs(s => s.timezoneSaved))
}

/**
 * "Hoy" que se actualiza solo a medianoche (en la zona de la cuenta) y al volver a la app
 * (si quedó abierta de un día para otro, no sigue marcando el día anterior).
 */
export function useToday(): string {
  const tz = useLifeTimeZone()
  const [today, setToday] = useState(() => lifeToday())
  useEffect(() => {
    const refresh = () => setToday(prev => (prev === lifeToday() ? prev : lifeToday()))
    refresh()   // por si cambió la zona de la cuenta
    const timer = window.setTimeout(refresh, msUntilNextMidnight(tz) + 5000)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [today, tz])
  return today
}
