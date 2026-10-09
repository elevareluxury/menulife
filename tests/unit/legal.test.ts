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
    expect(dict.updated).toBe(es.updated)
    const all = JSON.stringify(dict)
    expect(all).toContain('team@mycen.id')
    expect(all).toContain('Resilio')
    // Las anclas que usan otras pantallas existen
    expect(dict.terms.map(s => s.id)).toContain('reglas')
  })

  it('nombra a todos los proveedores que usa Mycen', () => {
    const providers = JSON.stringify(es.privacy.find(s => s.id === 'proveedores'))
    for (const p of ['Supabase', 'Vercel', 'Resend', 'Anthropic', 'Mercado Pago', 'YouTube', 'Vimeo', 'TikTok', 'Spotify', 'SoundCloud']) expect(providers).toContain(p)
  })
})
