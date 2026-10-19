import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { appServiceWorker } from '@/lib/notifications'
import { isNativeApp } from '@/lib/platform'

// Avisos con la app cerrada (Web Push): el dispositivo que permite los avisos se suscribe y el servidor
// (supabase/functions/life-reminders, cada minuto) le manda los recordatorios de Life OS. Sin la clave pública
// (VITE_VAPID_PUBLIC_KEY) o en un navegador sin push, todo sigue como antes: avisa la app abierta.
// En la app de iOS/Android no se usa: ahí los recordatorios se programan en el teléfono (nativeReminders.ts).

const db = supabase as unknown as SupabaseClient
const PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || ''

export function webPushAvailable(): boolean {
  return !!PUBLIC_KEY && typeof window !== 'undefined' && 'PushManager' in window
    && 'serviceWorker' in navigator && !isNativeApp()
}

/** Clave VAPID (base64url) en bytes, como la pide pushManager.subscribe */
export function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4)
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false
  const x = new Uint8Array(a)
  return x.length === b.length && x.every((v, i) => v === b[i])
}

/**
 * Suscribe este dispositivo a la cuenta con sesión (con los avisos ya permitidos). Se llama al permitirlos y al abrir
 * Life OS: si el navegador cambió la suscripción o la clave del servidor es otra, se renueva. Silencioso si no se puede.
 */
export async function syncPushSubscription(): Promise<boolean> {
  if (!webPushAvailable() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    if (!(await appServiceWorker())) return false
    const reg = await navigator.serviceWorker.ready
    const key = keyBytes(PUBLIC_KEY)
    let sub = await reg.pushManager.getSubscription()
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe()
      sub = null
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    const { endpoint, keys } = sub.toJSON()
    if (!endpoint || !keys?.p256dh || !keys?.auth) return false
    const { error } = await db.rpc('life_push_subscribe', {
      p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth,
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      p_user_agent: navigator.userAgent.slice(0, 300),
    })
    return !error
  } catch {
    return false
  }
}

/** Al cerrar sesión: este dispositivo deja de recibir los avisos de la cuenta (en un celular compartido, de otra). */
export async function dropPushSubscription(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    if (!sub) return
    // Con la sesión todavía abierta (la función borra sólo las de la cuenta); sin esperar de más si no hay red
    await Promise.race([
      db.rpc('life_push_unsubscribe', { p_endpoint: sub.endpoint }),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ])
    await sub.unsubscribe()
  } catch { /* sin red o sin push: no hay nada que hacer */ }
}
