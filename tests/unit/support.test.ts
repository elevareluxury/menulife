import { describe, expect, it } from 'vitest'
import {
  checkSupportMethod, normalizeSupportMethod, readSupportMethods, supportHref, SUPPORT_MAX_METHODS,
} from '@/modules/profile/lib/support'

describe('Apoyame: links por plataforma', () => {
  it('acepta los dominios de cada plataforma', () => {
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://mpago.la/2abcXYZ' })).toBeNull()
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://link.mercadopago.com.ar/anaperez' })).toBeNull()
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://www.mercadopago.com.br/checkout/v1/x' })).toBeNull()
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://mercadopago.com/x' })).toBeNull()
    expect(checkSupportMethod({ kind: 'paypal', value: 'https://paypal.me/ana' })).toBeNull()
    expect(checkSupportMethod({ kind: 'paypal', value: 'https://www.paypal.com/donate/?hosted_button_id=X' })).toBeNull()
    expect(checkSupportMethod({ kind: 'kofi', value: 'https://ko-fi.com/ana' })).toBeNull()
    expect(checkSupportMethod({ kind: 'buymeacoffee', value: 'https://www.buymeacoffee.com/ana' })).toBeNull()
    expect(checkSupportMethod({ kind: 'link', value: 'https://cafecito.app/ana' })).toBeNull()
  })

  it('rechaza dominios de otra plataforma o parecidos', () => {
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://paypal.me/ana' })).toBe('wrong_domain')
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://mercadopago.com.ar.evil.com/x' })).toBe('wrong_domain')
    expect(checkSupportMethod({ kind: 'mercadopago', value: 'https://evilmercadopago.com/x' })).toBe('wrong_domain')
    expect(checkSupportMethod({ kind: 'paypal', value: 'https://paypal.me.example.com/ana' })).toBe('wrong_domain')
    expect(checkSupportMethod({ kind: 'kofi', value: 'https://kofi.com/ana' })).toBe('wrong_domain')
    expect(checkSupportMethod({ kind: 'buymeacoffee', value: 'https://buymeacoffee.co/ana' })).toBe('wrong_domain')
  })

  it('exige https y un link de verdad', () => {
    expect(checkSupportMethod({ kind: 'paypal', value: 'http://paypal.me/ana' })).toBe('bad_url')
    expect(checkSupportMethod({ kind: 'link', value: 'javascript:alert(1)' })).toBe('bad_url')
    expect(checkSupportMethod({ kind: 'link', value: 'https://user:pw@example.com' })).toBe('bad_url')
    expect(checkSupportMethod({ kind: 'link', value: 'no es un link' })).toBe('bad_url')
    expect(checkSupportMethod({ kind: 'link', value: '' })).toBe('empty')
    expect(checkSupportMethod({ kind: 'link', value: '   ' })).toBe('empty')
  })

  it('completa https:// cuando falta', () => {
    expect(supportHref('paypal', 'paypal.me/ana')).toBe('https://paypal.me/ana')
    expect(normalizeSupportMethod({ kind: 'kofi', value: ' ko-fi.com/ana ', label: ' Un café ' }))
      .toEqual({ kind: 'kofi', value: 'https://ko-fi.com/ana', label: 'Un café' })
  })

  it('alias y Pix no son links', () => {
    expect(supportHref('alias', 'ana.perez.mp')).toBeNull()
    expect(supportHref('pix', 'ana@example.com')).toBeNull()
  })
})

describe('Apoyame: textos para copiar', () => {
  it('alias, CVU o CBU hasta 60 caracteres, en una línea', () => {
    expect(checkSupportMethod({ kind: 'alias', value: 'ana.perez.mp' })).toBeNull()
    expect(checkSupportMethod({ kind: 'alias', value: '0000003100010000000001' })).toBeNull()
    expect(checkSupportMethod({ kind: 'alias', value: 'a'.repeat(60) })).toBeNull()
    expect(checkSupportMethod({ kind: 'alias', value: 'a'.repeat(61) })).toBe('too_long')
    expect(checkSupportMethod({ kind: 'alias', value: 'ana\nperez' })).toBe('bad_text')
  })

  it('clave Pix', () => {
    expect(checkSupportMethod({ kind: 'pix', value: '123e4567-e89b-12d3-a456-426614174000' })).toBeNull()
    expect(checkSupportMethod({ kind: 'pix', value: 'x'.repeat(81) })).toBe('too_long')
  })

  it('el texto del botón tiene tope', () => {
    expect(checkSupportMethod({ kind: 'alias', value: 'ana.mp', label: 'x'.repeat(41) })).toBe('too_long')
  })
})

describe('Apoyame: lectura de lo guardado', () => {
  it('descarta lo inválido y corta en 6', () => {
    const raw = [
      { kind: 'paypal', value: 'https://paypal.me/ana' },
      { kind: 'paypal', value: 'https://evil.com/ana' },
      { kind: 'bitcoin', value: 'bc1…' },
      null,
      'texto',
      { kind: 'alias', value: 'ana.mp', label: 'Mi alias' },
      ...Array.from({ length: 10 }, (_, i) => ({ kind: 'link', value: `https://example.com/${i}` })),
    ]
    const methods = readSupportMethods(raw)
    expect(methods).toHaveLength(SUPPORT_MAX_METHODS)
    expect(methods[0]).toEqual({ kind: 'paypal', value: 'https://paypal.me/ana' })
    expect(methods[1]).toEqual({ kind: 'alias', value: 'ana.mp', label: 'Mi alias' })
  })

  it('sin lista, nada', () => {
    expect(readSupportMethods(undefined)).toEqual([])
    expect(readSupportMethods({})).toEqual([])
  })
})
