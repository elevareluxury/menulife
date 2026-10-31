import { describe, expect, it } from 'vitest'
import { change, cityOf, funnelRows, pct, toCsv } from '@/modules/super-admin/lib/growth'
import { activityDayKey, deviceTimeZone } from '@/lib/activity'

// Crecimiento: sin base no hay porcentaje inventado; el embudo marca la caída más grande; el CSV no ejecuta fórmulas.
describe('crecimiento', () => {
  it('cambio y porcentaje sin base = null', () => {
    expect(change(15, 10)).toBe(50)
    expect(change(5, 10)).toBe(-50)
    expect(change(3, 0)).toBeNull()
    expect(pct(1, 3)).toBe(33.3)
    expect(pct(1, 0)).toBeNull()
  })

  it('embudo: % sobre registros y sobre el paso anterior, "volvió" aparte y la peor caída marcada', () => {
    const rows = funnelRows([
      { key: 'signup_started', users: 50 }, { key: 'signed_up', users: 40 }, { key: 'onboarding', users: 36 },
      { key: 'published', users: 12 }, { key: 'shared', users: 10 }, { key: 'came_back', users: 20 },
    ])
    expect(rows.map(r => r.key)).not.toContain('came_back')
    expect(rows[0]).toMatchObject({ ofSignups: null, ofPrevious: null })
    expect(rows[1]).toMatchObject({ ofSignups: 100, ofPrevious: 80 })
    expect(rows.find(r => r.worst)?.key).toBe('published')
    // Empezar y no terminar el registro no cuenta como la "caída" (lo dice el paso de registro)
    expect(funnelRows([{ key: 'signup_started', users: 100 }, { key: 'signed_up', users: 1 }]).some(r => r.worst)).toBe(false)
  })

  it('CSV para planillas', () => {
    const csv = toCsv(['a', 'b'], [['=SUMA(1)', 2], ['x,y', null]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain("'=SUMA(1),2")
    expect(csv).toContain('"x,y",')
  })

  it('zona horaria a ciudad, día UTC y zona del dispositivo válida', () => {
    expect(cityOf('America/Argentina/Buenos_Aires')).toBe('Buenos Aires')
    expect(activityDayKey(new Date('2026-10-31T23:30:00-03:00'))).toBe('2026-11-01')
    const tz = deviceTimeZone()
    expect(tz === null || /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz)).toBe(true)
  })
})
