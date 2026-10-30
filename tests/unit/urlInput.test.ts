import { describe, expect, it } from 'vitest'
import { urlOnBlur, urlOnChange, urlOnFocus } from '../../src/modules/studio/lib/urlInput'

// Campos de link en Studio: "https://" ya escrito y completado al salir.
describe('urlInput', () => {
  it('al tocar un campo vacío aparece https://; si ya tiene algo, no se toca', () => {
    expect(urlOnFocus('')).toBe('https://')
    expect(urlOnFocus('  ')).toBe('https://')
    expect(urlOnFocus('https://mycen.id')).toBe('https://mycen.id')
  })

  it('pegar un link completo encima del prefijo no lo duplica', () => {
    expect(urlOnChange('https://https://mycen.id/ana')).toBe('https://mycen.id/ana')
    expect(urlOnChange('https://http://viejo.com')).toBe('http://viejo.com')
    expect(urlOnChange('https://mailto:ana@mail.com')).toBe('mailto:ana@mail.com')
    expect(urlOnChange('https://mycen.id')).toBe('https://mycen.id')
    expect(urlOnChange('https://')).toBe('https://')
  })

  it('al salir: sólo el prefijo queda vacío y un dominio suelto se completa', () => {
    expect(urlOnBlur('https://')).toBe('')
    expect(urlOnBlur('  ')).toBe('')
    expect(urlOnBlur('instagram.com/ana')).toBe('https://instagram.com/ana')
    expect(urlOnBlur('www.mitienda.com.ar?ref=1')).toBe('https://www.mitienda.com.ar?ref=1')
    expect(urlOnBlur(' https://mycen.id ')).toBe('https://mycen.id')
    expect(urlOnBlur('http://viejo.com')).toBe('http://viejo.com')
    expect(urlOnBlur('mailto:ana@mail.com')).toBe('mailto:ana@mail.com')
  })

  it('lo que no es un dominio queda como está (lo valida quien lo usa)', () => {
    expect(urlOnBlur('hola')).toBe('hola')
  })

  it('un email (suelto o escrito después del https:// que ya estaba) pasa a mailto:', () => {
    expect(urlOnBlur('ana@mail.com')).toBe('mailto:ana@mail.com')
    expect(urlOnBlur('https://ana@mail.com')).toBe('mailto:ana@mail.com')
  })

  it('saca lo que se pega sin querer y arregla el comienzo mal escrito', () => {
    expect(urlOnBlur('"https://mycen.id/ana".')).toBe('https://mycen.id/ana')
    expect(urlOnBlur('<www.tienda.com>')).toBe('https://www.tienda.com')
    expect(urlOnBlur('https//tienda.com')).toBe('https://tienda.com')
    expect(urlOnBlur('https://"paypal.me/ana".')).toBe('https://paypal.me/ana')
    expect(urlOnBlur('instagram.com?igsh=abc')).toBe('https://instagram.com?igsh=abc')
  })
})
