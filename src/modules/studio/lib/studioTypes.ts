import type { ModuleType, PrimaryAction, ProfileTheme, Translations } from '@/modules/profile/lib/profileTypes'
import type { BlockType } from '@/modules/profile/lib/projectTypes'

export type ProfileStatus = 'draft' | 'published' | 'unpublished' | 'archived'
export type SpaceVisibility = 'public' | 'unlisted' | 'private'

/** Fila completa de `profiles` (sólo la ve su dueño). */
export interface StudioProfile {
  id: string
  user_id: string
  /** Identidad dueña (Fase 1): los proyectos son de la identidad, no del Space */
  identity_id: string | null
  restaurant_id: string | null
  /** Username propio (Space raíz). null en un Space secundario, que vive en /{principal}/{space_slug} (Fase 10) */
  username: string | null
  space_slug: string | null
  display_name: string
  descriptor: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  purpose: string | null
  status: ProfileStatus
  visibility: SpaceVisibility
  /** Sube con cada cambio de contenido: control de concurrencia (Fase 3) */
  revision: number
  /** Versión que ve el visitante */
  published_version_id: string | null
  tags: string[]
  is_primary: boolean
  theme: ProfileTheme
  /** V1: semilla extra de la huella ("Generar otra") */
  huella_salt?: string | null
  /** V1, perfil vivo: estado actual (≤ 60) y "Disponible" (se ven sin volver a publicar) */
  status_text?: string | null
  available?: boolean
  primary_action: PrimaryAction | null
  contact_card: ContactCardSettings
  default_locale: string
  translations: Translations
  /** Paso del onboarding guiado (0 = perfil importado, 5 = terminado) */
  onboarding_step: number
  published_at: string | null
  updated_at: string
  /** Moderación (Fase 8): sólo lo cambia un administrador */
  suspended_at?: string | null
  suspension_reason?: string | null
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

/** Qué está publicado y si la versión de trabajo tiene cambios sin publicar (RPC space_publish_state). */
export interface PublishState {
  status: ProfileStatus
  visibility: SpaceVisibility
  revision: number
  version_id: string | null
  version_number: number | null
  published_at: string | null
  dirty: boolean
}

/** Fila de `profile_versions` (sin el snapshot, que sólo hace falta para restaurar). */
export interface SpaceVersion {
  id: string
  version_number: number
  created_at: string
  note: string | null
  restored_from: string | null
}

export type ProfilePatch = Partial<Pick<StudioProfile,
  'display_name' | 'descriptor' | 'bio' | 'avatar_url' | 'cover_url' | 'purpose' | 'status' | 'tags' |
  'theme' | 'primary_action' | 'contact_card' | 'default_locale' | 'translations' | 'onboarding_step' | 'visibility' |
  'huella_salt' | 'status_text' | 'available'>>

export interface DailyStat {
  day: string
  event_type: string
  module_id: string | null
  events: number
  visitors: number
}

// ── Proyectos (Identity Fase 5) ──────────────────────────────────────────────

export type ProjectStatus = 'draft' | 'published' | 'archived'

/** Fila de `content_objects` con type='project' (sólo la ve su dueño). */
export interface StudioProject {
  id: string
  identity_id: string
  title: string
  slug: string
  summary: string | null
  cover_url: string | null
  data: Record<string, unknown>
  translations: Translations
  status: ProjectStatus
  visibility: SpaceVisibility
  /** Lo que ven los visitantes (lo escribe sólo publish_project) */
  published_snapshot: { title?: string; summary?: string | null; cover_url?: string | null; translations?: Translations } | null
  published_at: string | null
  updated_at: string
}

export type ProjectPatch = Partial<Pick<StudioProject, 'title' | 'slug' | 'summary' | 'cover_url' | 'visibility' | 'status'>>

/** Fila de `content_blocks` (los ids los genera Studio: guardar = upsert sin duplicar). */
export interface StudioBlock {
  id: string
  type: BlockType
  data: Record<string, unknown>
}

export interface ProjectPublishState {
  status: ProjectStatus
  published_at: string | null
  dirty: boolean
}
