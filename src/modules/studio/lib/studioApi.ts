import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import type {
  DailyStat, ProfilePatch, StudioBusiness, StudioModule, StudioProfile,
} from './studioTypes'

// profiles / profile_modules / profile_stats_daily todavía no están en database.types.ts
const db = supabase as unknown as SupabaseClient

const MEDIA_BUCKET = 'profile-media'
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Traduce errores de la base a mensajes para el usuario (sin detalles internos). */
export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? ''
  if (msg.includes('USERNAME_TAKEN') || msg.includes('profiles_username_key')) return 'Ese nombre de usuario ya está en uso.'
  if (msg.includes('USERNAME_RESERVED')) return 'Ese nombre de usuario está reservado.'
  if (msg.includes('USERNAME_INVALID') || msg.includes('profiles_username_format')) return 'Usá entre 3 y 30 letras minúsculas, números o guiones.'
  if (msg.includes('MODULE_LIMIT_REACHED')) return 'Llegaste al máximo de 100 módulos.'
  if (msg.includes('profiles_text_lengths') || msg.includes('profile_modules_sizes')) return 'Algún texto es demasiado largo.'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return 'Sin conexión. Revisá internet e intentá de nuevo.'
  return 'No pudimos guardar. Intentá de nuevo.'
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

export async function createProfile(userId: string, username: string, displayName: string): Promise<StudioProfile> {
  const { data, error } = await db.from('profiles').insert({
    user_id: userId,
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

export async function updateProfile(id: string, patch: ProfilePatch | { username: string }): Promise<StudioProfile> {
  const { data, error } = await db.from('profiles').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as StudioProfile
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
  if (!file.type.startsWith('image/')) throw new Error('Elegí una imagen (JPG, PNG o WebP).')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('La imagen supera los 5 MB.')
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
  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profiles: profiles ?? [],
    profile_modules: modules ?? [],
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
