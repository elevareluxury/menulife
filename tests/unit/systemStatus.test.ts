import { describe, expect, it } from 'vitest'
import {
  evaluate, median, overall, selfcheckLevel, type HealthResult, type Inputs, type Row, type SystemStatus,
} from '@/modules/super-admin/lib/systemStatus'

// "Estado del sistema": umbrales de cada fila (verde / amarillo / rojo / sin datos).
const NOW = Date.parse('2026-10-31T12:00:00Z')

function status(over: Partial<SystemStatus> = {}): SystemStatus {
  return {
    checked_at: '2026-10-31T12:00:00Z',
    settings: { backup_checked_at: '2026-10-20T12:00:00Z' },
    probe_username: 'ana',
    db: { bytes: 100 * 1024 * 1024, connections: 10, max_connections: 60 },
    tables: [],
    storage: [{ bucket: 'media', files: 3, bytes: 5 * 1024 * 1024 }],
    cron: [{ name: 'life-reminders', schedule: '* * * * *', active: true, last_start: '2026-10-31T11:59:20Z', last_status: 'succeeded', failed_24h: 0 }],
    net: { ok: 60, client: 0, server: 0, failed: 0 },
    slow_queries: [{ query: 'select 1', calls: 10, mean_ms: 20, total_ms: 200 }],
    errors_by_day: Array.from({ length: 14 }, (_, i) => ({ day: `2026-10-${18 + i}`, people: 2 })),
    new_errors: [],
    signups: { started_1h: 2, completed_1h: 1, started_24h: 30, completed_24h: 20 },
    push_shown_1h: 4,
    sitemap_paths: 10,
    ...over,
  }
}

const HEALTH: HealthResult = {
  ok: true, db: 'ok', release: 'abc1234', ms: 240,
  checks: [
    { id: 'og', ok: true, status: 200, ms: 300 }, { id: 'og_image', ok: true, status: 200, ms: 500 },
    { id: 'sitemap', ok: true, status: 200, ms: 100, count: 34 }, { id: 'youtube_latest', ok: true, status: 200, ms: 400 },
    { id: 'media_cover', ok: true, status: 200, ms: 600 }, { id: 'calendar', ok: true, status: 404, ms: 90 },
  ],
}

const input = (over: Partial<Inputs> = {}): Inputs =>
  ({ status: status(), health: HEALTH, profile: { ok: true, ms: 200 }, panelRelease: 'abc1234', now: NOW, ...over })
const row = (rows: Row[], id: Row['id']) => rows.find(r => r.id === id)!

