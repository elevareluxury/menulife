import { describe, expect, it, vi } from 'vitest'
import { pendingUpdates } from '@/modules/auth/lib/googleSignIn'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const now = new Date('2026-10-15T12:00:00Z')
const pending = { at: '2026-10-15T11:50:00Z', locale: 'fr', ref: 'ana', ref_purpose: 'creador' }

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
    expect(pendingUpdates({ at: pending.at, locale: 'es' }, undefined, now)).toEqual({ terms_accepted_at: pending.at, locale: 'es' })
  })
})
