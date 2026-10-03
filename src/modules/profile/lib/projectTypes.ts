// Proyectos (Identity Fase 5). Coinciden con get_public_project y con las tarjetas que
// get_public_profile agrega a los módulos project/portfolio
// (supabase/migrations/20261009000001_identity_projects.sql).

import type { ProfileTheme, Translations } from './profileTypes'

/** Bloques que se pueden crear desde Studio ('embed' existe en la base pero todavía no se usa). */
export const BLOCK_TYPES = ['heading', 'paragraph', 'image', 'gallery', 'video', 'quote', 'divider', 'credits'] as const
export type BlockType = typeof BLOCK_TYPES[number]

export interface ProjectBlock {
  id: string
  type: BlockType | 'embed'
  data: Record<string, unknown>
  translations?: Translations
}

export interface CreditItem { role?: string; name?: string }
export interface BlockImage { url: string; alt?: string; caption?: string }

/** Tarjeta de un proyecto publicado, como la ve un portfolio */
export interface ProjectCard {
  id: string
  slug: string
  /** /{username}/projects/{slug} */
  path: string
  title: string | null
  summary: string | null
  cover_url: string | null
  translations: Translations
}

export interface PublicProject {
  id: string
  slug: string
  title: string
  summary: string | null
  cover_url: string | null
  data: Record<string, unknown>
  translations: Translations
  blocks: ProjectBlock[]
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'unlisted' | 'private'
  is_owner: boolean
  space: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    theme: ProfileTheme
    default_locale: string | null
    translations: Translations
    visibility: 'public' | 'unlisted' | 'private'
  }
}

export type ProjectLookup =
  | { kind: 'found'; project: PublicProject }
  | { kind: 'redirect'; username: string }
  | { kind: 'unavailable' }
  | { kind: 'not_found' }
