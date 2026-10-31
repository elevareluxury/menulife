import { useEffect } from 'react'
import { publicRpc } from '@/lib/publicRpc'
import { isNativeApp, nativePlatform } from '@/lib/platform'
import { useAppLang } from '@/i18n/app/store'

// "Usé Mycen hoy" (panel → Crecimiento): una marca por persona, día (UTC, igual que la base) y zona (Life OS o
// Studio) en user_activity_days, con la plataforma, el idioma de la app y la zona horaria del dispositivo. Nunca IP
// ni lo que hizo. Se manda una sola vez por día y zona desde cada dispositivo; si falla, se ignora.

export type ActivityArea = 'life' | 'studio'
export type ActivityPlatform = 'web' | 'pwa' | 'ios' | 'android'

export function activityPlatform(): ActivityPlatform {
  if (isNativeApp()) {
    const p = nativePlatform()
    return p === 'web' ? 'web' : p
  }
  try {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    return standalone ? 'pwa' : 'web'
  } catch {
    return 'web'
  }
}

/** Zona horaria del dispositivo (sólo el nombre IANA, p. ej. "America/Argentina/Buenos_Aires") */
export function deviceTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz) && tz.length <= 64 ? tz : null
  } catch {
    return null
  }
}

/** Clave del día en UTC: la base guarda el día así para que todas las cuentas cuenten igual */
export function activityDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function markActive(userId: string, area: ActivityArea, now = new Date()): void {
  const key = `mycen.active.${userId}.${area}`
  const day = activityDayKey(now)
  try {
    if (localStorage.getItem(key) === day) return
    localStorage.setItem(key, day)
  } catch { /* sin almacenamiento: se manda igual (la base no duplica) */ }
  void publicRpc('mycen_mark_active', {
    p_area: area,
    p_platform: activityPlatform(),
    p_lang: useAppLang.getState().lang,
    p_tz: deviceTimeZone(),
  }).catch(() => undefined)
}

/** Al entrar y cada vez que se vuelve a la pestaña (si cambió el día, cuenta el día nuevo) */
export function useMarkActive(userId: string | undefined, area: ActivityArea): void {
  useEffect(() => {
    if (!userId) return
    const mark = () => { if (document.visibilityState === 'visible') markActive(userId, area) }
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [userId, area])
}
