// Estado → "Avisos push": reglas puras que convierten lo que sabe la base (admin_push_status, 20261209000001) y la
// clave pública de esta versión de la web en una lista de pasos con semáforo. La pantalla pone los textos.
// Tests: tests/unit/pushStatus.test.ts.
import type { Level } from './systemStatus'
import { vapidPublicKeyValid } from './vapid'

export type RunResult = 'ok' | 'no_keys' | 'bad_keys' | 'error'

export interface PushStatus {
  checked_at: string
  subscriptions: number
  people: number
  failing: number
  sent_7d: number
  run: {
    last_run_at: string | null
    last_result: RunResult | null
    last_ok_at: string | null
    last_error: string | null
    public_key: string | null
    stats: Record<string, number> | null
  } | null
  shown_24h: number
  opened_24h: number
  cron: { name: string; schedule: string; active: boolean }[] | null
  unauthorized_1h: number | null
}

export type PushCheckId = 'buildKey' | 'function' | 'keys' | 'cron' | 'secret' | 'devices' | 'delivered'

export interface PushCheck {
  id: PushCheckId
  level: Level
  /** La clave del texto en el diccionario (admin → push.checks.<id>.<state>) */
  state: string
  facts: Record<string, number | string | null>
}

/** Los pasos de configuración (los dos últimos sólo informan: no cambian el semáforo de "Avisos push") */
export const SETUP_CHECKS: PushCheckId[] = ['buildKey', 'function', 'keys', 'cron', 'secret']

const minutesSince = (iso: string | null | undefined, now: number) =>
  iso ? Math.max(0, Math.round((now - Date.parse(iso)) / 60_000)) : null

export function pushChecks({ push, buildKey, now }: { push: PushStatus | null; buildKey: string; now: number }): PushCheck[] {
  const key = buildKey.trim().replace(/=+$/, '')
  const keyOk = vapidPublicKeyValid(key)
  const run = push?.run ?? null
  const out: PushCheck[] = []

  // 1. Clave pública en la web: la pone Vercel al construir (VITE_VAPID_PUBLIC_KEY)
  out.push({ id: 'buildKey', level: !key ? 'bad' : keyOk ? 'ok' : 'bad', state: !key ? 'missing' : keyOk ? 'ok' : 'invalid', facts: {} })

  // 2. La función: cada corrida que pasó la clave del cron queda anotada
  const minutes = minutesSince(run?.last_run_at, now)
  let fn: Pick<PushCheck, 'level' | 'state'> = { level: 'unknown', state: 'never' }
  if (push) {
    if (!run || minutes === null) fn = { level: 'bad', state: 'never' }
    else if (minutes > 15) fn = { level: 'bad', state: 'late' }
    else if (run.last_result === 'error') fn = { level: 'warn', state: 'error' }
    else if (minutes > 3) fn = { level: 'warn', state: 'late' }
    else fn = { level: 'ok', state: 'ok' }
  }
  out.push({ id: 'function', ...fn, facts: { min: minutes, msg: run?.last_error ?? null } })

  // 3. Las claves de la función: que estén, que estén bien copiadas y que la pública sea la misma que la de la web
  let keys: Pick<PushCheck, 'level' | 'state'> = { level: 'unknown', state: 'waiting' }
  if (run?.last_result === 'no_keys') keys = { level: 'bad', state: 'missing' }
  else if (run?.last_result === 'bad_keys') keys = { level: 'bad', state: 'invalid' }
  else if (run?.last_result === 'ok' || run?.last_result === 'error') {
    keys = keyOk && run.public_key && run.public_key !== key ? { level: 'bad', state: 'mismatch' } : { level: 'ok', state: 'ok' }
  }
  out.push({ id: 'keys', ...keys, facts: {} })

  // 4. La tarea de pg_cron que la llama cada minuto
  let cron: Pick<PushCheck, 'level' | 'state'> = { level: 'unknown', state: 'noCron' }
  if (push && push.cron) {
    if (!push.cron.length) cron = { level: 'bad', state: 'missing' }
    else if (!push.cron.some(j => j.active)) cron = { level: 'warn', state: 'paused' }
    else cron = { level: 'ok', state: 'ok' }
  }
  out.push({ id: 'cron', ...cron, facts: {} })

  // 5. La clave del cron: respuestas 401 de la función a las llamadas de la base
  const rejected = push?.unauthorized_1h ?? null
  let secret: Pick<PushCheck, 'level' | 'state'> = { level: 'unknown', state: 'unknown' }
  if (rejected !== null && rejected > 0) secret = { level: 'bad', state: 'bad' }
  else if (fn.level === 'ok' || fn.level === 'warn') secret = { level: 'ok', state: 'ok' }
  out.push({ id: 'secret', ...secret, facts: { n: rejected } })

  // 6 y 7. Sólo informan: quién permitió los avisos y cuántos llegaron
  out.push({
    id: 'devices',
    level: !push ? 'unknown' : push.subscriptions > 0 ? 'ok' : 'unknown',
    state: push && push.subscriptions > 0 ? 'some' : 'none',
    facts: { n: push?.subscriptions ?? null, people: push?.people ?? null, failing: push?.failing ?? null },
  })
  out.push({
    id: 'delivered',
    level: !push ? 'unknown' : push.shown_24h > 0 ? 'ok' : 'unknown',
    state: push && push.shown_24h > 0 ? 'some' : 'none',
    facts: { shown: push?.shown_24h ?? null, opened: push?.opened_24h ?? null },
  })
  return out
}

/** Semáforo de "Avisos push": el peor de los pasos de configuración */
export function pushLevel(checks: PushCheck[]): Level {
  const levels = checks.filter(c => SETUP_CHECKS.includes(c.id)).map(c => c.level)
  if (levels.includes('bad')) return 'bad'
  if (levels.includes('warn')) return 'warn'
  if (levels.every(l => l === 'unknown')) return 'unknown'
  return levels.includes('unknown') ? 'warn' : 'ok'
}
