import { describe, expect, it } from 'vitest'
import { isModuleLive, scheduleState } from '@/modules/profile/lib/moduleSchedule'
import { classifySource, groupSources } from '@/modules/studio/lib/trafficSources'

const NOW = Date.parse('2026-10-03T12:00:00Z')

describe('módulos programados', () => {
  it('sin fechas se ve siempre', () => {
    expect(scheduleState({}, NOW)).toBe('always')
    expect(isModuleLive(null, NOW)).toBe(true)
  })
  it('respeta desde y hasta', () => {
    expect(scheduleState({ show_from: '2026-10-04T00:00:00Z' }, NOW)).toBe('upcoming')
    expect(scheduleState({ show_until: '2026-10-03T11:00:00Z' }, NOW)).toBe('ended')
    expect(scheduleState({ show_from: '2026-10-03T11:00:00Z', show_until: '2026-10-03T13:00:00Z' }, NOW)).toBe('live')
    // "hasta" es exclusivo, como en la base
    expect(isModuleLive({ show_until: '2026-10-03T12:00:00Z' }, NOW)).toBe(false)
  })
  it('ignora fechas inválidas (igual que la base)', () => {
    expect(scheduleState({ show_from: 'no es fecha' }, NOW)).toBe('always')
  })
})

describe('fuentes de tráfico', () => {
  it('prioriza ?src= y reconoce los sitios', () => {
    expect(classifySource('qr', 'l.instagram.com')).toEqual({ key: 'qr' })
    expect(classifySource('IG', null)).toEqual({ key: 'instagram' })
    expect(classifySource(null, 'l.instagram.com')).toEqual({ key: 'instagram' })
    expect(classifySource(null, 't.co')).toEqual({ key: 'x' })
    expect(classifySource(null, 'www.google.com.ar')).toEqual({ key: 'google' })
    expect(classifySource(null, 'mail.google.com')).toEqual({ key: 'email' })
    expect(classifySource(null, null)).toEqual({ key: 'direct' })
    expect(classifySource(null, 'blog.ana.design')).toEqual({ key: 'other', detail: 'blog.ana.design' })
    expect(classifySource('newsletter', null)).toEqual({ key: 'other', detail: '?src=newsletter' })
  })
  it('suma por canal y ordena', () => {
    const groups = groupSources([
      { source: null, referrer_host: 'l.instagram.com', visits: 2, visitors: 2 },
      { source: 'ig', referrer_host: null, visits: 3, visitors: 3 },
      { source: 'qr', referrer_host: null, visits: 4, visitors: 1 },
      { source: null, referrer_host: null, visits: 1, visitors: 1 },
    ])
    expect(groups).toEqual([{ key: 'instagram', visits: 5 }, { key: 'qr', visits: 4 }, { key: 'direct', visits: 1 }])
  })
})
