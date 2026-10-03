import { describe, expect, it } from 'vitest'
import { safeHref, telHref, whatsappHref } from '@/modules/profile/lib/safeUrl'

describe('safeHref (protección XSS en links del perfil)', () => {
  it.each([
    ['javascript:alert(1)'], [' JavaScript:alert(1)'], ['data:text/html,<script>'], ['vbscript:msgbox'], ['//evil.com'], [''], [42],
  ])('bloquea %s', raw => {
    expect(safeHref(raw)).toBeNull()
  })

  it('permite http(s), mailto, tel, sms y rutas internas', () => {
    expect(safeHref('https://ana.design')).toBe('https://ana.design')
    expect(safeHref('mailto:ana@example.com')).toBe('mailto:ana@example.com')
    expect(safeHref('tel:+5493415550000')).toBe('tel:+5493415550000')
    expect(safeHref('/r/ana')).toBe('/r/ana')
  })

  it('completa https:// cuando falta el protocolo', () => {
    expect(safeHref('instagram.com/ana')).toBe('https://instagram.com/ana')
  })
})

describe('whatsapp y teléfono', () => {
  it('arma wa.me sólo con dígitos', () => {
    expect(whatsappHref('+54 9 341 555-0000')).toBe('https://wa.me/5493415550000')
    expect(whatsappHref('123')).toBeNull()
  })
  it('arma tel: limpio', () => {
    expect(telHref('+54 (341) 555 0000')).toBe('tel:+543415550000')
  })
})
