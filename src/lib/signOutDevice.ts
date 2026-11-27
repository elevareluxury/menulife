// Cerrar sesión siempre olvida la sesión en este dispositivo, aunque no haya conexión.
//
// `auth.signOut()` primero avisa al servidor (/logout). Si eso falla por red, 5xx o tiempo de espera, devuelve el error
// SIN borrar la sesión guardada: la pantalla mostraba "sesión cerrada" pero al recargar (o al renovarse el token)
// volvía a entrar la cuenta anterior, con su diario, su dinero y su bandeja (auditoría de seguridad, C6). Acá, si el
// servidor no contestó, se borran a mano las claves de la sesión (localStorage y la copia nativa de la app) y se
// recarga la página para descartar el cliente en memoria y su temporizador de renovación.
import type { SupabaseClient } from '@supabase/supabase-js'
import { nativeAuthStorage } from '@/lib/nativeAuthStorage'
import { isNativeApp } from '@/lib/platform'
import { dropPushSubscription } from '@/lib/webPushDrop'

type AuthWithKey = { storageKey?: string; stopAutoRefresh?: () => Promise<void> | void }

/** Las claves que guarda supabase-js para una sesión (sesión, verificador de PKCE y usuario) */
export function sessionKeys(storageKey: string): string[] {
  return [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`]
}

/** Borra la sesión guardada en el dispositivo. Devuelve las claves borradas. */
export async function forgetStoredSession(storageKey: string): Promise<string[]> {
  const keys = sessionKeys(storageKey)
  for (const key of keys) {
    try { window.localStorage.removeItem(key) } catch { /* sin almacenamiento */ }
    if (isNativeApp()) await nativeAuthStorage.removeItem(key).catch(() => undefined)
  }
  return keys
}

/**
 * Cierra la sesión. `true` = se cerró del todo (servidor y dispositivo); `false` = el servidor no contestó y se borró
 * sólo en el dispositivo: quien llama tiene que recargar (`window.location.replace`) para soltar el cliente en memoria.
 */
export async function signOutDevice(client: SupabaseClient | { auth: SupabaseClient['auth'] }): Promise<boolean> {
  // Antes de cerrar la sesión (la baja en la base la necesita): el dispositivo deja de recibir los avisos push. Antes
  // lo hacía sólo el botón "Cerrar sesión"; "Salir" del segundo paso, aceptar términos y cambiar la contraseña dejaban
  // el celular recibiendo los recordatorios de la cuenta anterior.
  await dropPushSubscription(client)
  let failed: boolean
  try {
    const { error } = await client.auth.signOut()
    failed = !!error
  } catch {
    failed = true
  }
  if (!failed) return true
  const auth = client.auth as unknown as AuthWithKey
  try { await auth.stopAutoRefresh?.() } catch { /* nada */ }
  if (auth.storageKey) await forgetStoredSession(auth.storageKey)
  return false
}
