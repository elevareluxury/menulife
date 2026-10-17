import { describe, expect, it } from 'vitest'
import { pathFromAppUrl } from '@/lib/appLinks'

describe('pathFromAppUrl', () => {
  it('un link de mycen.id lleva a la misma ruta, con su consulta y su hash', () => {
    expect(pathFromAppUrl('https://mycen.id/auth/callback?code=abc')).toBe('/auth/callback?code=abc')
    expect(pathFromAppUrl('https://www.mycen.id/studio#x')).toBe('/studio#x')
    expect(pathFromAppUrl('https://mycen.id/')).toBe('/')
  })
  it('el esquema propio de la app también', () => {
    expect(pathFromAppUrl('id.mycen.app://auth/callback?code=1')).toBe('/auth/callback?code=1')
  })
  it('otro dominio, otro esquema o basura: nada', () => {
    expect(pathFromAppUrl('https://evil.example/auth/callback')).toBeNull()
    expect(pathFromAppUrl('http://mycen.id/studio')).toBeNull()
    expect(pathFromAppUrl('javascript:alert(1)')).toBeNull()
    expect(pathFromAppUrl('no es un link')).toBeNull()
  })
})
