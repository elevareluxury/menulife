import { supabase } from '@/lib/supabase'
import type { ProfileEventType, ProfileLookup, PublicProfile } from './profileTypes'
import type { ProjectLookup, PublicProject } from './projectTypes'

// Las RPCs de Profile todavía no están en database.types.ts (generado antes de la Fase 0)
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as unknown as RpcClient).rpc(fn, args)

export async function fetchPublicProfile(username: string): Promise<ProfileLookup> {
  const { data, error } = await rpc('get_public_profile', { p_username: username })
  if (error) throw new Error(error.message)
  if (!data) return { kind: 'not_found' }

  const result = data as Record<string, unknown>
  if (typeof result.redirect === 'string') return { kind: 'redirect', username: result.redirect }
  if (result.status === 'unavailable') return { kind: 'unavailable' }
  return { kind: 'found', profile: result as unknown as PublicProfile }
}

/** Fuente de la visita: ?src=qr|ig|wa… (se guarda acotada en la base) */
export function visitSource(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('src')
}

/** Registro anónimo de eventos. Nunca bloquea ni rompe la UI. */
export function trackProfileEvent(profileId: string, eventType: ProfileEventType, moduleId?: string | null) {
  rpc('track_profile_event', {
    p_profile_id: profileId,
    p_event_type: eventType,
    p_module_id: moduleId ?? null,
    p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    p_source: visitSource(),
  }).then(() => undefined, () => undefined)
}

export interface ContactCard {
  username: string
  name?: string
  title?: string
  organization?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
}

export async function fetchContactCard(profileId: string): Promise<ContactCard | null> {
  const { data, error } = await rpc('get_profile_contact_card', { p_profile_id: profileId })
  if (error || !data) return null
  return data as ContactCard
}

export async function fetchPublicProject(username: string, slug: string): Promise<ProjectLookup> {
  const { data, error } = await rpc('get_public_project', { p_username: username, p_slug: slug })
  if (error) throw new Error(error.message)
  if (!data) return { kind: 'not_found' }

  const result = data as Record<string, unknown>
  if (typeof result.redirect === 'string') return { kind: 'redirect', username: result.redirect }
  if (result.status === 'unavailable') return { kind: 'unavailable' }
  return { kind: 'found', project: result as unknown as PublicProject }
}
