import { describe, expect, it } from 'vitest'
import { freshnessOf, SNAPSHOTS, type SnapshotInfo } from '../../src/modules/super-admin/lib/snapshots'

// Fotos del panel (20261207000001): de cuándo es lo que muestra cada pantalla.

const NOW = Date.parse('2026-11-26T15:00:00Z')
const row = (name: string, days: number, min: number | null, error?: { min: number }): SnapshotInfo => ({
  name, days, duration_ms: 100,
  computed_at: min === null ? null : new Date(NOW - min * 60_000).toISOString(),
  error: error ? 'timeout' : null, error_at: error ? new Date(NOW - error.min * 60_000).toISOString() : null,
})

describe('freshnessOf', () => {
  it('cuenta desde la foto más vieja de las que usa la pantalla', () => {
    const info = [row('growth_overview', 90, 40), row('growth_retention', 0, 5), row('growth_funnel', 90, 5), row('growth_adoption', 90, 5)]
    expect(freshnessOf(info, SNAPSHOTS.growth(90), NOW)).toEqual({ minutes: 40, error: false })
  })
  it('sin foto todavía: se calculó en vivo (null)', () => {
    expect(freshnessOf([row('overview', 30, null)], SNAPSHOTS.home, NOW).minutes).toBeNull()
    expect(freshnessOf([], SNAPSHOTS.home, NOW).minutes).toBeNull()
  })
  it('un error más nuevo que la foto se avisa; uno viejo, no', () => {
    expect(freshnessOf([row('status_heavy', 0, 70, { min: 10 })], SNAPSHOTS.status, NOW).error).toBe(true)
    expect(freshnessOf([row('status_heavy', 0, 10, { min: 70 })], SNAPSHOTS.status, NOW).error).toBe(false)
  })
  it('365 días: embudo y adopción usan 90, como pide la pantalla', () => {
    expect(SNAPSHOTS.growth(365).map(k => `${k.name}:${k.days}`))
      .toEqual(['growth_overview:365', 'growth_retention:0', 'growth_funnel:90', 'growth_adoption:90'])
  })
})
