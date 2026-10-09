import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Métricas de producto propias (V1 · etapa 14): eventos de uso sin terceros, a product_events por la RPC
// track_product_event. Nunca bloquean la interfaz: se mandan en segundo plano y, si fallan, se ignoran.
// Nada de contenido (títulos de tareas, hábitos, mensajes): sólo el evento y números o etiquetas cortas.

export type ProductEvent =
  | 'signup_started' | 'signup_completed' | 'onboarding_step' | 'profile_published' | 'share_tool_used'
  | 'qr_downloaded' | 'appearance_changed'
  | 'life_my_day_opened' | 'life_priorities_set' | 'life_day_closed' | 'habit_logged' | 'task_completed' | 'life_returned'

/** Claves permitidas (las mismas que valida la base en mycen_valid_event_props) */
export interface ProductEventProps {
  ref?: string
  tipo?: string
  step?: number
  seconds?: number
  platform?: string
  format?: string
  layout?: string
  mode?: string
  count?: number
  achieved?: number
  days?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function trackEvent(event: ProductEvent, props: ProductEventProps = {}): void {
  try {
    const clean = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    void Promise.resolve(db.rpc('track_product_event', { p_event: event, p_props: clean })).catch(() => undefined)
  } catch { /* sin conexión o sin cliente: no importa */ }
}

/** Una vez por sesión del navegador (y clave), para eventos de "abrió" que no hace falta contar de más */
export function trackOncePerSession(key: string, event: ProductEvent, props: ProductEventProps = {}): void {
  try {
    const k = `mycen.ev.${key}`
    if (sessionStorage.getItem(k)) return
    sessionStorage.setItem(k, '1')
  } catch { /* sin almacenamiento: se manda igual */ }
  trackEvent(event, props)
}

/** Segundos desde que se creó la cuenta (para "tiempo hasta publicar") */
export function secondsSinceSignup(): number | undefined {
  const created = useAuthStore.getState().user?.created_at
  const t = created ? Date.parse(created) : NaN
  return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 1000)) : undefined
}
