import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { trackEvent, type ReminderChannel, type ReminderKind } from '@/lib/productEvents'

// Recordatorios tocados: el aviso abre su pantalla con ?aviso=<task|habit>.<app|push> (lo agrega la app al mostrarlo y
// la Edge Function life-reminders en los push, ver supabase/functions/life-reminders/payload.ts). Al llegar, Life OS
// registra reminder_opened una vez y saca el parámetro de la dirección.

export const REMINDER_PARAM = 'aviso'

/** La pantalla del aviso con la marca de qué recordatorio y por qué canal (sin nada del contenido) */
export function reminderUrl(path: string, kind: ReminderKind, channel: ReminderChannel): string {
  const [base, hash = ''] = path.split('#')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${REMINDER_PARAM}=${kind}.${channel}${hash ? `#${hash}` : ''}`
}

export function parseReminderParam(raw: string | null): { kind: ReminderKind; channel: ReminderChannel } | null {
  const m = raw?.match(/^(task|habit)\.(app|push)$/)
  return m ? { kind: m[1] as ReminderKind, channel: m[2] as ReminderChannel } : null
}

// Entradas ya registradas (por la clave de la navegación): en desarrollo el efecto corre dos veces
const handled = new Set<string>()

/** En LifeShell: con la sesión lista, registra el aviso tocado y limpia la dirección */
export function useReminderOpened(userId: string | undefined) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (!userId) return
    const params = new URLSearchParams(location.search)
    if (!params.has(REMINDER_PARAM)) return
    const opened = parseReminderParam(params.get(REMINDER_PARAM))
    params.delete(REMINDER_PARAM)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash },
      { replace: true, state: location.state })
    if (handled.has(location.key)) return
    handled.add(location.key)
    if (opened) trackEvent('reminder_opened', opened)
  }, [userId, location, navigate])
}
