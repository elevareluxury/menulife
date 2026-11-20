import { describe, expect, it } from 'vitest'
import es, { type LegalSection } from '../../src/i18n/app/legal/es'
import { APP_LANGS } from '../../src/i18n/app/languages'

// Lanzamiento L4: términos y privacidad en los 12 idiomas, con las mismas secciones que la versión de referencia.

const shape = (sections: LegalSection[]) =>
  sections.map(s => ({ id: s.id, blocks: s.body.map(b => typeof b === 'string' ? 'p' : `list:${b.list.length}`) }))

describe('textos legales', () => {
  it.each(APP_LANGS.filter(l => l !== 'es'))('%s tiene las mismas secciones, párrafos y listas que el español', async lang => {
    const dict = (await import(`../../src/i18n/app/legal/${lang}.ts`)).default as typeof es
    expect(shape(dict.terms)).toEqual(shape(es.terms))
    expect(shape(dict.privacy)).toEqual(shape(es.privacy))
    // Ayuda y eliminar la cuenta (los links que piden las tiendas)
    expect(shape(dict.support)).toEqual(shape(es.support))
    expect(shape(dict.deletion)).toEqual(shape(es.deletion))
    expect(JSON.stringify(dict.deletion)).toContain('team@mycen.id')
    expect(dict.updated).toBe(es.updated)
    const all = JSON.stringify(dict)
    expect(all).toContain('team@mycen.id')
    expect(all).toContain('Resilio')
    // Las anclas que usan otras pantallas existen
    expect(dict.terms.map(s => s.id)).toContain('reglas')
  })

  it('nombra a todos los proveedores que usa Mycen', () => {
    const providers = JSON.stringify(es.privacy.find(s => s.id === 'proveedores'))
    for (const p of ['Supabase', 'Vercel', 'Resend', 'Anthropic', 'Mercado Pago', 'YouTube', 'Vimeo', 'TikTok', 'Spotify', 'SoundCloud',
      'Cloudflare R2', 'Firebase Cloud Messaging', 'Google Web Risk']) expect(providers).toContain(p)
  })

  it('cuenta lo que guarda la salida web: ánimo con consentimiento, avisos, encuestas, IP como hash y bitácora', () => {
    const data = JSON.stringify(es.privacy.find(s => s.id === 'datos'))
    for (const k of ['Cómo te sentiste', 'Encuestas', 'Avisos con la app cerrada', 'Protección contra abusos', 'equipo de Mycen', 'GPS']) {
      expect(data).toContain(k)
    }
    expect(JSON.stringify(es.privacy.find(s => s.id === 'para-que'))).toContain('consentimiento explícito')
    // Un identificador que cambia cada día es un seudónimo, no un dato anónimo
    expect(JSON.stringify(es.privacy)).not.toMatch(/anónim/)
  })

  it.each(APP_LANGS)('%s nombra a Cloudflare R2 y a los servicios de avisos del navegador', async lang => {
    const dict = (await import(`../../src/i18n/app/legal/${lang}.ts`)).default as typeof es
    const providers = JSON.stringify(dict.privacy.find(s => s.id === 'proveedores'))
    for (const p of ['Cloudflare R2', 'Firebase Cloud Messaging', 'Mozilla']) expect(providers).toContain(p)
  })
})

describe('revisión mundial (20/11/2026)', () => {
  const terms = (id: string) => JSON.stringify(es.terms.find(s => s.id === id))
  const privacy = (id: string) => JSON.stringify(es.privacy.find(s => s.id === id))

  it('términos: uso correcto, lo que es de Mycen, condiciones de Apple, moderación y contranotificación', () => {
    for (const id of ['uso', 'propiedad', 'apps']) expect(es.terms.map(s => s.id)).toContain(id)
    // Las condiciones mínimas que pide Apple para un contrato propio (Apple no es parte, soporte, garantía, reclamos,
    // embargos, tercero beneficiario)
    const apps = es.terms.find(s => s.id === 'apps')!.body.find(b => typeof b !== 'string') as { list: string[] }
    expect(apps.list).toHaveLength(6)
    expect(terms('apps')).toContain('terceros beneficiarios')
    expect(terms('reglas')).toContain('Cómo moderamos')
    expect(terms('reglas')).toContain('resolución extrajudicial')
    expect(terms('derechos-de-autor')).toContain('contranotificación')
    expect(terms('derechos-de-autor')).toContain('pena de perjurio')
    expect(terms('quien')).toContain('Servicios Digitales')
    expect(terms('servicio')).toContain('US$ 100')
  })

  it('privacidad: bases legales, objeción, transferencias, brechas, cookies y derechos por región', () => {
    expect(privacy('para-que')).toContain('podés oponerte')
    expect(privacy('para-que')).toContain('decisiones automatizadas')
    expect(privacy('transferencias')).toContain('cláusulas contractuales tipo')
    expect(privacy('seguridad')).toContain('72 horas')
    expect(privacy('dispositivo')).toContain('aviso de cookies')
    expect(es.privacy.map(s => s.id)).toContain('segun-pais')
    for (const k of ['LGPD', 'California', 'Global Privacy Control', 'Apelación', 'PIPC', 'DPDP']) expect(privacy('segun-pais')).toContain(k)
    expect(privacy('plazos')).toContain('denuncias')
    expect(privacy('menores')).toContain('menos de 18')
  })

  it.each(APP_LANGS.filter(l => l !== 'es'))('%s tiene la sección por región y las condiciones de Apple', async lang => {
    const dict = (await import(`../../src/i18n/app/legal/${lang}.ts`)).default as typeof es
    const region = JSON.stringify(dict.privacy.find(s => s.id === 'segun-pais'))
    for (const k of ['LGPD', 'Global Privacy Control', 'PIPC', 'DPDP', 'team@mycen.id']) expect(region).toContain(k)
    expect(JSON.stringify(dict.terms.find(s => s.id === 'apps'))).toContain('Apple')
    expect(JSON.stringify(dict.privacy.find(s => s.id === 'seguridad'))).toContain('72')
  })
})

