import type { ComponentType } from 'react'
import type { ModuleType, ProfileLang, ProfileModule } from '../lib/profileTypes'
import {
  CardsModule, ContactModule, LinkGroupModule, FeaturedActionModule, GalleryModule, HoursModule, ImageModule, LinkModule,
  LocationModule, ProductModule, SocialRow, TestimonialsModule, TextModule, type ModuleProps,
} from './ProfileModules'
import { PortfolioModule, ProjectModule } from './ProjectModules'

export interface GroupProps {
  modules: ProfileModule[]
  lang: ProfileLang
  onAction: (moduleId: string) => void
}

/**
 * Cómo se dibuja cada tipo en la página pública (y en la vista previa de Studio, que usa el mismo
 * ProfileView). Registro único: `Record<ModuleType, …>` obliga a cubrir todos los tipos.
 */
export interface PublicModuleDef {
  /** Se dibuja como bloque propio */
  View?: ComponentType<ModuleProps>
  /** Los módulos consecutivos de este tipo se dibujan juntos (ej.: redes en una fila de íconos) */
  Group?: ComponentType<GroupProps>
  // Sin View ni Group: no es un bloque (contact_card se muestra como botón "Guardar contacto")
  /** Tamaño en la estructura Bento (V1): S = media columna, M = ancho completo, L = ancho completo destacado */
  bento: BentoSize
}

export type BentoSize = 'S' | 'M' | 'L'

export const PUBLIC_MODULES: Record<ModuleType, PublicModuleDef> = {
  link:            { View: LinkModule, bento: 'S' },
  social:          { Group: SocialRow, bento: 'M' },
  contact:         { View: ContactModule, bento: 'M' },
  location:        { View: LocationModule, bento: 'M' },
  image:           { View: ImageModule, bento: 'L' },
  text:            { View: TextModule, bento: 'M' },
  featured_action: { View: FeaturedActionModule, bento: 'M' },
  contact_card:    { bento: 'S' },
  gallery:         { View: GalleryModule, bento: 'L' },
  product:         { View: ProductModule, bento: 'M' },
  testimonials:    { View: TestimonialsModule, bento: 'M' },
  hours:           { View: HoursModule, bento: 'S' },
  cards:           { View: CardsModule, bento: 'L' },
  project:         { View: ProjectModule, bento: 'L' },
  portfolio:       { View: PortfolioModule, bento: 'L' },
  link_group:      { View: LinkGroupModule, bento: 'M' },
}

/** Definición pública de un tipo; undefined si la base trae un tipo que esta versión de la app no conoce. */
export function publicModuleDef(type: string): PublicModuleDef | undefined {
  return (PUBLIC_MODULES as Record<string, PublicModuleDef | undefined>)[type]
}
