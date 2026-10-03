// Tipos de Mycen Profile. Coinciden con lo que devuelve la RPC get_public_profile
// (supabase/migrations/20261001000001_mycen_profiles_foundation.sql).

import type { AppLang } from '@/i18n/app/languages'
import type { ProjectCard } from './projectTypes'

export type ProfileLang = AppLang

/**
 * Tipos de módulo (mismo orden que el check `profile_modules_type_check`). Cada tipo se define en dos
 * registros: el público (`profile/components/moduleRegistry.ts`) y el de Studio (`studio/lib/moduleCatalog.ts`).
 * Ambos son `Record<ModuleType, …>`: si se agrega un tipo acá, `tsc` obliga a completarlos.
 */
export const MODULE_TYPES = [
  'link', 'social', 'contact', 'location', 'image', 'text',
  'featured_action', 'contact_card', 'gallery', 'product', 'testimonials', 'hours', 'cards',
  'project', 'portfolio', 'link_group',
] as const

export type ModuleType = typeof MODULE_TYPES[number]

/** Campos traducidos: { en: { campo: 'texto' } } */
export type Translations = Partial<Record<ProfileLang, Record<string, unknown>>>

export interface ProfileModule {
  id: string
  type: ModuleType
  title: string | null
  content: Record<string, unknown>
  config: Record<string, unknown>
  translations: Translations
  /** Sólo project/portfolio: tarjetas de los proyectos publicados (las agrega la RPC al responder) */
  projects?: ProjectCard[]
}

export interface PrimaryAction {
  kind: string
  label: string
  url: string
}

export interface ProfileTheme {
  /** 'auto' = sigue al dispositivo del visitante (Fase 9) */
  mode?: 'dark' | 'light' | 'auto'
  /** Fase 9 — valores en profileTheme.ts (CORNERS, BACKGROUNDS, CARD_STYLES) */
  corners?: 'sharp' | 'soft' | 'round'
  background?: 'plain' | 'glow' | 'tint'
  card_style?: 'filled' | 'outline' | 'flat'
  accent?: string
  surface?: string
  title_font?: string
  show_open_status?: boolean
}

export interface PublicProfile {
  id: string
  username: string
  display_name: string
  descriptor: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  purpose: string | null
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  /** unlisted: se ve con el link pero no se indexa (noindex) */
  visibility?: 'public' | 'unlisted' | 'private'
  /** Etiquetas de categoría (ej. Pizza · Vinos) */
  tags?: string[]
  theme: ProfileTheme
  primary_action: PrimaryAction | null
  default_locale: string
  translations: Translations
  has_contact_card: boolean
  is_owner: boolean
  business: {
    slug: string
    business_type: string | null
    plan: string | null
    reservations_enabled: boolean
    timezone: string | null
  } | null
  modules: ProfileModule[]
}

export type ProfileLookup =
  | { kind: 'found'; profile: PublicProfile }
  | { kind: 'redirect'; username: string }
  | { kind: 'unavailable' }
  | { kind: 'not_found' }

export type ProfileEventType =
  | 'view' | 'module_click' | 'primary_action_click'
  | 'share' | 'copy_link' | 'qr_download' | 'vcard_download'

export interface DaySchedule {
  open?: string
  close?: string
  closed?: boolean
}

export type WeekSchedule = Partial<Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DaySchedule
>>
