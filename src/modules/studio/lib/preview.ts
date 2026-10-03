import type { ProfileModule, PublicProfile } from '@/modules/profile/lib/profileTypes'
import type { ProjectCard } from '@/modules/profile/lib/projectTypes'
import { isModuleLive } from '@/modules/profile/lib/moduleSchedule'
import type { StudioBusiness, StudioModule, StudioProfile, StudioProject } from './studioTypes'

/**
 * Dominio público de los perfiles. Configurable con VITE_PUBLIC_PROFILE_BASE
 * (ej. https://mycen.id cuando el dominio apunte a Vercel); si no, el dominio actual.
 */
export function publicBaseUrl(): string {
  const env = (import.meta.env.VITE_PUBLIC_PROFILE_BASE as string | undefined)?.replace(/\/+$/, '')
  return env || window.location.origin
}

/**
 * Tarjetas de proyectos, igual que mycen_project_cards: sólo lo publicado y con los datos publicados.
 * ids null = todos los públicos (más nuevos primero); con ids = esos, en ese orden (también no listados).
 */
export function projectCards(projects: StudioProject[], username: string, ids: string[] | null): ProjectCard[] {
  const live = projects.filter(p => p.status === 'published' && p.published_snapshot)
  const chosen = ids
    ? [...new Set(ids)].map(id => live.find(p => p.id === id && p.visibility !== 'private')).filter(p => !!p)
    : live.filter(p => p.visibility === 'public')
      .sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')))
  return chosen.map(p => ({
    id: p.id, slug: p.slug, path: `/${username}/projects/${p.slug}`,
    title: p.published_snapshot?.title ?? p.title,
    summary: p.published_snapshot?.summary ?? null,
    cover_url: p.published_snapshot?.cover_url ?? null,
    translations: p.published_snapshot?.translations ?? {},
  }))
}

function withProjects(m: ProfileModule, projects: StudioProject[], username: string): ProfileModule {
  const c = m.content
  if (m.type === 'project') {
    return { ...m, projects: projectCards(projects, username, typeof c.project_id === 'string' ? [c.project_id] : []) }
  }
  if (m.type === 'portfolio') {
    const ids = Array.isArray(c.project_ids) && c.project_ids.length ? c.project_ids.filter((x): x is string => typeof x === 'string') : null
    return { ...m, projects: projectCards(projects, username, ids) }
  }
  return m
}

/** El perfil tal como lo devolvería get_public_profile, armado con el estado local de Studio. */
export function toPublicProfile(p: StudioProfile, modules: StudioModule[], business: StudioBusiness | null,
  projects: StudioProject[] = []): PublicProfile {
  return {
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    descriptor: p.descriptor,
    bio: p.bio,
    avatar_url: p.avatar_url,
    cover_url: p.cover_url,
    purpose: p.purpose,
    status: p.status,
    visibility: p.visibility,
    tags: p.tags ?? [],
    theme: p.theme ?? {},
    primary_action: p.primary_action,
    default_locale: p.default_locale,
    translations: p.translations ?? {},
    has_contact_card: !!p.contact_card?.enabled,
    is_owner: true,
    business,
    modules: modules
      // Igual que la página pública: sin los módulos que no están en su horario
      .filter(m => m.visibility === 'active' && !m.deleted_at && isModuleLive(m.config))
      .map(m => withProjects({ id: m.id, type: m.type, title: m.title, content: m.content, config: m.config, translations: m.translations ?? {} }, projects, p.username)),
  }
}
