import { describe, expect, it } from 'vitest'
import { anchorLabel } from '../../src/modules/life/lib/habitAnchor'

const es = (a: string) => `Después de ${a}`

describe('anchorLabel', () => {
  it('arma la frase con la plantilla', () => {
    expect(anchorLabel('el café', es)).toBe('Después de el café')
  })
  it('no repite "después" si la persona ya lo escribió', () => {
    expect(anchorLabel('después del café', es)).toBe('Después del café')
    expect(anchorLabel('  Después de cenar ', es)).toBe('Después de cenar')
  })
  it('funciona con las plantillas de cada idioma', async () => {
    for (const lang of ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru']) {
      const t = (await import(`../../src/i18n/app/life/${lang}.ts`)).default.habitPlus.afterAnchor as (a: string) => string
      expect(anchorLabel('café', t)).toBe(t('café'))
      // Escribir la frase completa no la repite (plantillas con la palabra antes o después)
      expect(anchorLabel(t('café'), t)).toBe(t('café'))
    }
  })
})
