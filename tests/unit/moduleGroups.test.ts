import { describe, expect, it } from 'vitest'
import { MODULE_TYPES } from '@/modules/profile/lib/profileTypes'
import { buildCatalog, libraryGroups, MODULE_GROUPS } from '@/modules/studio/lib/moduleCatalog'
import es from '@/i18n/app/studio/es'

// Biblioteca "Agregar un módulo" por grupos: cada tipo que se ofrece está en un solo grupo.
describe('grupos de la biblioteca de módulos', () => {
  const catalog = buildCatalog(es)
  const grouped = MODULE_GROUPS.flatMap(g => g.types)

  it('ningún tipo está en dos grupos y todos existen', () => {
    expect(new Set(grouped).size).toBe(grouped.length)
    for (const type of grouped) expect(MODULE_TYPES).toContain(type)
  })

  it('todo tipo que se puede agregar tiene grupo (contact_card no se agrega)', () => {
    for (const def of catalog.filter(d => d.addable)) expect(grouped).toContain(def.type)
    expect(grouped).not.toContain('contact_card')
    expect(grouped.length).toBe(MODULE_TYPES.length - 1)
  })

  it('libraryGroups muestra cada tipo agregable una sola vez y nada que no se pueda agregar', () => {
    const shown = libraryGroups(catalog).flatMap(g => g.defs.map(d => d.type))
    expect(new Set(shown).size).toBe(shown.length)
    expect(shown.sort()).toEqual(catalog.filter(d => d.addable).map(d => d.type).sort())
  })

  it('un tipo apagado no aparece y un grupo vacío no se muestra', () => {
    const off = catalog.map(d => (MODULE_GROUPS.find(g => g.id === 'portfolio')!.types.includes(d.type) ? { ...d, addable: false } : d))
    const groups = libraryGroups(off)
    expect(groups.map(g => g.id)).not.toContain('portfolio')
  })

  it('cada grupo tiene título', () => {
    for (const g of MODULE_GROUPS) expect(es.modules.libraryGroups[g.id]).toBeTruthy()
  })
})
