import type { StudioProfile } from './studioTypes'

// Mis Spaces (Identity Fase 10): el principal está en /{username}; los demás, adentro: /{username}/{slug}.

/** Tope de Spaces sin archivar por cuenta (lo aplica la base: SPACE_LIMIT_REACHED) */
export const MAX_SPACES = 5

/** Igual que mycen_reserved_space_slug() en la base: rutas debajo de /{username} */
export const RESERVED_SPACE_SLUGS = new Set([
  'projects', 'project', 'proyectos', 'proyecto', 'spaces', 'space', 'edit', 'editar', 'settings',
  'studio', 'admin', 'api', 'og', 'vcard', 'qr', 'p', 'about', 'contact', 'links',
])

/** Tipos de Space que se pueden crear desde Studio (los negocios nacen en Mycen Business) */
export const SPACE_PURPOSES = ['project', 'brand', 'artist', 'event', 'professional', 'custom'] as const
export type SpacePurpose = typeof SPACE_PURPOSES[number]

export type SpaceSummary = Pick<StudioProfile,
  'id' | 'username' | 'space_slug' | 'display_name' | 'avatar_url' | 'status' | 'visibility' | 'is_primary' |
  'restaurant_id' | 'purpose' | 'suspended_at' | 'updated_at' | 'published_version_id'>

/** "Mi Estudio" → "mi-estudio" (máx. 40; deja el guion final mientras se escribe) */
export function normalizeSpaceSlug(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').replace(/-+/g, '-').slice(0, 40)
}

/** Slug libre a partir de un nombre: "estudio", "estudio-2"… */
export function suggestSpaceSlug(name: string, spaces: SpaceSummary[]): string {
  const base = normalizeSpaceSlug(name).replace(/-+$/, '').slice(0, 36) || 'mi-space'
  const padded = base.length < 2 ? `mi-${base}` : base
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? padded : `${padded}-${i}`
    if (!spaceSlugIssue(slug, spaces)) return slug
  }
  return padded
}

export type SpaceSlugIssue = 'invalid' | 'reserved' | 'taken'

/** Mismas reglas que la base. `ignoreId`: el Space que se está editando. */
export function spaceSlugIssue(slug: string, spaces: SpaceSummary[], ignoreId?: string): SpaceSlugIssue | null {
  if (!/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(slug) || slug.includes('--')) return 'invalid'
  if (RESERVED_SPACE_SLUGS.has(slug)) return 'reserved'
  if (spaces.some(s => s.space_slug === slug && s.id !== ignoreId)) return 'taken'
  return null
}

/** El Space principal (el que tiene la URL raíz) */
export function primarySpace<T extends Pick<SpaceSummary, 'is_primary' | 'username'>>(spaces: T[]): T | undefined {
  return spaces.find(s => s.is_primary && s.username)
}

/** Dirección sin barra inicial: "ana" o "ana/estudio" */
export function spaceHandle(space: Pick<SpaceSummary, 'username' | 'space_slug'>, primaryUsername: string): string {
  return space.username ?? `${primaryUsername}/${space.space_slug ?? ''}`
}

export const activeSpaces = (spaces: SpaceSummary[]) => spaces.filter(s => s.status !== 'archived')

// El Space que se está editando se recuerda en este dispositivo (comodidad: si no está, se abre el principal)
const key = (userId: string) => `mycen.studio.space.${userId}`

export function readActiveSpace(userId: string): string | null {
  try { return window.localStorage.getItem(key(userId)) } catch { return null }
}

export function writeActiveSpace(userId: string, spaceId: string) {
  try { window.localStorage.setItem(key(userId), spaceId) } catch { /* sin almacenamiento: se abre el principal */ }
}

/** Qué Space abrir: el recordado si sigue activo; si no, el principal; si no, el primero sin archivar. */
export function pickSpace(spaces: SpaceSummary[], preferred: string | null): SpaceSummary | undefined {
  const live = activeSpaces(spaces)
  return live.find(s => s.id === preferred) ?? live.find(s => s.is_primary) ?? live[0] ?? spaces[0]
}
