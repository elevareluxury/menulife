import { describe, expect, it } from 'vitest'
import { safeHref, telHref, whatsappHref, whatsappNeedsCountry } from '@/modules/profile/lib/safeUrl'
import { socialUrl } from '@/modules/studio/lib/moduleCatalog'

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

// Auditoría de links: lo que la gente pega de verdad (desde el celular, con el "https://" ya escrito, de un mensaje)
describe('safeHref: links como los pega la gente', () => {
  it.each([
    ['www.instagram.com/ana', 'https://www.instagram.com/ana'],
    ['instagram.com?igsh=MTIz', 'https://instagram.com?igsh=MTIz'],
    ['ana.design#contacto', 'https://ana.design#contacto'],
    ['tienda.com.ar:8080/x', 'https://tienda.com.ar:8080/x'],
    ['añá.com/x', 'https://añá.com/x'],
    ['https://ana.com.', 'https://ana.com'],
    ['https://ana.com,', 'https://ana.com'],
    ['"https://ana.com"', 'https://ana.com'],
    ['<https://ana.com>', 'https://ana.com'],
    ['https//ana.com', 'https://ana.com'],
    ['http:/ana.com', 'http://ana.com'],
    ['ana@gmail.com', 'mailto:ana@gmail.com'],
    ['https://medium.com/@ana', 'https://medium.com/@ana'],
  ])('%s → %s', (raw, href) => {
    expect(safeHref(raw)).toBe(href)
  })

  it.each([
    ['https://'], ['https://ana'], ['https://ana .com'], ['ana..com'], ['.com'], ['http://localhost:3000'],
    ['https://user:clave@ana.com'], ['https://@evil.com'], ['https://ana@mail.com'], ['ftp://ana.com'],
    ['mailto:'], ['mailto:ana'], ['tel:'], ['tel:123'], ['+54 9 341 555 0000'], ['hola'],
  ])('rechaza %s (no abriría nada o engaña)', raw => {
    expect(safeHref(raw)).toBeNull()
  })
})

describe('WhatsApp: número completo con el código de país', () => {
  it('acepta + o 00 y links de WhatsApp pegados', () => {
    expect(whatsappHref('0054 9 341 555 0000')).toBe('https://wa.me/5493415550000')
    expect(whatsappHref('https://wa.me/5493415550000')).toBe('https://wa.me/5493415550000')
    expect(whatsappHref('https://api.whatsapp.com/send?phone=5493415550000&text=hola')).toBe('https://wa.me/5493415550000')
  })
  it('pide el código de país a un número local', () => {
    expect(whatsappNeedsCountry('341 555-0000')).toBe(true)
    expect(whatsappNeedsCountry('11 5555 0000')).toBe(true)
    expect(whatsappNeedsCountry('+54 9 341 555 0000')).toBe(false)
    expect(whatsappNeedsCountry('5493415550000')).toBe(false)
    expect(whatsappNeedsCountry('+1 415 555 0000')).toBe(false)
    expect(whatsappNeedsCountry('')).toBe(false)
  })
})

describe('redes sociales: usuario o link', () => {
  it.each([
    ['instagram', '@ana', 'https://instagram.com/ana'],
    ['instagram', ' @ana/ ', 'https://instagram.com/ana'],
    ['instagram', 'instagram.com/ana', 'https://instagram.com/ana'],
    ['instagram', 'www.instagram.com/ana?igsh=1', 'https://www.instagram.com/ana?igsh=1'],
    ['tiktok', '@ana', 'https://tiktok.com/@ana'],
    ['tiktok', 'tiktok.com/@ana', 'https://tiktok.com/@ana'],
    ['x', 'twitter.com/ana', 'https://twitter.com/ana'],
    ['facebook', 'ana.perez', 'https://facebook.com/ana.perez'],
    ['whatsapp', '+54 9 341 555-0000', 'https://wa.me/5493415550000'],
  ])('%s %s → %s', (network, handle, url) => {
    expect(socialUrl(network, handle)).toBe(url)
  })

  it('rechaza un usuario con espacios y un WhatsApp sin código de país', () => {
    expect(socialUrl('instagram', 'ana perez')).toBeNull()
    expect(socialUrl('whatsapp', '341 555-0000')).toBeNull()
  })
})
