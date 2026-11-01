import type { ComponentType } from 'react'
import { preloadable, type Preloadable } from '../lib/preloadable'
import type { ModuleType, ProfileLang, ProfileModule } from '../lib/profileTypes'
import {
  CardsModule, ContactModule, LinkGroupModule, FeaturedActionModule, GalleryModule, HoursModule, ImageModule, LinkModule,
  LocationModule, ProductModule, SocialRow, TestimonialsModule, TextModule, type ModuleProps,
} from './ProfileModules'
// Proyectos y portfolio en su chunk (traen la huella para las portadas que faltan): sólo los baja un perfil que los usa
const ProjectModule = preloadable<ModuleProps>(() => import('./ProjectModules').then(m => ({ default: m.ProjectModule })))
const PortfolioModule = preloadable<ModuleProps>(() => import('./ProjectModules').then(m => ({ default: m.PortfolioModule })))
// Entrega 2 (encuesta, descargables, cupón, galería de videos, podcast): un chunk para los cinco
const PollModule = preloadable<ModuleProps>(() => import('./V2Modules').then(m => ({ default: m.PollModule })))
const DownloadsModule = preloadable<ModuleProps>(() => import('./V2Modules').then(m => ({ default: m.DownloadsModule })))
const CouponModule = preloadable<ModuleProps>(() => import('./V2Modules').then(m => ({ default: m.CouponModule })))
const VideoGalleryModule = preloadable<ModuleProps>(() => import('./V2Modules').then(m => ({ default: m.VideoGalleryModule })))
const PodcastModule = preloadable<ModuleProps>(() => import('./V2Modules').then(m => ({ default: m.PodcastModule })))
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
  // El tamaño de cada módulo en la grilla (y el de siempre de cada tipo en Bento) está en lib/moduleSize.ts
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
  link_group:      { View: LinkGroupModule },
  contact_form:    { View: ContactFormModule },
  collab:          { View: CollabModule },
  subscribe:       { View: SubscribeModule },
  media:           { View: MediaModule },
  latest_video:    { View: LatestVideoModule },
  support:         { View: SupportModule },
  listen_on:       { View: ListenOnModule },
  poll:            { View: PollModule },
  downloads:       { View: DownloadsModule },
  coupon:          { View: CouponModule },
  video_gallery:   { View: VideoGalleryModule },
  podcast:         { View: PodcastModule },
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
