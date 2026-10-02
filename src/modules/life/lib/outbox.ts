import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { lifeT } from '@/i18n/app/life'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'

// Capturas sin conexión: si el + no puede guardar por falta de red, la fila queda en este
// dispositivo (con su id ya generado) y se sube sola al volver la conexión. Subir dos veces
// la misma fila no la duplica: se usa upsert por id ignorando duplicados.

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

export function enqueue(item: OutboxItem) {
  write([...read().filter(i => i.row.id !== item.row.id), item])
}

let flushing = false

/** Sube lo pendiente. Lo que falla por red queda para el próximo intento. */
export async function flushOutbox(): Promise<void> {
  if (flushing) return
  const items = read()
  if (!items.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
  flushing = true
  const modules = new Set<string>()
  try {
    for (const item of items) {
      const { error } = await db.from(item.table).upsert(item.row, { onConflict: 'id', ignoreDuplicates: true })
      if (error && isOfflineError(error)) break
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

let cache = { pending: 0, offline: false }
function snapshot() {
  const next = { pending: read().length, offline: typeof navigator !== 'undefined' && navigator.onLine === false }
  if (next.pending !== cache.pending || next.offline !== cache.offline) cache = next
  return cache
}

/** Cantidad de capturas pendientes y si el dispositivo está sin conexión. */
export function useOutbox() {
  return useSyncExternalStore(subscribe, snapshot, () => cache)
}
