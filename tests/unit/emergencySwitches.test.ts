import { describe, expect, it } from 'vitest'
import { readSiteFlags } from '../../src/lib/siteFlags'
import { blockedWrite } from '../../src/modules/profile/lib/profileApi'
import { isPrivatePath } from '../../src/modules/auth/components/MfaGateLoader'

// Interruptores de emergencia (PR C): un interruptor sólo apaga si la base lo dice; nunca por un dato que falta.
describe('readSiteFlags', () => {
  it('sin datos: Business apagado y lo de emergencia prendido', () => {
    expect(readSiteFlags(null)).toEqual({ business: false, signups: true, messages: true, subscriptions: true, polls: true })
    expect(readSiteFlags({ business: true })).toMatchObject({ business: true, signups: true })
  })
  it('sólo false apaga (no un texto ni un null)', () => {
    expect(readSiteFlags({ messages: false, polls: null, signups: 'no' })).toMatchObject({ messages: false, polls: true, signups: true })
  })
})

describe('blockedWrite', () => {
  it('distingue la pausa del equipo y el tope por IP de los demás errores', () => {
    expect(blockedWrite({ message: 'FEATURE_PAUSED', code: 'PT503' })).toBe('paused')
    expect(blockedWrite({ message: 'FEATURE_PAUSED' })).toBe('paused')
    expect(blockedWrite({ message: 'RATE_LIMITED', code: 'PT429' })).toBe('rate_limited')
    expect(blockedWrite({ message: 'boom', code: '500' })).toBeNull()
  })
})

describe('isPrivatePath', () => {
  it('pide el código en Studio y Life OS, nunca en un perfil público ni en el acceso', () => {
    for (const p of ['/life', '/life/habits', '/studio', '/studio/settings', '/dashboard', '/onboarding']) expect(isPrivatePath(p)).toBe(true)
    for (const p of ['/ana', '/lifestyle', '/studios', '/login', '/register', '/', '/ana/projects/x', '/super-admin']) expect(isPrivatePath(p)).toBe(false)
  })
})
