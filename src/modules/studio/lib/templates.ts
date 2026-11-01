// Plantillas de Identity: un punto de partida para estar lista en un minuto (onboarding y Studio → Módulos).
// Cada plantilla define estructura, acento sugerido y una lista ordenada de tipos de módulo. Nada de texto de
// ejemplo: los módulos se crean VACÍOS y OCULTOS, marcados con `config.template` ("Completá esto"). Al guardarlos
// completos en el editor pasan a visibles y pierden la marca; mientras tanto no entran en la versión publicada
// (`publish_space` sólo congela los módulos activos). Así nada inventado llega a la página pública.
// Archivo puro (sin React ni i18n): los nombres y descripciones están en el diccionario de Studio (`templates`).

import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import type { ProfileLayout } from '@/modules/profile/lib/profileLook'
import type { MycenAccent } from '@/design/themes'

export const TEMPLATE_IDS = [
  'musician', 'creator', 'professional', 'business', 'personal',
  // Por rubro
  'restaurant', 'beauty', 'photographer', 'coach', 'store', 'podcaster',
] as const
export type TemplateId = typeof TEMPLATE_IDS[number]

/** Propósito elegido en el onboarding (paso "¿Para qué es tu perfil?") */
export type OnboardingPurpose = 'personal' | 'creator' | 'professional' | 'business'

export interface IdentityTemplate {
  id: TemplateId
  /** 'profile' = por tipo de perfil (las del onboarding), 'industry' = por rubro */
  group: 'profile' | 'industry'
  layout: ProfileLayout
  accent: MycenAccent
  /** Tipos de módulo, en el orden en que se agregan */
  modules: ModuleType[]
}

export const TEMPLATES: Record<TemplateId, IdentityTemplate> = {
  musician: {
    id: 'musician', group: 'profile', layout: 'portada', accent: 'nebulosa',
    modules: ['listen_on', 'latest_video', 'social', 'cards', 'support', 'subscribe', 'contact_form'],
  },
  creator: {
    id: 'creator', group: 'profile', layout: 'portada', accent: 'plasma',
    modules: ['latest_video', 'social', 'link_group', 'collab', 'support', 'subscribe'],
  },
  professional: {
    id: 'professional', group: 'profile', layout: 'editorial', accent: 'ion',
    modules: ['text', 'portfolio', 'testimonials', 'link', 'contact', 'contact_form'],
  },
  business: {
    id: 'business', group: 'profile', layout: 'bento', accent: 'sol',
    modules: ['featured_action', 'hours', 'location', 'contact', 'gallery', 'testimonials', 'social'],
  },
  personal: {
    id: 'personal', group: 'profile', layout: 'credencial', accent: 'aurora',
    modules: ['social', 'link_group', 'text', 'contact_form'],
  },
  restaurant: {
    id: 'restaurant', group: 'industry', layout: 'bento', accent: 'sol',
    modules: ['featured_action', 'hours', 'location', 'gallery', 'coupon', 'testimonials', 'contact', 'social'],
  },
  beauty: {
    id: 'beauty', group: 'industry', layout: 'credencial', accent: 'rosa',
    modules: ['featured_action', 'gallery', 'hours', 'location', 'testimonials', 'contact', 'social'],
  },
  photographer: {
    id: 'photographer', group: 'industry', layout: 'editorial', accent: 'mono',
    modules: ['portfolio', 'gallery', 'testimonials', 'text', 'contact_form', 'social'],
  },
  coach: {
    id: 'coach', group: 'industry', layout: 'editorial', accent: 'lima',
    modules: ['text', 'featured_action', 'video_gallery', 'testimonials', 'downloads', 'subscribe', 'contact_form'],
  },
  store: {
    id: 'store', group: 'industry', layout: 'bento', accent: 'arena',
    modules: ['product', 'coupon', 'gallery', 'testimonials', 'contact', 'social'],
  },
  podcaster: {
    id: 'podcaster', group: 'industry', layout: 'portada', accent: 'nebulosa',
    modules: ['podcast', 'social', 'poll', 'support', 'subscribe', 'collab'],
  },
}

export const TEMPLATE_LIST: IdentityTemplate[] = TEMPLATE_IDS.map(id => TEMPLATES[id])

/** Plantilla que aplica el onboarding según el propósito */
export const PURPOSE_TEMPLATE: Record<OnboardingPurpose, TemplateId> = {
  personal: 'personal', creator: 'creator', professional: 'professional', business: 'business',
}

/** Tipos que no tiene sentido repetir en un mismo Space: si ya hay uno, la plantilla no agrega otro */
export const SINGLETON_TYPES: readonly ModuleType[] = [
  'contact_form', 'subscribe', 'collab', 'support', 'hours', 'location', 'contact', 'latest_video', 'portfolio',
  'testimonials', 'gallery', 'featured_action', 'contact_card', 'podcast',
]

type ModuleLike = { type: ModuleType; config?: Record<string, unknown> | null; deleted_at?: string | null }

/** Módulo creado por una plantilla que todavía no se completó (está oculto hasta guardarlo completo) */
export function isTemplatePending(m: { config?: Record<string, unknown> | null }): boolean {
  return typeof m.config?.template === 'string'
}

/**
 * Qué tipos agrega una plantilla a un Space que ya tiene `existing`: nunca borra nada; saltea los tipos únicos que
 * ya están y los que ya tienen un módulo de plantilla sin completar (aplicar dos veces no apila vacíos).
 * `allowed` filtra los tipos que hoy no se pueden agregar (ej. módulos de bio apagados).
 */
export function templateModulesToAdd(template: IdentityTemplate, existing: ModuleLike[], allowed: (type: ModuleType) => boolean = () => true): ModuleType[] {
  const live = existing.filter(m => !m.deleted_at)
  const out: ModuleType[] = []
  for (const type of template.modules) {
    if (!allowed(type) || out.includes(type)) continue
    const same = live.filter(m => m.type === type)
    if (SINGLETON_TYPES.includes(type) && same.length) continue
    if (same.some(isTemplatePending)) continue
    out.push(type)
  }
  return out
}

/** Filas a insertar (vacías, ocultas y marcadas), después de la última posición del Space */
export function templateModuleRows(template: IdentityTemplate, types: ModuleType[], lastPosition: number) {
  return types.map((type, i) => ({
    type,
    title: null,
    content: {} as Record<string, unknown>,
    translations: {} as Record<string, unknown>,
    config: { template: template.id } as Record<string, unknown>,
    visibility: 'hidden' as const,
    position: lastPosition + (i + 1) * 10,
  }))
}

/** Config al guardar completo un módulo de plantilla: sin la marca (y el módulo pasa a visible) */
export function withoutTemplateMark(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config }
  delete next.template
  return next
}
