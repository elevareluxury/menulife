import { describe, expect, it } from 'vitest'
import { pushChecks, pushLevel, type PushStatus } from '@/modules/super-admin/lib/pushStatus'
import { generateVapidKeys } from '@/modules/super-admin/lib/vapid'

// Estado → "Avisos push": de lo que sabe la base y la clave de la web, a un semáforo por paso

const NOW = Date.parse('2026-11-27T12:00:00Z')
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString()

function status(over: Partial<PushStatus> = {}, run: Partial<NonNullable<PushStatus['run']>> | null = {}): PushStatus {
  return {
    checked_at: ago(0), subscriptions: 3, people: 2, failing: 0, sent_7d: 2, shown_24h: 4, opened_24h: 1,
    cron: [{ name: 'life-reminders', schedule: '* * * * *', active: true }], unauthorized_1h: 0,
    run: run === null ? null : { last_run_at: ago(1), last_result: 'ok', last_ok_at: ago(1), last_error: null, public_key: null, stats: null, ...run },
    ...over,
  }
}
const level = (checks: ReturnType<typeof pushChecks>, id: string) => checks.find(c => c.id === id)!
const keyP = generateVapidKeys()

describe('pushChecks', () => {
  it('todo configurado: verde de punta a punta', async () => {
    const { publicKey } = await keyP
    const checks = pushChecks({ push: status({}, { public_key: publicKey }), buildKey: publicKey, now: NOW })
    expect(checks.map(c => [c.id, c.level])).toEqual([
      ['buildKey', 'ok'], ['function', 'ok'], ['keys', 'ok'], ['cron', 'ok'], ['secret', 'ok'], ['devices', 'ok'], ['delivered', 'ok'],
    ])
    expect(pushLevel(checks)).toBe('ok')
  })

  it('nada hecho todavía: falta la clave de la web, la función nunca corrió y no hay tarea', () => {
    const checks = pushChecks({ push: status({ cron: [], subscriptions: 0, people: 0, shown_24h: 0 }, null), buildKey: '', now: NOW })
    expect(level(checks, 'buildKey')).toMatchObject({ level: 'bad', state: 'missing' })
    expect(level(checks, 'function')).toMatchObject({ level: 'bad', state: 'never' })
    expect(level(checks, 'keys')).toMatchObject({ level: 'unknown', state: 'waiting' })
    expect(level(checks, 'cron')).toMatchObject({ level: 'bad', state: 'missing' })
    expect(level(checks, 'devices')).toMatchObject({ level: 'unknown', state: 'none' })
    expect(pushLevel(checks)).toBe('bad')
  })

  it('la función corre pero sin claves (antes respondía 200 y se veía en verde)', async () => {
    const { publicKey } = await keyP
    const checks = pushChecks({ push: status({}, { last_result: 'no_keys' }), buildKey: publicKey, now: NOW })
    expect(level(checks, 'keys')).toMatchObject({ level: 'bad', state: 'missing' })
    expect(pushLevel(checks)).toBe('bad')
  })

  it('claves de pares distintos en Vercel y en Supabase', async () => {
    const [a, b] = [await keyP, await generateVapidKeys()]
    const checks = pushChecks({ push: status({}, { public_key: b.publicKey }), buildKey: a.publicKey, now: NOW })
    expect(level(checks, 'keys')).toMatchObject({ level: 'bad', state: 'mismatch' })
  })

  it('clave de la web mal copiada', () => {
    expect(level(pushChecks({ push: status(), buildKey: 'no-es-una-clave', now: NOW }), 'buildKey')).toMatchObject({ level: 'bad', state: 'invalid' })
  })

  it('clave del cron distinta: la función rechaza las llamadas', async () => {
    const { publicKey } = await keyP
    const checks = pushChecks({ push: status({ unauthorized_1h: 60 }, { last_run_at: ago(120) }), buildKey: publicKey, now: NOW })
    expect(level(checks, 'secret')).toMatchObject({ level: 'bad', state: 'bad', facts: { n: 60 } })
    expect(level(checks, 'function')).toMatchObject({ level: 'bad', state: 'late', facts: { min: 120 } })
  })

  it('atrasada unos minutos o con un error: amarillo', async () => {
    const { publicKey } = await keyP
    expect(level(pushChecks({ push: status({}, { last_run_at: ago(6) }), buildKey: publicKey, now: NOW }), 'function').level).toBe('warn')
    const err = level(pushChecks({ push: status({}, { last_result: 'error', last_error: 'timeout' }), buildKey: publicKey, now: NOW }), 'function')
    expect(err).toMatchObject({ level: 'warn', state: 'error', facts: { msg: 'timeout' } })
  })

  it('tarea en pausa y sin pg_cron', async () => {
    const { publicKey } = await keyP
    expect(level(pushChecks({ push: status({ cron: [{ name: 'life-reminders', schedule: '* * * * *', active: false }] }), buildKey: publicKey, now: NOW }), 'cron'))
      .toMatchObject({ level: 'warn', state: 'paused' })
    expect(level(pushChecks({ push: status({ cron: null }), buildKey: publicKey, now: NOW }), 'cron')).toMatchObject({ level: 'unknown', state: 'noCron' })
  })

  it('sin datos de la base (falta la migración): sólo se sabe lo de la web', async () => {
    const { publicKey } = await keyP
    const checks = pushChecks({ push: null, buildKey: publicKey, now: NOW })
    expect(level(checks, 'buildKey').level).toBe('ok')
    expect(checks.filter(c => c.id !== 'buildKey').every(c => c.level === 'unknown')).toBe(true)
    expect(pushLevel(checks)).toBe('warn')
  })

  it('dispositivos y entregas sólo informan: no cambian el semáforo', async () => {
    const { publicKey } = await keyP
    const checks = pushChecks({ push: status({ subscriptions: 0, people: 0, shown_24h: 0 }, { public_key: publicKey }), buildKey: publicKey, now: NOW })
    expect(pushLevel(checks)).toBe('ok')
  })
})
