import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCENT_COLORS, MYCEN_ACCENTS, MYCEN_THEMES } from '@/design/themes'
import { nearestAccent, profileLook } from '@/modules/profile/lib/profileLook'
import { PUBLIC_MODULES } from '@/modules/profile/components/moduleRegistry'

// V1 · etapa 03: aspecto del perfil. Mismos casos que tests/db/profile_look.test.sql (la regla vive en los dos lados).

describe('profileLook', () => {
  it('acento más cercano por tono (igual que mycen_nearest_accent)', () => {
    expect(nearestAccent('#F4705A')).toBe('plasma')
    expect(nearestAccent('#3B82F6')).toBe('ion')
    expect(nearestAccent('#A78BFA')).toBe('nebulosa')
    expect(nearestAccent('#22C55E')).toBe('aurora')
    expect(nearestAccent('#0F7C6E')).toBe('aurora')
    expect(nearestAccent('#F1F0E9')).toBe('plasma') // casi blanco
    expect(nearestAccent('rojo')).toBe('plasma')
    expect(nearestAccent(null)).toBe('plasma')
  })

  it('perfiles de antes: Clásica, Universo (Amanecer si eran claros) y el acento más cercano', () => {
    expect(profileLook({})).toEqual({ layout: 'clasica', mode: 'universo', accent: 'plasma', huellaVariant: 'orbitas', cover: { type: 'huella' } })
    expect(profileLook(undefined).layout).toBe('clasica')
    expect(profileLook({ mode: 'light', accent: '#3B82F6' })).toMatchObject({ mode: 'amanecer', accent: 'ion' })
    expect(profileLook({ mode: 'auto' }).mode).toBe('universo')
    expect(profileLook({ mode: 'dark' }).mode).toBe('universo')
  })

  it('valores nuevos tal cual; desconocidos o inseguros, los de por defecto', () => {
    expect(profileLook({ layout: 'bento', mode: 'amanecer', accent: 'aurora', huella_variant: 'pulso' }))
      .toMatchObject({ layout: 'bento', mode: 'amanecer', accent: 'aurora', huellaVariant: 'pulso' })
    expect(profileLook({ layout: 'grilla' as never, huella_variant: 'x' as never })).toMatchObject({ layout: 'clasica', huellaVariant: 'orbitas' })
    expect(profileLook({ cover: { type: 'imagen', url: 'https://x.co/a.webp' } }).cover).toEqual({ type: 'imagen', url: 'https://x.co/a.webp' })
    expect(profileLook({ cover: { type: 'imagen', url: 'javascript:alert(1)' } }).cover).toEqual({ type: 'huella' })
    expect(profileLook({ cover: { type: 'imagen' } }).cover).toEqual({ type: 'huella' })
  })

  it('los colores de los acentos coinciden con tokens.css', () => {
    const css = readFileSync(join(__dirname, '../../src/design/tokens.css'), 'utf8')
    for (const theme of MYCEN_THEMES) for (const accent of MYCEN_ACCENTS) {
      const re = new RegExp(`\\[data-mycen-theme='${theme}'\\]\\[data-mycen-accent='${accent}'\\][^{]*\\{([^}]*)\\}`)
      const body = re.exec(css)![1]
      expect(/--my-accent:\s*([^;]+);/.exec(body)![1], `${theme}/${accent}`).toBe(ACCENT_COLORS[accent][theme].accent)
      expect(/--my-on-accent:\s*([^;]+);/.exec(body)![1]).toBe(ACCENT_COLORS[accent][theme].onAccent)
    }
  })

  it('cada tipo de módulo tiene su tamaño en Bento', () => {
    for (const def of Object.values(PUBLIC_MODULES)) expect(['S', 'M', 'L']).toContain(def.bento)
  })
})
