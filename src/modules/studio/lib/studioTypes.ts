import type { ModuleType, PrimaryAction, ProfileTheme, Translations } from '@/modules/profile/lib/profileTypes'

export type ProfileStatus = 'draft' | 'published' | 'unpublished'

/** Fila completa de `profiles` (sólo la ve su dueño). */
export interface StudioProfile {
  id: string
  user_id: string
  restaurant_id: string | null
  username: string
  display_name: string
  descriptor: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  purpose: string | null
  status: ProfileStatus
  is_primary: boolean
  theme: ProfileTheme
  primary_action: PrimaryAction | null
  contact_card: ContactCardSettings
  default_locale: string
  translations: Translations
  published_at: string | null
  updated_at: string
}

export interface ContactCardSettings {
  enabled: boolean
  name?: string
  title?: string
  organization?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
}

/** Fila de `profile_modules` (sólo la ve su dueño). */
export interface StudioModule {
  id: string
  profile_id: string
  type: ModuleType
  title: string | null
  content: Record<string, unknown>
  config: Record<string, unknown>
  translations: Translations
  position: number
  visibility: 'active' | 'hidden'
  deleted_at: string | null
}

export interface StudioBusiness {
  slug: string
  business_type: string | null
  plan: string | null
  reservations_enabled: boolean
  timezone: string | null
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export type ProfilePatch = Partial<Pick<StudioProfile,
  'display_name' | 'descriptor' | 'bio' | 'avatar_url' | 'cover_url' | 'purpose' | 'status' |
  'theme' | 'primary_action' | 'contact_card' | 'default_locale' | 'translations'>>

export interface DailyStat {
  day: string
  event_type: string
  module_id: string | null
  events: number
  visitors: number
}
