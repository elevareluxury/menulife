import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos (lo usan las tareas programadas)
import { alertLines, alertSubject, checkableUrl, sinceFor, threatOf, webRiskUrl } from '../../scripts/cron/rules.mjs'
// @ts-expect-error módulo .mjs sin tipos
import { previousRunStart } from '../../scripts/cron/previousRun.mjs'

// Tareas programadas (PR D): qué se avisa al equipo y qué links se mandan a revisar. Sin red.

const quiet = { new_errors: [], reopened_errors: 0, reports: 0, message_reports: 0, signups_hour: 3, signups_week_hourly: 2, link_flags: 0,
  flags: { signups: true, messages: true, subscriptions: true, polls: true } }

describe('alertLines', () => {
  it('sin novedades, no se manda nada', () => {
    expect(alertLines(quiet, { ok: true, status: 200 })).toEqual([])
  })
  it('la web caída o la base sin responder siempre avisa', () => {
    expect(alertLines(quiet, { ok: false, status: 503 })[0]).toContain('503')
    expect(alertLines(null, { ok: true, status: 200 })[0]).toContain('MYCEN_CRON_KEY')
  })
  it('errores nuevos (hasta 5 en el mail), denuncias y links peligrosos', () => {
    const errs = Array.from({ length: 7 }, (_, i) => ({ area: 'studio', message: `Fallo ${i}`, count: 1 }))
    const lines = alertLines({ ...quiet, new_errors: errs, reports: 6, link_flags: 2 }, { ok: true, status: 200 })
    expect(lines[0]).toContain('7 errores nuevos')
    expect(lines.filter((l: string) => l.startsWith('   ·'))).toHaveLength(5)
    expect(lines.some((l: string) => l.includes('6 denuncias'))).toBe(true)
    expect(lines.some((l: string) => l.includes('2 link(s)'))).toBe(true)
  })
  it('pico de registros: más de 3 veces lo normal y al menos 50 en la hora', () => {
    expect(alertLines({ ...quiet, signups_hour: 40, signups_week_hourly: 2 }, { ok: true, status: 200 })).toEqual([])
    expect(alertLines({ ...quiet, signups_hour: 400, signups_week_hourly: 200 }, { ok: true, status: 200 })).toEqual([])
    expect(alertLines({ ...quiet, signups_hour: 300, signups_week_hourly: 20 }, { ok: true, status: 200 })[0]).toContain('Pico de registros')
  })
  it('el asunto marca lo grave', () => {
    expect(alertSubject(['🔴 caída', '🟠 algo'])).toBe('🔴 Mycen: 2 aviso(s)')
    expect(alertSubject(['🟠 algo', '   · detalle'])).toBe('🟠 Mycen: 1 aviso(s)')
  })
})

describe('links', () => {
  it('se revisan los http(s) de afuera, no los de Mycen ni los raros', () => {
    expect(checkableUrl('https://phish.example/login')).toBe(true)
    expect(checkableUrl('http://x.example')).toBe(true)
    for (const u of ['https://mycen.id/ana', 'https://www.mycen.id/x', 'mailto:a@b.c', 'javascript:alert(1)', 'https://a b.com', 'no es un link']) {
      expect(checkableUrl(u)).toBe(false)
    }
  })
  it('pedido a Web Risk con las tres amenazas y el link escapado', () => {
    const u = new URL(webRiskUrl('https://x.example/?a=1&b=2', 'K'))
    expect(u.host).toBe('webrisk.googleapis.com')
    expect(u.searchParams.getAll('threatTypes')).toEqual(['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'])
    expect(u.searchParams.get('uri')).toBe('https://x.example/?a=1&b=2')
  })
  it('lee la amenaza de la respuesta (vacía = limpio)', () => {
    expect(threatOf({})).toBeNull()
    expect(threatOf({ threat: { threatTypes: ['SOCIAL_ENGINEERING'] } })).toBe('SOCIAL_ENGINEERING')
  })
})

describe('sinceFor (GitHub no corre las tareas a horario)', () => {
  const now = Date.parse('2026-11-22T19:00:00Z')
  it('sin pasada anterior, la ventana de siempre', () => {
    expect(sinceFor(null, 16, now)).toBe('2026-11-22T18:44:00.000Z')
    expect(sinceFor('no es fecha', 16, now)).toBe('2026-11-22T18:44:00.000Z')
  })
  it('si la anterior fue hace horas, mira desde ahí (con 2 minutos de margen)', () => {
    expect(sinceFor('2026-11-22T12:00:00Z', 16, now)).toBe('2026-11-22T11:58:00.000Z')
  })
  it('nunca menos que la ventana, ni desde el futuro', () => {
    expect(sinceFor('2026-11-22T18:58:00Z', 16, now)).toBe('2026-11-22T18:44:00.000Z')
    expect(sinceFor('2026-11-22T20:00:00Z', 16, now)).toBe('2026-11-22T18:44:00.000Z')
  })
})

describe('previousRunStart', () => {
  afterEach(() => { vi.unstubAllGlobals() })
  const env = { GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '9',
    GITHUB_WORKFLOW_REF: 'o/r/.github/workflows/team-alerts.yml@refs/heads/main' }
  it('toma la pasada exitosa anterior (no la que está corriendo)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ workflow_runs: [
      { id: 9, run_started_at: '2026-11-22T19:00:00Z' }, { id: 8, run_started_at: '2026-11-22T12:00:00Z' }] })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await previousRunStart(env)).toBe('2026-11-22T12:00:00Z')
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/repos/o/r/actions/workflows/team-alerts.yml/runs?status=success')
  })
  it('sin token o si GitHub falla, null (ventana de siempre)', async () => {
    expect(await previousRunStart({ ...env, GITHUB_TOKEN: '' })).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })))
    expect(await previousRunStart(env)).toBeNull()
  })
})
