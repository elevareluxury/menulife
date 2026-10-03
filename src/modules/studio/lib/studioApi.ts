import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import type {
  DailyStat, ProfilePatch, PublishState, SpaceVersion, StudioBusiness, StudioModule, StudioProfile,
} from './studioTypes'
import { studioT } from '@/i18n/app/studio'

// profiles / profile_modules / profile_stats_daily todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

const MEDIA_BUCKET = 'profile-media'
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Traduce errores de la base a mensajes para el usuario (sin detalles internos). */
export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? ''
  const e = studioT().errors
  if (msg.includes('USERNAME_TAKEN') || msg.includes('profiles_username_key')) return e.usernameTaken
  if (msg.includes('USERNAME_RESERVED')) return e.usernameReserved
  if (msg.includes('USERNAME_INVALID') || msg.includes('profiles_username_format')) return e.usernameInvalid
  if (msg.includes('REVISION_CONFLICT')) return e.conflict
  if (msg.includes('NAME_REQUIRED')) return e.nameRequired
  if (msg.includes('MODULE_LIMIT_REACHED')) return e.moduleLimit
  if (msg.includes('content_objects_identity_id_type_slug_key')) return e.projectSlugTaken
  if (msg.includes('content_objects_slug_check')) return e.projectSlugInvalid
  if (msg.includes('profiles_text_lengths') || msg.includes('profile_modules_sizes')) return e.tooLong
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return e.offline
  return e.generic
}

export async function loadMyProfile(userId: string): Promise<StudioProfile | null> {
  const { data, error } = await db.from('profiles').select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as StudioProfile | null
}

export async function loadModules(profileId: string): Promise<StudioModule[]> {
  const { data, error } = await db.from('profile_modules').select('*')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as StudioModule[]
}

export async function loadBusiness(restaurantId: string | null): Promise<StudioBusiness | null> {
  if (!restaurantId) return null
  const { data } = await db.from('restaurants')
    .select('slug, business_type, plan, reservations_enabled, timezone')
    .eq('id', restaurantId)
    .maybeSingle()
  return (data as StudioBusiness | null) ?? null
}

export async function createProfile(userId: string, username: string, displayName: string, locale = 'es'): Promise<StudioProfile> {
  const { data, error } = await db.from('profiles').insert({
    user_id: userId,
    default_locale: locale,
    username: username.trim().toLowerCase(),
    display_name: displayName.trim(),
    purpose: 'personal',
    status: 'draft',
    is_primary: true,
    theme: { mode: 'dark', accent: '#F1F0E9', title_font: 'geist' },
  }).select('*').single()
  if (error) throw error
  return data as StudioProfile
}

/**
 * Guarda cambios en la versión de trabajo. Con `expectedRevision`, sólo guarda si nadie más guardó
 * antes (otra pestaña o dispositivo): si la revisión cambió, falla con REVISION_CONFLICT.
 */
export async function updateProfile(id: string, patch: ProfilePatch | { username: string }, expectedRevision?: number): Promise<StudioProfile> {
  let req = db.from('profiles').update(patch).eq('id', id)
  if (expectedRevision !== undefined) req = req.eq('revision', expectedRevision)
  const { data, error } = await req.select('*')
  if (error) throw error
  const row = (data as StudioProfile[] | null)?.[0]
  if (!row) throw new Error('REVISION_CONFLICT')
  return row
}

export async function loadProfile(id: string): Promise<StudioProfile> {
  const { data, error } = await db.from('profiles').select('*').eq('id', id).single()
  if (error) throw error
  return data as StudioProfile
}

// ── Publicación con versiones (Fase 3) ──────────────────────────────────────

/** Congela la versión de trabajo como nueva versión pública. */
export async function publishSpace(profileId: string, note?: string): Promise<{ version_id: string; version_number: number }> {
  const { data, error } = await db.rpc('publish_space', { p_profile_id: profileId, p_note: note ?? null })
  if (error) throw error
  return data as { version_id: string; version_number: number }
}

/** Publica una versión anterior como versión nueva y la trae a Studio. */
export async function restoreSpaceVersion(versionId: string): Promise<{ version_id: string; version_number: number }> {
  const { data, error } = await db.rpc('restore_space_version', { p_version_id: versionId })
  if (error) throw error
  return data as { version_id: string; version_number: number }
}

export async function loadPublishState(profileId: string): Promise<PublishState> {
  const { data, error } = await db.rpc('space_publish_state', { p_profile_id: profileId })
  if (error) throw error
  return data as PublishState
}

