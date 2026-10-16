import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import type { StudioDict } from '@/i18n/app/studio'
import { buildCatalog } from './moduleCatalog'
import { createModules } from './studioApi'
import type { StudioModule } from './studioTypes'
import { templateModuleRows, templateModulesToAdd, type IdentityTemplate } from './templates'

/** Tipos que hoy se pueden agregar desde Studio (los de bio respetan su interruptor en features.ts) */
export function addableTypes(t: StudioDict): (type: ModuleType) => boolean {
  const addable = new Set(buildCatalog(t).filter(d => d.addable).map(d => d.type))
  return type => addable.has(type)
}

/**
 * Agrega al Space los módulos de la plantilla que falten: vacíos, ocultos y con la marca "Completá esto".
 * Nunca borra ni cambia los que ya están. `skipExisting`: no agrega ningún tipo que ya esté (onboarding).
 */
export async function addTemplateModules(profileId: string, template: IdentityTemplate, existing: StudioModule[], t: StudioDict,
  opts: { skipExisting?: boolean } = {}): Promise<StudioModule[]> {
  const allowed = addableTypes(t)
  const present = new Set(existing.filter(m => !m.deleted_at).map(m => m.type))
  const types = templateModulesToAdd(template, existing, type => allowed(type) && !(opts.skipExisting && present.has(type)))
  const last = existing.reduce((max, m) => Math.max(max, m.position), 0)
  return createModules(templateModuleRows(template, types, last).map(r => ({ ...r, profile_id: profileId })))
}
