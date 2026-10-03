import { describe, expect, it } from 'vitest'
import { buildVCard } from '@/modules/profile/lib/vcard'

describe('buildVCard', () => {
  it('incluye sólo los campos autorizados y la URL del perfil', () => {
    const vcf = buildVCard({ username: 'ana', name: 'Ana Pérez', email: 'ana@example.com' }, 'https://mycen.id/ana')
    const lines = vcf.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCARD')
    expect(lines).toContain('VERSION:3.0')
    expect(lines).toContain('FN:Ana Pérez')
    expect(lines).toContain('EMAIL;TYPE=INTERNET:ana@example.com')
    expect(lines).toContain('URL;TYPE=Mycen:https://mycen.id/ana')
    expect(vcf).not.toMatch(/TEL|ORG|TITLE/)
    expect(lines[lines.length - 1]).toBe('END:VCARD')
  })

  it('escapa comas, punto y coma y saltos de línea', () => {
    const vcf = buildVCard({ username: 'x', name: 'Pérez, Ana; Estudio\nDos' }, 'https://mycen.id/x')
    expect(vcf).toContain(String.raw`FN:Pérez\, Ana\; Estudio\nDos`)
  })

  it('usa el username si no hay nombre y no repite WhatsApp igual al teléfono', () => {
    const vcf = buildVCard({ username: 'ana', phone: '+5493415550000', whatsapp: '+5493415550000' }, 'https://mycen.id/ana')
    expect(vcf).toContain('FN:ana')
    expect(vcf.match(/TEL/g)).toHaveLength(1)
  })
})
