// Recordatorios de Life OS con varias pestañas abiertas: una sola pestaña (la "líder") consulta la base y avisa.
//
//   · Con Web Locks (`navigator.locks`): la líder tiene tomado un candado mientras está abierta; las demás esperan en
//     la cola y, si la líder se cierra, la siguiente lo toma sola.
//   · Sin Web Locks: un "alquiler" en localStorage ({ id, until }) que la líder renueva; si vence, otra lo toma. Al
//     cerrarse avisa por BroadcastChannel para que otra lo tome enseguida.
//   · `remindersChanged()` avisa (a esta pestaña y a las demás) que cambiaron tareas o hábitos: la líder vuelve a leer.
//
// Las funciones puras (alquiler y limpieza de marcas viejas) se prueban en tests/unit/reminderLeader.test.ts.

export const LEASE_TTL_MS = 20_000
const CHANNEL = 'mycen-life-reminders'
const CHANGED_EVENT = 'mycen:life-reminders-changed'
/** = LIFE_DATA_UPDATED de hooks/useBrain (lo que se carga con el +) */
const LIFE_DATA_UPDATED = 'life-data-updated'

export interface Lease { id: string; until: number }

export function parseLease(raw: string | null): Lease | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Lease>
    return typeof v.id === 'string' && typeof v.until === 'number' ? { id: v.id, until: v.until } : null
  } catch { return null }
}

/** ¿Puede `me` tomar (o renovar) el alquiler? Libre, vencido o ya suyo. */
export function canTakeLease(lease: Lease | null, me: string, now: number): boolean {
  return !lease || lease.id === me || lease.until <= now
}

/**
 * Marcas "ya avisé" de días viejos: `<prefix><id>:<YYYY-MM-DD>` con fecha anterior a `cutoff` (YYYY-MM-DD).
 * Las que no tienen fecha legible también se van (no sirven para nada).
 */
export function staleMarkKeys(keys: readonly string[], prefix: string, cutoff: string): string[] {
  return keys.filter(k => {
    if (!k.startsWith(prefix)) return false
    const day = k.slice(k.lastIndexOf(':') + 1)
    return !/^\d{4}-\d{2}-\d{2}$/.test(day) || day < cutoff
  })
}

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

/** Anota la marca y devuelve true sólo si no estaba (para avisar una sola vez). */
export function claimMark(key: string): boolean {
  const s = storage()
  if (!s) return true
  try {
    if (s.getItem(key)) return false
    s.setItem(key, '1')
    return true
  } catch { return true }
}

/** Borra las marcas de más de `days` días (cutoff = fecha local YYYY-MM-DD de ese día). */
export function cleanOldMarks(prefix: string, cutoff: string) {
  const s = storage()
  if (!s) return
  try {
    const keys: string[] = []
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k) keys.push(k) }
    staleMarkKeys(keys, prefix, cutoff).forEach(k => s.removeItem(k))
  } catch { /* storage bloqueado */ }
}

function channel(): BroadcastChannel | null {
  try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL) } catch { return null }
}

/** Cambiaron tareas o hábitos: la pestaña líder (esta u otra) vuelve a leer. */
export function remindersChanged() {
  // El canal llega también a los oyentes de esta misma pestaña (son otros objetos BroadcastChannel)
  const ch = channel()
  if (ch) { ch.postMessage({ type: 'changed' }); ch.close() } else window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** Escucha `remindersChanged()` de esta pestaña y de las demás. */
export function onRemindersChanged(fn: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, fn)
  window.addEventListener(LIFE_DATA_UPDATED, fn)
  const ch = channel()
  const onMsg = (e: MessageEvent) => { if ((e.data as { type?: string })?.type === 'changed') fn() }
  ch?.addEventListener('message', onMsg)
  return () => {
    window.removeEventListener(CHANGED_EVENT, fn)
    window.removeEventListener(LIFE_DATA_UPDATED, fn)
    ch?.removeEventListener('message', onMsg)
    ch?.close()
  }
}

