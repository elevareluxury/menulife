import { preloadable, type Preloadable } from '../lib/preloadable'
import { profileLook, type ProfileLayout } from '../lib/profileLook'
import type { PublicProfile } from '../lib/profileTypes'
import type { LayoutParts } from '../layouts/types'
import { preloadModuleViews } from './moduleRegistry'

// Cada estructura (V1 · sistema de diseño §9) en su propio chunk: el perfil baja sólo la que usa
export const LAYOUTS: Record<ProfileLayout, Preloadable<LayoutParts>> = {
  credencial: preloadable<LayoutParts>(() => import('../layouts/Credencial')),
  portada: preloadable<LayoutParts>(() => import('../layouts/Portada')),
  editorial: preloadable<LayoutParts>(() => import('../layouts/Editorial')),
  bento: preloadable<LayoutParts>(() => import('../layouts/Bento')),
  clasica: preloadable<LayoutParts>(() => import('../layouts/Clasica')),
}

/**
 * Baja la estructura y los módulos con chunk propio antes de dibujar el perfil (la página pública espera esto con el
 * esqueleto a la vista): así aparece completo de una vez, sin el estado "cargando estructura" que hacía saltar el pie.
 */
export function preloadProfileView(profile: PublicProfile): Promise<void> {
  return Promise.all([LAYOUTS[profileLook(profile.theme).layout].preload(), preloadModuleViews(profile.modules)]).then(() => undefined)
}
