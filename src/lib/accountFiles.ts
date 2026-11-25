import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const db = supabase as unknown as SupabaseClient

/** Carpetas públicas con archivos de cada cuenta (fotos y PDF de Descargables), todas en `<userId>/…` */
export const ACCOUNT_BUCKETS = ['profile-media', 'profile-files'] as const

/** Todas las rutas de archivos debajo de `prefix` (las carpetas vienen con id null y se recorren adentro) */
async function listAll(bucket: string, prefix: string, out: string[], depth = 0): Promise<boolean> {
  if (depth > 8) return true
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) return false
    if (!data?.length) return true
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) { if (!(await listAll(bucket, path, out, depth + 1))) return false }
      else out.push(path)
    }
    if (data.length < 1000 || out.length > 100_000) return true
  }
}

/**
 * Borra todos los archivos de una cuenta en las carpetas públicas, también los de subcarpetas (auditoría N6). Lo usan
 * borrar la cuenta (la persona, con su sesión) y el equipo al dar de baja el contenido de un perfil suspendido
 * (políticas account_media_admin_* de 20261123000001). Devuelve cuántos borró de verdad (lo que confirma el
 * almacenamiento); si falla, corta ahí.
 */
export async function removeAccountFiles(userId: string): Promise<number> {
  let removed = 0
  for (const bucket of ACCOUNT_BUCKETS) {
    const paths: string[] = []
    if (!(await listAll(bucket, userId, paths))) continue
    for (let i = 0; i < paths.length; i += 1000) {
      const { data, error } = await db.storage.from(bucket).remove(paths.slice(i, i + 1000))
      if (error) break
      removed += data?.length ?? 0
    }
  }
  return removed
}
