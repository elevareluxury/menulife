import { describe, expect, it } from 'vitest'
import { INSTALL } from '../../src/i18n/app/install'
import { APP_LANGS } from '../../src/i18n/app/languages'

describe('"Agregar a inicio" en los 12 idiomas', () => {
  it('cada idioma tiene los mismos pasos que el español, sin textos vacíos', () => {
    for (const lang of APP_LANGS) {
      const d = INSTALL[lang]
      expect(d.ios.length, lang).toBe(INSTALL.es.ios.length)
      expect(d.android.length, lang).toBe(INSTALL.es.android.length)
      for (const s of [d.add, d.title, d.intro, d.close, ...d.ios, ...d.android]) expect(s.trim(), lang).not.toBe('')
    }
  })
})
