import { describe, expect, it } from 'vitest'
import {
  audienceFreshness, inches, readAudience, readBrands, readCredits, readMeasurements, readPress, readRepresentation,
} from '../../src/modules/profile/lib/portfolio'
import { portfolioStrings } from '../../src/modules/profile/lib/portfolioI18n'
import { APP_LANGS } from '../../src/i18n/app/languages'
import { TEMPLATE_LIST, TEMPLATES, PURPOSE_TEMPLATE } from '../../src/modules/studio/lib/templates'
import { MODULE_TYPES } from '../../src/modules/profile/lib/profileTypes'

// Portfolio profesional: lo que no se cargó no se muestra y nada se inventa.

describe('medidas', () => {
  it('sólo lo cargado, cm entre 20 y 260, con coma decimal', () => {
    expect(readMeasurements({ height: '178', waist: '61,5', hips: '', bust: '999', shoe: ' 38 ', eyes: '' })).toEqual([
      { key: 'height', cm: 178 }, { key: 'waist', cm: 61.5 }, { key: 'shoe', text: '38' },
    ])
    expect(readMeasurements({})).toEqual([])
  })
  it('pulgadas: altura en pies y contornos en pulgadas', () => {
    expect(inches('height', 178)).toBe(`5'10"`)
    expect(inches('height', 182.9)).toBe(`6'0"`)
    expect(inches('waist', 61)).toBe('24"')
  })
})

describe('audiencia', () => {
  it('necesita seguidores o vistas; limpia el @ y descarta links que no abren', () => {
    const rows = readAudience({ items: [
      { platform: 'instagram', handle: '@luna', followers: '120.000', engagement: '3,4', url: 'javascript:alert(1)' },
      { platform: 'tiktok' },
      { platform: 'raro', avg_views: 5000 },
    ] })
    expect(rows).toEqual([
      { platform: 'instagram', handle: 'luna', followers: 120000, avg_views: undefined, engagement: 3.4, url: undefined },
      { platform: 'other', handle: undefined, followers: undefined, avg_views: 5000, engagement: undefined, url: undefined },
    ])
  })
  it('frescura: al día, puede estar desactualizado, vencido y sin fecha', () => {
    const today = new Date('2026-11-20T12:00:00')
    expect(audienceFreshness('2026-11-01', today)).toBe('fresh')
    expect(audienceFreshness('2026-05-01', today)).toBe('stale')
    expect(audienceFreshness('2025-10-01', today)).toBe('expired')
    expect(audienceFreshness('', today)).toBe('missing')
    expect(audienceFreshness('2027-01-01', today)).toBe('missing')
  })
})

describe('marcas, prensa, créditos y representación', () => {
  it('piden lo mínimo y validan links, años, emails y teléfonos', () => {
    expect(readBrands({ items: [{ name: 'Marca', year: '1850' }, { name: '' }] })).toEqual([{ name: 'Marca', logo_url: undefined, url: undefined, year: undefined }])
    expect(readPress({ items: [{ quote: 'Brilla', outlet: '' }, { quote: 'Brilla', outlet: 'Diario', date: '2026-02-30x' }] }))
      .toEqual([{ quote: 'Brilla', outlet: 'Diario', url: undefined, date: undefined }])
    expect(readCredits({ items: [{ title: 'Campaña', year: '2024' }] })[0].year).toBe('2024')
    const [rep] = readRepresentation({ items: [{ role: 'x', name: 'Agencia Sur', email: 'no-es-mail', phone: '+54 11 5555-5555' }] })
    expect(rep).toMatchObject({ role: 'other', name: 'Agencia Sur', email: undefined, phone: '+54 11 5555-5555' })
  })
})

describe('textos y plantillas', () => {
  it('los 12 idiomas tienen todos los textos públicos', () => {
    const keys = JSON.stringify(Object.keys(portfolioStrings('es')).sort())
    for (const lang of APP_LANGS) {
      const s = portfolioStrings(lang)
      expect(JSON.stringify(Object.keys(s).sort())).toBe(keys)
      expect(s.reportedBy).toContain('{name}')
      expect(s.reportedBy).toContain('{date}')
    }
  })
  it('5 plantillas de talentos con tipos que existen; cada tipo de talento del onboarding tiene la suya', () => {
    const talent = TEMPLATE_LIST.filter(t => t.group === 'talent')
    expect(talent.map(t => t.id)).toEqual(['model', 'actor', 'influencer', 'singer', 'creative'])
    for (const t of talent) for (const type of t.modules) expect(MODULE_TYPES).toContain(type)
    for (const p of ['model', 'actor', 'influencer', 'musician', 'creative'] as const) expect(TEMPLATES[PURPOSE_TEMPLATE[p]].group).toBe('talent')
    // El book de la modelo viene con la galería sin recortes (formato, no texto de ejemplo)
    expect(TEMPLATES.model.presets?.gallery).toEqual({ layout: 'book' })
  })
})
