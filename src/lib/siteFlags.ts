import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'

// Interruptores del sitio que prende el super-admin (Super-admin → Landing), sin publicar una versión nueva:
// RPC `get_site_flags` (tabla `mycen_site_flags`). Hoy: `business` = mostrar Mycen Business en la landing (sección,
// precios, menú y preguntas; quien ya tiene un negocio lo sigue usando igual). Mientras no llega la respuesta (o si
// falla) vale lo último visto en el dispositivo; si no, apagado.

export interface SiteFlags { business: boolean }

const KEY = 'mycen_site_flags'
const OFF: SiteFlags = { business: false }

function cached(): SiteFlags {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) as Partial<SiteFlags> : null
    return { business: v?.business === true }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('get_site_flags')
        if (!error && data && typeof data === 'object') set({ business: (data as Partial<SiteFlags>).business === true })
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

/** Después de cambiarlo en el panel: que la pestaña lo vea enseguida. */
export function setSiteFlagsLocal(next: SiteFlags) {
  set(next)
}
