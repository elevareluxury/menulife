import { describe, expect, it } from 'vitest'
import { routeFromRole } from '@/modules/auth/lib/postLoginRoute'

describe('routeFromRole', () => {
  it('super admin → /super-admin', () => {
    expect(routeFromRole(true, null, false)).toBe('/super-admin')
  })
  it('sin restaurante, sin perfil → /studio', () => {
    expect(routeFromRole(false, null, false)).toBe('/studio')
  })
  it('sin restaurante, con perfil → /life', () => {
    expect(routeFromRole(false, null, true)).toBe('/life')
  })
  it('hub_free → /studio', () => {
    expect(routeFromRole(false, { plan: 'hub_free' }, false)).toBe('/studio')
  })
  it('plan os_full → /dashboard', () => {
    expect(routeFromRole(false, { plan: 'os_full' }, false)).toBe('/dashboard')
  })
})
