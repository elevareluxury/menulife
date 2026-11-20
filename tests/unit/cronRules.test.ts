import { describe, expect, it } from 'vitest'
// @ts-expect-error módulo .mjs sin tipos (lo usan las tareas programadas)
import { alertLines, alertSubject, checkableUrl, threatOf, webRiskUrl } from '../../scripts/cron/rules.mjs'

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
