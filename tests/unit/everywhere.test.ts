import { describe, expect, it } from 'vitest'
import { EVERYWHERE, PLATFORMS, PLATFORM_SRC } from '../../src/i18n/app/share/everywhere'
import { APP_LANGS } from '../../src/i18n/app/languages'
import { classifySource } from '../../src/modules/studio/lib/trafficSources'

// "Poné tu Mycen en todos lados" (V1 · etapa 08): un archivo con los 12 idiomas, misma estructura que el español.
describe('pasos por plataforma', () => {
  it('cada idioma tiene todas las plataformas, con la misma cantidad de pasos que el español', () => {
    for (const lang of APP_LANGS) {
      const d = EVERYWHERE[lang]
      for (const p of PLATFORMS) {
        expect(d.names[p], `${lang}/${p}`).toBeTruthy()
        expect(d.steps[p].length, `${lang}/${p}`).toBe(EVERYWHERE.es.steps[p].length)
        for (const step of d.steps[p]) expect(step.trim().length, `${lang}/${p}`).toBeGreaterThan(5)
      }
    }
  })

  it('el ?src= de cada plataforma se reconoce en los resultados', () => {
    expect(classifySource(PLATFORM_SRC.instagram, null).key).toBe('instagram')
    expect(classifySource(PLATFORM_SRC.tiktok, null).key).toBe('tiktok')
    expect(classifySource(PLATFORM_SRC.linkedin, null).key).toBe('linkedin')
    expect(classifySource(PLATFORM_SRC.whatsapp, null).key).toBe('whatsapp')
    expect(classifySource(PLATFORM_SRC.email, null).key).toBe('email')
  })
})
