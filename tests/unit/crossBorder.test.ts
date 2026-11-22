import { describe, expect, it } from 'vitest'
import { crossBorderConsent, crossBorderMissing, crossBorderRegion, XBORDER_VERSION } from '../../src/lib/crossBorder'
import { needsTerms, pendingUpdates } from '../../src/modules/auth/lib/googleSignIn'

// Corea del Sur y China: permiso aparte para guardar los datos fuera del país (PIPA art. 28-8, PIPL art. 39).

describe('crossBorderRegion', () => {
  it('la zona horaria manda; si no dice nada, el idioma', () => {
    expect(crossBorderRegion({ lang: 'es', timeZone: 'Asia/Seoul' })).toBe('kr')
    expect(crossBorderRegion({ lang: 'en', timeZone: 'Asia/Shanghai' })).toBe('cn')
    expect(crossBorderRegion({ lang: 'en', timeZone: 'Asia/Urumqi' })).toBe('cn')
    expect(crossBorderRegion({ lang: 'ko', timeZone: 'America/Argentina/Buenos_Aires' })).toBe('kr')
    expect(crossBorderRegion({ lang: 'zh', timeZone: null })).toBe('cn')
  })
  it('Hong Kong, Macao, Taiwán, Japón y el resto no lo piden (salvo con el idioma)', () => {
    for (const tz of ['Asia/Hong_Kong', 'Asia/Macau', 'Asia/Taipei', 'Asia/Tokyo', 'Europe/Madrid', 'UTC']) {
      expect(crossBorderRegion({ lang: 'en', timeZone: tz })).toBeNull()
    }
  })
})

describe('crossBorderMissing', () => {
  it('falta si la cuenta es de Corea o China y no lo dio (o lo dio con un texto viejo)', () => {
    expect(crossBorderMissing({ locale: 'ko' }, 'UTC')).toBe('kr')
    expect(crossBorderMissing({ locale: 'es' }, 'Asia/Shanghai')).toBe('cn')
    expect(crossBorderMissing({ locale: 'ko', xborder_consent_at: '2026-01-01T00:00:00Z', xborder_version: 'vieja' }, 'UTC')).toBe('kr')
    expect(crossBorderMissing({ locale: 'ko', ...crossBorderConsent('kr') }, 'UTC')).toBeNull()
    expect(crossBorderMissing({ locale: 'es' }, 'Europe/Madrid')).toBeNull()
  })
  it('lo que se guarda: fecha, región y versión del texto', () => {
    expect(crossBorderConsent('cn', '2026-11-22T10:00:00.000Z'))
      .toEqual({ xborder_consent_at: '2026-11-22T10:00:00.000Z', xborder_region: 'cn', xborder_version: XBORDER_VERSION })
  })
})

describe('needsTerms con el permiso de Corea y China', () => {
  it('una cuenta con email de Corea sin el permiso pasa por /auth/terms; con el permiso, no', () => {
    expect(needsTerms({ app_metadata: { provider: 'email' }, user_metadata: { locale: 'ko' } }, 'UTC')).toBe(true)
    expect(needsTerms({ app_metadata: { provider: 'email' }, user_metadata: { locale: 'ko', ...crossBorderConsent('kr') } }, 'UTC')).toBe(false)
    expect(needsTerms({ app_metadata: { provider: 'email' }, user_metadata: { locale: 'es' } }, 'UTC')).toBe(false)
  })
  it('al volver de Google, lo tildado en el registro queda en la cuenta', () => {
    const at = new Date().toISOString()
    const out = pendingUpdates({ at, locale: 'zh', terms: true, xborder: 'cn' }, {}, new Date())
    expect(out).toMatchObject({ xborder_consent_at: at, xborder_region: 'cn', xborder_version: XBORDER_VERSION })
    expect(pendingUpdates({ at, locale: 'zh', terms: true }, {}, new Date())).not.toHaveProperty('xborder_consent_at')
  })
})