describe('Estado del sistema', () => {
  it('todo en verde cuando todo responde', () => {
    const rows = evaluate(input())
    expect(rows.filter(r => r.level !== 'ok').map(r => r.id)).toEqual([])
    expect(overall(rows, 'ok')).toBe('ok')
  })

  it('base: lenta en amarillo, caída en rojo', () => {
    expect(row(evaluate(input({ health: { ...HEALTH, ms: 1200 } })), 'database').level).toBe('warn')
    expect(row(evaluate(input({ health: { ...HEALTH, ms: 3500 } })), 'database').level).toBe('bad')
    expect(row(evaluate(input({ health: null })), 'database').level).toBe('bad')
    expect(row(evaluate(input({ health: { ...HEALTH, ok: false, db: 'down' } })), 'database').level).toBe('bad')
  })

  it('versión distinta = panel viejo (recargar)', () => {
    expect(row(evaluate(input({ panelRelease: 'zzz9999' })), 'release').level).toBe('warn')
    expect(row(evaluate(input({ panelRelease: null })), 'release').level).toBe('unknown')
  })

  it('perfil público: error en rojo; sin perfil publicado, sin datos', () => {
    expect(row(evaluate(input({ profile: { ok: false, ms: 100 } })), 'profile').level).toBe('bad')
    expect(row(evaluate(input({ profile: { ok: true, ms: 1500 } })), 'profile').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ probe_username: null }) })), 'profile').level).toBe('unknown')
  })

  it('sin el chequeo profundo, sus filas quedan sin datos (no en rojo)', () => {
    const rows = evaluate(input({ health: { ...HEALTH, checks: undefined } }))
    for (const id of ['preview', 'sitemap', 'media', 'calendar'] as const) expect(row(rows, id).level).toBe('unknown')
  })

  it('vista previa o imagen caída = rojo; sitemap con menos direcciones que las públicas = amarillo', () => {
    const broken = { ...HEALTH, checks: HEALTH.checks!.map(c => (c.id === 'og_image' ? { ...c, ok: false, status: 500 } : c)) }
    expect(row(evaluate(input({ health: broken })), 'preview')).toMatchObject({ level: 'bad', facts: { status: 500 } })
    expect(row(evaluate(input({ status: status({ sitemap_paths: 50 }) })), 'sitemap').level).toBe('warn')
  })

  it('recordatorios: atrasados, fallidos, pausados o sin programar', () => {
    const job = status().cron![0]
    const at = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString()
    expect(row(evaluate(input({ status: status({ cron: [{ ...job, last_start: at(5) }] }) })), 'reminders').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ cron: [{ ...job, last_start: at(20) }] }) })), 'reminders').level).toBe('bad')
    expect(row(evaluate(input({ status: status({ cron: [{ ...job, last_status: 'failed' }] }) })), 'reminders').level).toBe('bad')
    expect(row(evaluate(input({ status: status({ cron: [{ ...job, active: false }] }) })), 'reminders').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ cron: [] }) })), 'reminders')).toMatchObject({ level: 'unknown', facts: { state: 'notScheduled' } })
    expect(row(evaluate(input({ status: status({ cron: null }) })), 'reminders')).toMatchObject({ level: 'unknown', facts: { state: 'noCron' } })
  })

  it('errores: hoy contra la mediana de la semana y errores nuevos con muchas personas', () => {
    const days = (today: number) => Array.from({ length: 14 }, (_, i) => ({ day: `d${i}`, people: i === 13 ? today : 4 }))
    expect(row(evaluate(input({ status: status({ errors_by_day: days(9) }) })), 'errors').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ errors_by_day: days(21) }) })), 'errors').level).toBe('bad')
    const fresh = (people: number) => [{ id: 'e', message: 'x', area: 'profile', release: 'abc', first_seen: '', people }]
    expect(row(evaluate(input({ status: status({ new_errors: fresh(12) }) })), 'errors').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ new_errors: fresh(60) }) })), 'errors').level).toBe('bad')
  })

  it('registros: empezados sin terminar = algo roto', () => {
    const s = (g: SystemStatus['signups']) => row(evaluate(input({ status: status({ signups: g }) })), 'signups').level
    expect(s({ started_1h: 12, completed_1h: 0, started_24h: 12, completed_24h: 3 })).toBe('bad')
    expect(s({ started_1h: 0, completed_1h: 0, started_24h: 25, completed_24h: 0 })).toBe('bad')
    expect(s({ started_1h: 0, completed_1h: 0, started_24h: 30, completed_24h: 4 })).toBe('warn')
    expect(s({ started_1h: 3, completed_1h: 0, started_24h: 5, completed_24h: 0 })).toBe('ok')
  })

  it('tamaño de la base, conexiones y archivos contra el plan (y el límite elegido)', () => {
    const big = status({ db: { bytes: 7.5 * 1024 ** 3, connections: 10, max_connections: 60 } })
    expect(row(evaluate(input({ status: big })), 'size').level).toBe('bad')
    expect(row(evaluate(input({ status: { ...big, settings: { ...big.settings, db_limit_mb: String(16 * 1024) } } })), 'size').level).toBe('ok')
    expect(row(evaluate(input({ status: status({ db: { bytes: 1, connections: 50, max_connections: 60 } }) })), 'size').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ storage: [{ bucket: 'm', files: 1, bytes: 95 * 1024 ** 3 }] }) })), 'storage').level).toBe('bad')
    expect(row(evaluate(input({ status: status({ storage: null }) })), 'storage').level).toBe('unknown')
  })

  it('consultas lentas y copias de seguridad', () => {
    const q = (ms: number) => status({ slow_queries: [{ query: 'q', calls: 9, mean_ms: ms, total_ms: ms * 9 }] })
    expect(row(evaluate(input({ status: q(800) })), 'slow').level).toBe('warn')
    expect(row(evaluate(input({ status: q(2500) })), 'slow').level).toBe('bad')
    expect(row(evaluate(input({ status: status({ slow_queries: [] }) })), 'slow').level).toBe('ok')
    expect(row(evaluate(input({ status: status({ slow_queries: null }) })), 'slow').level).toBe('unknown')
    expect(row(evaluate(input({ status: status({ settings: {} }) })), 'backup').level).toBe('warn')
    expect(row(evaluate(input({ status: status({ settings: { backup_checked_at: '2026-06-01T00:00:00Z' } }) })), 'backup').level).toBe('bad')
  })

  it('autochequeo: rojo si algo quedó expuesto; la información no cambia el color', () => {
    expect(selfcheckLevel([{ rule: 'a', level: 'red', object: 't' }])).toBe('bad')
    expect(selfcheckLevel([{ rule: 'h', level: 'yellow', object: 't' }, { rule: 'b', level: 'info', object: 'x' }])).toBe('warn')
    expect(selfcheckLevel([{ rule: 'b', level: 'info', object: 'x' }])).toBe('ok')
    expect(selfcheckLevel(null)).toBe('unknown')
    expect(overall(evaluate(input()), 'bad')).toBe('bad')
  })

  it('mediana', () => {
    expect(median([])).toBe(0)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})
