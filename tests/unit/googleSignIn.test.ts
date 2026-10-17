import { beforeEach, describe, expect, it, vi } from 'vitest'
import { needsTerms, oauthProviders, pendingUpdates } from '@/modules/auth/lib/googleSignIn'
import { nativePlatform } from '@/lib/platform'
import { featureOn, type FeatureName } from '@/lib/features'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/platform', async (orig) => ({ ...(await orig<typeof import('@/lib/platform')>()), nativePlatform: vi.fn(() => 'web') }))
vi.mock('@/lib/features', async (orig) => ({ ...(await orig<typeof import('@/lib/features')>()), featureOn: vi.fn() }))

const now = new Date('2026-10-15T12:00:00Z')
const pending = { at: '2026-10-15T11:50:00Z', locale: 'fr', ref: 'ana', ref_purpose: 'creador', terms: true }

describe('pendingUpdates (volver de Google)', () => {
  it('completa términos, idioma y referido en una cuenta nueva', () => {
    expect(pendingUpdates(pending, { name: 'Ana', full_name: 'Ana' }, now))
      .toEqual({ terms_accepted_at: pending.at, locale: 'fr', ref: 'ana', ref_purpose: 'creador' })
  })

  it('no pisa lo que la cuenta ya tiene', () => {
    expect(pendingUpdates(pending, { terms_accepted_at: 'x', locale: 'es', ref: 'otro' }, now)).toBeNull()
  })

  it('ignora lo anotado hace más de una hora o con fecha inválida', () => {
    expect(pendingUpdates({ ...pending, at: '2026-10-15T10:00:00Z' }, {}, now)).toBeNull()
    expect(pendingUpdates({ ...pending, at: 'nada' }, {}, now)).toBeNull()
    expect(pendingUpdates(null, {}, now)).toBeNull()
  })

  it('sin referido sólo completa términos e idioma', () => {
    expect(pendingUpdates({ at: pending.at, locale: 'es', terms: true }, undefined, now)).toEqual({ terms_accepted_at: pending.at, locale: 'es' })
  })

  it('desde el login (sin casilla) no marca los términos como aceptados', () => {
    expect(pendingUpdates({ at: pending.at, locale: 'es', terms: false }, {}, now)).toEqual({ locale: 'es' })
  })
})

describe('needsTerms', () => {
  it('sólo cuentas de Google que todavía no aceptaron', () => {
    expect(needsTerms({ app_metadata: { provider: 'google' }, user_metadata: {} })).toBe(true)
    expect(needsTerms({ app_metadata: { provider: 'google' }, user_metadata: { terms_accepted_at: 'x' } })).toBe(false)
    expect(needsTerms({ app_metadata: { provider: 'email' }, user_metadata: {} })).toBe(false)
    expect(needsTerms(null)).toBe(false)
  })
})

describe('oauthProviders (App Store 4.8)', () => {
  const on = (flags: Partial<Record<FeatureName, boolean>>) =>
    vi.mocked(featureOn).mockImplementation((name) => flags[name] ?? false)
  const platform = (p: 'ios' | 'android' | 'web') => vi.mocked(nativePlatform).mockReturnValue(p)

  beforeEach(() => vi.mocked(featureOn).mockReset())

  it('en iPhone sin Apple no muestra Google (se entra con email)', () => {
    platform('ios'); on({ googleSignIn: true, appleSignIn: false })
    expect(oauthProviders()).toEqual({ google: false, apple: false })
  })

  it('en iPhone con Apple prendido muestra los dos', () => {
    platform('ios'); on({ googleSignIn: true, appleSignIn: true })
    expect(oauthProviders()).toEqual({ google: true, apple: true })
  })

  it('en la web y en Android, Google no depende de Apple', () => {
    for (const p of ['web', 'android'] as const) {
      platform(p); on({ googleSignIn: true, appleSignIn: false })
      expect(oauthProviders()).toEqual({ google: true, apple: false })
    }
  })

  it('con Google apagado no lo muestra en ningún lado', () => {
    for (const p of ['web', 'android', 'ios'] as const) {
      platform(p); on({ googleSignIn: false, appleSignIn: true })
      expect(oauthProviders()).toEqual({ google: false, apple: true })
    }
  })
})
