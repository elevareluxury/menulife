// Lo que se está editando sobrevive si el celular descarta la pestaña (o la app) en segundo plano y la recarga al
// volver: qué editor estaba abierto y lo escrito sin guardar quedan en sessionStorage (sólo esta pestaña) un rato.

const PREFIX = 'mycen_draft:'
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export function readDraft<T>(key: string, now = Date.now()): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { at, value } = JSON.parse(raw) as { at: number; value: T }
    if (typeof at !== 'number' || now - at > MAX_AGE_MS) { sessionStorage.removeItem(PREFIX + key); return null }
    return value
  } catch {
    return null
  }
}

export function writeDraft(key: string, value: unknown, now = Date.now()): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ at: now, value }))
  } catch { /* sin lugar o bloqueado: se sigue sin borrador */ }
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch { /* nada que limpiar */ }
}
