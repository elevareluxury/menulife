import type { ComponentType } from 'react'
import { preloadable, type Preloadable } from '../lib/preloadable'
import type { ModuleType, ProfileLang, ProfileModule } from '../lib/profileTypes'
import {
  CardsModule, ContactModule, LinkGroupModule, FeaturedActionModule, GalleryModule, HoursModule, ImageModule, LinkModule,
  LocationModule, ProductModule, SocialRow, TestimonialsModule, TextModule, type ModuleProps,
} from './ProfileModules'
import { PortfolioModule, ProjectModule } from './ProjectModules'
// Video y música en su propio chunk: sólo lo baja un perfil que lo usa (la huella de la fachada pesa)
const ContactFormModule = preloadable<ModuleProps>(() => import('./ContactFormModule').then(m => ({ default: m.ContactFormModule })))
const CollabModule = preloadable<ModuleProps>(() => import('./CollabModule').then(m => ({ default: m.CollabModule })))
const MediaModule = preloadable<ModuleProps>(() => import('./MediaModule').then(m => ({ default: m.MediaModule })))
const SubscribeModule = preloadable<ModuleProps>(() => import('./SubscribeModule').then(m => ({ default: m.SubscribeModule })))
// "Último video" (bio): chunk propio, pide los datos a /api/youtube-latest
const LatestVideoModule = preloadable<ModuleProps>(() => import('./LatestVideoModule').then(m => ({ default: m.LatestVideoModule })))
// Módulos de bio (V1.1): cada uno con su chunk, sus textos y su CSS
const SupportModule = preloadable<ModuleProps>(() => import('./SupportModule').then(m => ({ default: m.SupportModule })))
const ListenOnModule = preloadable<ModuleProps>(() => import('./ListenOnModule').then(m => ({ default: m.ListenOnModule })))
import { parseMediaUrl } from '../lib/media'

export interface GroupProps {
  modules: ProfileModule[]
  lang: ProfileLang
  onAction: (moduleId: string, item?: string) => void
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
  /** Tamaño en la estructura Bento (V1): S = media columna, M = ancho completo, L = ancho completo destacado.
   *  Una función si depende del contenido (ej. video L, música M). */
  bento: BentoSize | ((module: ProfileModule) => BentoSize)
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
  contact_form:    { View: ContactFormModule, bento: 'M' },
  collab:          { View: CollabModule, bento: 'M' },
  subscribe:       { View: SubscribeModule, bento: 'M' },
  media:           { View: MediaModule, bento: m => (parseMediaUrl(m.content.url)?.kind === 'music' ? 'M' : 'L') },
  latest_video:    { View: LatestVideoModule, bento: 'L' },
  support:         { View: SupportModule, bento: 'M' },
  listen_on:       { View: ListenOnModule, bento: 'M' },
}

/** Tamaño Bento de un módulo */
export function bentoSize(def: PublicModuleDef, module: ProfileModule): BentoSize {
  return typeof def.bento === 'function' ? def.bento(module) : def.bento
}

/** Definición pública de un tipo; undefined si la base trae un tipo que esta versión de la app no conoce. */
export function publicModuleDef(type: string): PublicModuleDef | undefined {
  return (PUBLIC_MODULES as Record<string, PublicModuleDef | undefined>)[type]
}

/** Baja antes de dibujar los módulos con chunk propio que usa el perfil (ver `preloadable`) */
export function preloadModuleViews(modules: ProfileModule[]): Promise<void> {
  const views = new Set(modules.map(m => publicModuleDef(m.type)?.View))
  return Promise.all([...views].map(v => (v as Partial<Preloadable<ModuleProps>> | undefined)?.preload?.())).then(() => undefined)
}
