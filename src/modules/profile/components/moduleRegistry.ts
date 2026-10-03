import type { ComponentType } from 'react'
import type { ModuleType, ProfileLang, ProfileModule } from '../lib/profileTypes'
import {
  CardsModule, ContactModule, FeaturedActionModule, GalleryModule, HoursModule, ImageModule, LinkModule,
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
}

export const PUBLIC_MODULES: Record<ModuleType, PublicModuleDef> = {
  link:            { View: LinkModule },
  social:          { Group: SocialRow },
  contact:         { View: ContactModule },
  location:        { View: LocationModule },
  image:           { View: ImageModule },
  text:            { View: TextModule },
  featured_action: { View: FeaturedActionModule },
  contact_card:    {},
  gallery:         { View: GalleryModule },
  product:         { View: ProductModule },
  testimonials:    { View: TestimonialsModule },
  hours:           { View: HoursModule },
  cards:           { View: CardsModule },
  project:         { View: ProjectModule },
  portfolio:       { View: PortfolioModule },
}

/** Definición pública de un tipo; undefined si la base trae un tipo que esta versión de la app no conoce. */
export function publicModuleDef(type: string): PublicModuleDef | undefined {
  return (PUBLIC_MODULES as Record<string, PublicModuleDef | undefined>)[type]
}
