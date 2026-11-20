import { useSyncExternalStore } from 'react'
import { publicRpc } from '@/lib/publicRpc'

// Interruptores del sitio que cambia el super-admin, sin publicar una versión nueva: RPC `get_site_flags` (tabla
// `mycen_site_flags`).
//   · `business` = mostrar Mycen Business en la landing (Super-admin → Landing; apagado salvo que se prenda).
//   · De emergencia (Super-admin → Estado; prendidos salvo que se apaguen): `signups` (registros), `messages`
//     (contacto y colaboraciones), `subscriptions` y `polls`. La base los frena de verdad (503 FEATURE_PAUSED en las
//     RPC y un trigger en los registros); acá sólo sirven para explicarlo antes de que la persona lo intente.
// Mientras no llega la respuesta (o si falla) vale lo último visto en el dispositivo; si no, lo de arriba.

export interface SiteFlags { business: boolean; signups: boolean; messages: boolean; subscriptions: boolean; polls: boolean }

const KEY = 'mycen_site_flags'
const OFF: SiteFlags = { business: false, signups: true, messages: true, subscriptions: true, polls: true }

/** Lo que llega de la base (o del dispositivo), con los valores de siempre para lo que falte */
export function readSiteFlags(v: Partial<Record<keyof SiteFlags, unknown>> | null | undefined): SiteFlags {
  return {
    business: v?.business === true,
    signups: v?.signups !== false,
    messages: v?.messages !== false,
    subscriptions: v?.subscriptions !== false,
    polls: v?.polls !== false,
  }
}

function cached(): SiteFlags {
  try {
    const raw = localStorage.getItem(KEY)
    return readSiteFlags(raw ? JSON.parse(raw) as Partial<SiteFlags> : null)
  } catch {
    return OFF
  }
}

let flags: SiteFlags | null = null
let loading: Promise<SiteFlags> | null = null
const listeners = new Set<() => void>()

function set(next: SiteFlags) {
  flags = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
  listeners.forEach(l => l())
}

/** Pide los interruptores a la base (una vez por carga de la página). */
export function loadSiteFlags(): Promise<SiteFlags> {
  if (!loading) {
    loading = (async () => {
      try {
        const { data, error } = await publicRpc('get_site_flags')
        if (!error && data && typeof data === 'object') set(readSiteFlags(data as Partial<SiteFlags>))
      } catch { /* sin red: queda lo último visto */ }
      return current()
    })()
  }
  return loading
}

function current(): SiteFlags {
  if (!flags) flags = cached()
  return flags
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  void loadSiteFlags()
  return () => { listeners.delete(cb) }
}

export function useSiteFlags(): SiteFlags {
  return useSyncExternalStore(subscribe, current, () => OFF)
}

/**
 * Vuelve a preguntar (sin lo guardado de esta carga): un registro que falló con un error del servidor puede ser el
 * interruptor de registros recién apagado.
 */
export async function signupsPausedNow(): Promise<boolean> {
  try {
    const { data, error } = await publicRpc('get_site_flags')
    if (error || !data || typeof data !== 'object') return false
    const next = readSiteFlags(data as Partial<SiteFlags>)
    set(next)
    return !next.signups
  } catch {
    return false
  }
}

/** Después de cambiarlo en el panel: que la pestaña lo vea enseguida. */
export function setSiteFlagsLocal(next: SiteFlags) {
  set(next)
}