export async function loadVersions(profileId: string, limit = 20): Promise<SpaceVersion[]> {
  const { data, error } = await db.from('profile_versions')
    .select('id, version_number, created_at, note, restored_from')
    .eq('profile_id', profileId)
    .order('version_number', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as SpaceVersion[]
}

export type UsernameCheck = 'available' | 'taken' | 'reserved' | 'invalid'

export async function checkUsername(username: string): Promise<UsernameCheck> {
  const { data, error } = await db.rpc('check_username', { p_username: username })
  if (error) throw error
  return data as UsernameCheck
}

export async function createModule(input: {
  profile_id: string
  type: ModuleType
  title: string | null
  content: Record<string, unknown>
  translations: Record<string, unknown>
  position: number
}): Promise<StudioModule> {
  const { data, error } = await db.from('profile_modules').insert(input).select('*').single()
  if (error) throw error
  return data as StudioModule
}

export async function updateModule(id: string, patch: Partial<Pick<StudioModule,
  'title' | 'content' | 'translations' | 'visibility' | 'position' | 'config'>>): Promise<StudioModule> {
  const { data, error } = await db.from('profile_modules').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as StudioModule
}

/** Borrado lógico (estado "Deleted" de la Etapa 2). */
export async function deleteModule(id: string): Promise<void> {
  const { error } = await db.from('profile_modules').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Guarda el orden explícito: posición = índice × 10. */
export async function saveOrder(modules: StudioModule[]): Promise<void> {
  const results = await Promise.all(modules.map((m, i) =>
    db.from('profile_modules').update({ position: (i + 1) * 10 }).eq('id', m.id)))
  const failed = results.find(r => r.error)
  if (failed?.error) throw failed.error
}

export async function uploadMedia(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(studioT().errors.notImage)
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(studioT().errors.tooBig)
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000', contentType: file.type, upsert: false,
  })
  if (error) throw error
  return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function loadStats(profileId: string, days: number): Promise<DailyStat[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const { data, error } = await db.from('profile_stats_daily')
    .select('day, event_type, module_id, events, visitors')
    .eq('profile_id', profileId)
    .gte('day', since)
  if (error) throw error
  return ((data ?? []) as DailyStat[]).map(r => ({ ...r, events: Number(r.events), visitors: Number(r.visitors) }))
}

// ── Privacidad: exportar y eliminar ──────────────────────────────────────────

const LIFE_TABLES = [
  'life_goals', 'life_goal_milestones', 'life_tasks', 'life_habits', 'life_habit_logs',
  'life_transactions', 'life_brain_items', 'life_achievements', 'life_score',
]

/** Copia de los datos del usuario (lo que su sesión puede leer) en un JSON descargable. */
export async function exportMyData(userId: string, email: string | undefined): Promise<Blob> {
  const { data: profiles } = await db.from('profiles').select('*').eq('user_id', userId)
  const profileIds = (profiles ?? []).map((p: { id: string }) => p.id)
  const { data: modules } = profileIds.length
    ? await db.from('profile_modules').select('*').in('profile_id', profileIds).is('deleted_at', null)
    : { data: [] }
  const life: Record<string, unknown[]> = {}
  for (const table of LIFE_TABLES) {
    const { data, error } = await db.from(table).select('*').eq('user_id', userId)
    if (!error) life[table] = data ?? []
  }
  // Identity: raíz, versiones publicadas y contenido reutilizable
  const identity: Record<string, unknown[]> = {}
  const { data: identities } = await db.from('identities').select('*').eq('user_id', userId)
  identity.identities = identities ?? []
  const identityIds = (identities ?? []).map((i: { id: string }) => i.id)
  if (profileIds.length) {
    const { data } = await db.from('profile_versions').select('*').in('profile_id', profileIds)
    identity.profile_versions = data ?? []
  }
  if (identityIds.length) {
    const { data: objects } = await db.from('content_objects').select('*').in('identity_id', identityIds)
    identity.content_objects = objects ?? []
    const objectIds = (objects ?? []).map((o: { id: string }) => o.id)
    if (objectIds.length) {
      const { data } = await db.from('content_blocks').select('*').in('content_object_id', objectIds)
      identity.content_blocks = data ?? []
    }
  }
  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profiles: profiles ?? [],
    profile_modules: modules ?? [],
    identity,
    life_os: life,
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export type DeleteResult = 'deleted' | 'has_business' | 'error'

/** Borra las imágenes subidas y la cuenta (perfiles y datos de Life OS caen en cascada). */
export async function deleteMyAccount(userId: string): Promise<DeleteResult> {
  try {
    const { data: files } = await db.storage.from(MEDIA_BUCKET).list(userId, { limit: 1000 })
    if (files?.length) await db.storage.from(MEDIA_BUCKET).remove(files.map(f => `${userId}/${f.name}`))
  } catch { /* si falla la limpieza de imágenes, se sigue con la cuenta */ }
  const { error } = await db.rpc('delete_my_account')
  if (!error) return 'deleted'
  return (error.message ?? '').includes('HAS_BUSINESS') ? 'has_business' : 'error'
}
