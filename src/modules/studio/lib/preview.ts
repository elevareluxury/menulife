import type { PublicProfile } from '@/modules/profile/lib/profileTypes'
import type { StudioBusiness, StudioModule, StudioProfile } from './studioTypes'

/**
 * Dominio público de los perfiles. Configurable con VITE_PUBLIC_PROFILE_BASE
 * (ej. https://mycen.id cuando el dominio apunte a Vercel); si no, el dominio actual.
 */
export function publicBaseUrl(): string {
  const env = (import.meta.env.VITE_PUBLIC_PROFILE_BASE as string | undefined)?.replace(/\/+$/, '')
  return env || window.location.origin
}

/** El perfil tal como lo devolvería get_public_profile, armado con el estado local de Studio. */
export function toPublicProfile(p: StudioProfile, modules: StudioModule[], business: StudioBusiness | null): PublicProfile {
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
    theme: p.theme ?? {},
    primary_action: p.primary_action,
    default_locale: p.default_locale,
    translations: p.translations ?? {},
    has_contact_card: !!p.contact_card?.enabled,
    is_owner: true,
    business,
    modules: modules
      .filter(m => m.visibility === 'active' && !m.deleted_at)
      .map(m => ({ id: m.id, type: m.type, title: m.title, content: m.content, config: m.config, translations: m.translations ?? {} })),
  }
}