/**
 * Elige una sola pestaña líder para `name`. `onLeader` corre cuando esta pestaña pasa a serlo y devuelve su limpieza
 * (se llama al dejar de serlo o al cerrar). Devuelve la función para soltar.
 */
export function electLeader(name: string, onLeader: () => () => void): () => void {
  let stopLeading: (() => void) | null = null
  const lead = () => { if (!stopLeading) stopLeading = onLeader() }
  const unlead = () => { stopLeading?.(); stopLeading = null }

  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks?.request) {
    const ac = new AbortController()
    let release: (() => void) | null = null
    locks.request(name, { signal: ac.signal }, () => {
      lead()
      return new Promise<void>(res => { release = res })
    }).catch(() => { /* abortado al cerrar */ })
    return () => { ac.abort(); release?.(); unlead() }
  }

  // Sin Web Locks: alquiler en localStorage
  const s = storage()
  if (!s) { lead(); return unlead }
  const key = `mycen-lease:${name}`
  const me = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const read = () => { try { return parseLease(s.getItem(key)) } catch { return null } }
  let verify: number | undefined
  const tick = () => {
    const now = Date.now()
    if (!canTakeLease(read(), me, now)) { unlead(); return }
    try { s.setItem(key, JSON.stringify({ id: me, until: now + LEASE_TTL_MS })) } catch { return }
    // localStorage no tiene "comparar y cambiar": si dos escribieron a la vez, gana la última escritura
    window.clearTimeout(verify)
    verify = window.setTimeout(() => { if (read()?.id === me) lead(); else unlead() }, 150)
  }
  const ch = channel()
  const onMsg = (e: MessageEvent) => { if ((e.data as { type?: string })?.type === 'released') tick() }
  ch?.addEventListener('message', onMsg)
  tick()
  const timer = window.setInterval(tick, LEASE_TTL_MS / 3)
  return () => {
    window.clearInterval(timer)
    window.clearTimeout(verify)
    if (read()?.id === me) {
      try { s.removeItem(key) } catch { /* nada */ }
      ch?.postMessage({ type: 'released' })
    }
    ch?.removeEventListener('message', onMsg)
    ch?.close()
    unlead()
  }
}

/** Cada cuánto se miran las horas (sin ir a la base) y cada cuánto, como mucho, se vuelve a leer la base. */
export const TICK_MS = 30_000
export const REFETCH_MS = 5 * 60_000

/**
 * Bucle de recordatorios de la pestaña líder: lee la base al empezar, al volver a la pestaña, cuando cambian tareas o
 * hábitos (`remindersChanged`) y cada REFETCH_MS; entre lecturas, cada TICK_MS sólo compara horas con lo que ya tiene.
 */
export function reminderLoop<T>(load: () => Promise<T | null>, check: (data: T) => Promise<void> | void): () => void {
  let stopped = false
  let data: T | null = null
  let fetchedAt = 0
  let busy = false
  let again = false

  const run = async (refetch: boolean) => {
    if (busy) { again ||= refetch; return }
    busy = true
    try {
      if (refetch || data === null || Date.now() - fetchedAt >= REFETCH_MS) {
        const fresh = await load()
        if (stopped) return
        if (fresh !== null) { data = fresh; fetchedAt = Date.now() }
      }
      if (data !== null && !stopped) await check(data)
    } catch { /* sin red: se intenta en el próximo tick */ } finally {
      busy = false
      if (again && !stopped) { again = false; void run(true) }
    }
  }

  const refresh = () => { void run(true) }
  const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', onVisible)
  const offChanged = onRemindersChanged(refresh)
  const timer = window.setInterval(() => { void run(false) }, TICK_MS)
  refresh()
  return () => {
    stopped = true
    window.clearInterval(timer)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', onVisible)
    offChanged()
  }
}
