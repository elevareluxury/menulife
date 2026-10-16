import { useCallback, useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { lifeT } from '@/i18n/app/life'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'

// Capturas sin conexión: si el + no puede guardar por falta de red, la fila queda en este
// dispositivo (con su id ya generado) y se sube sola al volver la conexión. Subir dos veces
// la misma fila no la duplica: se usa upsert por id ignorando duplicados.
// Cada fila lleva su user_id: sólo se sube (y se cuenta como pendiente) con la sesión de esa cuenta. Si en el mismo
// dispositivo entra otra persona, lo de la primera queda guardado para cuando vuelva (no se pierde ni se le muestra).

const db = supabase as unknown as SupabaseClient
const KEY = 'mycen_life_outbox'
const CHANGED = 'mycen-outbox-changed'

export type OutboxTable = 'life_brain_items' | 'life_transactions' | 'life_goals'
export interface OutboxItem { table: OutboxTable; row: Record<string, unknown> & { id: string }; module: 'brain' | 'money' | 'goals' }

function read(): OutboxItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as OutboxItem[] } catch { return [] }
}
function write(items: OutboxItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* sin almacenamiento: no hay cola */ }
  window.dispatchEvent(new Event(CHANGED))
}

/** ¿El error es por falta de conexión (y no un error de datos)? */
export function isOfflineError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : ''
  return /Failed to fetch|NetworkError|Load failed|network/i.test(msg)
}

/** ¿El error es de sesión (token vencido o sin permiso todavía)? Se reintenta después, no se descarta. */
export function isAuthError(e: unknown): boolean {
  const o = (typeof e === 'object' && e) ? e as { code?: unknown; message?: unknown; status?: unknown } : {}
  return o.status === 401 || /^PGRST30\d$/.test(String(o.code ?? '')) || /JWT/i.test(String(o.message ?? ''))
}

/** Es de esa cuenta (las filas viejas sin user_id se suben con cualquier sesión, como antes). */
const belongsTo = (item: OutboxItem, userId: string | null | undefined) =>
  !item.row.user_id || (!!userId && item.row.user_id === userId)

/**
 * Deja la fila en la cola. Devuelve false si el dispositivo no la pudo guardar (almacenamiento lleno o bloqueado):
 * entonces quien llama tiene que avisar que no se guardó, en vez de decir "se sube después".
 */
export function enqueue(item: OutboxItem): boolean {
  write([...read().filter(i => i.row.id !== item.row.id), item])
  return read().some(i => i.row.id === item.row.id)
}

let flushing = false

/** Sube lo pendiente de `userId`. Lo que falla por red o por la sesión queda para el próximo intento. */
export async function flushOutbox(userId: string): Promise<void> {
  if (flushing) return
  const items = read().filter(i => belongsTo(i, userId))
  if (!items.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
  flushing = true
  const modules = new Set<string>()
  try {
    for (const item of items) {
      const { error } = await db.from(item.table).upsert(item.row, { onConflict: 'id', ignoreDuplicates: true })
      if (error && (isOfflineError(error) || isAuthError(error))) break
      // Subida (o rechazada por datos inválidos: no se reintenta para siempre)
      write(read().filter(i => i.row.id !== item.row.id))
      if (!error) modules.add(item.module)
      else toast.error(lifeT().offline.failed(String(item.row.title ?? item.row.name ?? item.row.category ?? '')))
    }
  } finally {
    flushing = false
  }
  modules.forEach(module => window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module } })))
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGED, cb)
  window.addEventListener('storage', cb)
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener(CHANGED, cb)
    window.removeEventListener('storage', cb)
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** Cuántas filas de esa cuenta esperan subirse. */
export function pendingFor(userId: string | null | undefined): number {
  return read().filter(i => belongsTo(i, userId)).length
}

let cache = { pending: 0, offline: false, user: null as string | null }
function snapshotFor(userId: string | null) {
  const next = { pending: pendingFor(userId), offline: typeof navigator !== 'undefined' && navigator.onLine === false, user: userId }
  if (next.pending !== cache.pending || next.offline !== cache.offline || next.user !== cache.user) cache = next
  return cache
}

/** Cantidad de capturas pendientes de la cuenta con sesión y si el dispositivo está sin conexión. */
export function useOutbox() {
  const userId = useAuthStore(s => s.user?.id ?? null)
  const snapshot = useCallback(() => snapshotFor(userId), [userId])
  return useSyncExternalStore(subscribe, snapshot, () => cache)
}
