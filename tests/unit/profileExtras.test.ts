import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement, Fragment } from 'react'
import { richText } from '@/modules/profile/lib/richText'
import { networkFromUrl } from '@/modules/profile/lib/networks'
import { buildVCard } from '@/modules/profile/lib/vcard'

const html = (body: string) => renderToStaticMarkup(createElement(Fragment, null, ...richText(body)))

describe('texto con formato (sin HTML del dueño)', () => {
  it('negrita, listas y links seguros', () => {
    const out = html('Hola **mundo**\n- uno\n- dos\nMirá [mi web](https://ana.design) o www.ana.com')
    expect(out).toContain('<strong>mundo</strong>')
    expect(out).toContain('<ul class="mp-text-list"><li>uno</li><li>dos</li></ul>')
    expect(out).toContain('href="https://ana.design"')
    expect(out).toContain('href="https://www.ana.com"')
  })
  it('el HTML se muestra como texto y los links peligrosos no se arman', () => {
    const out = html('<img src=x onerror=alert(1)> [x](javascript:alert(1))')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
    expect(out).not.toContain('href="javascript')
  })
})

describe('red por el link', () => {
  it('reconoce las redes y deja vacío lo demás', () => {
    expect(networkFromUrl('https://www.instagram.com/ana')).toBe('instagram')
    expect(networkFromUrl('https://youtu.be/abc')).toBe('youtube')
    expect(networkFromUrl('https://wa.me/549341')).toBe('whatsapp')
    expect(networkFromUrl('mailto:a@b.com')).toBe('email')
    expect(networkFromUrl('https://evil-instagram.com.ar/x')).toBe('')
    expect(networkFromUrl('https://ana.design')).toBe('')
    expect(networkFromUrl('no es un link')).toBe('')
  })
})

describe('tarjeta de contacto con foto y links', () => {
  it('suma los links sin repetir y pliega la foto en líneas de 75', () => {
    const photo = 'A'.repeat(300)
    const vcf = buildVCard({ username: 'ana', name: 'Ana', website: 'https://ana.design' } as never, 'https://mycen.id/ana',
      { photo, urls: ['https://ana.design', 'https://instagram.com/ana', 'https://instagram.com/ana'] })
    expect(vcf.match(/URL:https:\/\/instagram\.com\/ana/g)).toHaveLength(1)
    expect(vcf.split('\r\n').every(l => l.length <= 75)).toBe(true)
    expect(vcf).toContain('PHOTO;ENCODING=b;TYPE=JPEG:')
  })
})
