import { describe, expect, it } from 'vitest'
import { MODULE_TYPES } from '../../src/modules/profile/lib/profileTypes'
import { PROFILE_LAYOUTS } from '../../src/modules/profile/lib/profileLook'
import { MYCEN_ACCENTS } from '../../src/design/themes'
import es from '../../src/i18n/app/studio/es'
import {
  isTemplatePending, PURPOSE_TEMPLATE, SINGLETON_TYPES, TEMPLATE_IDS, TEMPLATE_LIST, TEMPLATES, templateModuleRows,
  templateModulesToAdd, withoutTemplateMark,
} from '../../src/modules/studio/lib/templates'

// Plantillas de Identity: definiciones válidas y reglas para agregarlas sin pisar nada ni publicar vacíos.

describe('definiciones', () => {
  it('hay entre 5 y 6 plantillas, cada una con su texto', () => {
    expect(TEMPLATE_LIST.length).toBeGreaterThanOrEqual(5)
    expect(TEMPLATE_LIST.length).toBeLessThanOrEqual(6)
    for (const id of TEMPLATE_IDS) {
      expect(TEMPLATES[id].id).toBe(id)
      expect(es.templates.items[id].name.length).toBeGreaterThan(0)
      expect(es.templates.items[id].description.length).toBeGreaterThan(0)
    }
  })

  it('cada tipo existe, y estructura y acento son válidos', () => {
    for (const tpl of TEMPLATE_LIST) {
      expect(tpl.modules.length).toBeGreaterThan(0)
      for (const type of tpl.modules) expect(MODULE_TYPES).toContain(type)
      expect(tpl.modules).not.toContain('contact_card') // se maneja desde Compartir, no es un módulo editable
      expect(PROFILE_LAYOUTS).toContain(tpl.layout)
      expect(MYCEN_ACCENTS).toContain(tpl.accent)
    }
  })

  it('no repite tipos dentro de una plantilla (tampoco los únicos)', () => {
    for (const tpl of TEMPLATE_LIST) expect(new Set(tpl.modules).size).toBe(tpl.modules.length)
    for (const type of SINGLETON_TYPES) expect(MODULE_TYPES).toContain(type)
  })

  it('cada propósito del onboarding tiene su plantilla con la misma estructura de antes', () => {
    expect(TEMPLATES[PURPOSE_TEMPLATE.personal].layout).toBe('credencial')
    expect(TEMPLATES[PURPOSE_TEMPLATE.creator].layout).toBe('portada')
    expect(TEMPLATES[PURPOSE_TEMPLATE.professional].layout).toBe('editorial')
    expect(TEMPLATES[PURPOSE_TEMPLATE.business].layout).toBe('bento')
  })

  it('incluye las plantillas pedidas con los módulos de bio', () => {
    expect(TEMPLATES.musician.modules).toEqual(expect.arrayContaining(['listen_on', 'latest_video', 'support', 'subscribe']))
    expect(TEMPLATES.creator.modules).toEqual(expect.arrayContaining(['latest_video', 'collab']))
    expect(TEMPLATES.business.modules).toEqual(expect.arrayContaining(['hours', 'location']))
  })
})

describe('agregar a un Space', () => {
  const mod = (type: string, config: Record<string, unknown> = {}, deleted_at: string | null = null) =>
    ({ type, config, deleted_at }) as Parameters<typeof templateModulesToAdd>[1][number]

  it('en un Space vacío agrega todos, en orden', () => {
    expect(templateModulesToAdd(TEMPLATES.musician, [])).toEqual(TEMPLATES.musician.modules)
  })

  it('saltea los tipos únicos que ya están, pero no los repetibles', () => {
    const out = templateModulesToAdd(TEMPLATES.musician, [mod('contact_form'), mod('subscribe'), mod('social')])
    expect(out).not.toContain('contact_form')
    expect(out).not.toContain('subscribe')
    expect(out).toContain('social')
  })

  it('lo borrado no cuenta', () => {
    expect(templateModulesToAdd(TEMPLATES.personal, [mod('contact_form', {}, '2026-01-01T00:00:00Z')])).toContain('contact_form')
  })

  it('aplicar dos veces no apila módulos vacíos', () => {
    const first = templateModulesToAdd(TEMPLATES.creator, [])
    const rows = templateModuleRows(TEMPLATES.creator, first, 0)
    expect(templateModulesToAdd(TEMPLATES.creator, rows)).toEqual([])
  })

  it('respeta los tipos que hoy no se pueden agregar', () => {
    const out = templateModulesToAdd(TEMPLATES.creator, [], t => t !== 'collab')
    expect(out).not.toContain('collab')
  })

  it('las filas nacen vacías, ocultas, marcadas y después de lo que había', () => {
    const rows = templateModuleRows(TEMPLATES.business, ['hours', 'location'], 40)
    expect(rows).toEqual([
      { type: 'hours', title: null, content: {}, translations: {}, config: { template: 'business' }, visibility: 'hidden', position: 50 },
      { type: 'location', title: null, content: {}, translations: {}, config: { template: 'business' }, visibility: 'hidden', position: 60 },
    ])
    expect(rows.every(isTemplatePending)).toBe(true)
  })

  it('al completarlo se le saca la marca y se conserva el resto de la config', () => {
    const config = withoutTemplateMark({ template: 'creator', show_from: '2026-01-01T00:00:00Z' })
    expect(config).toEqual({ show_from: '2026-01-01T00:00:00Z' })
    expect(isTemplatePending({ config })).toBe(false)
  })
})
