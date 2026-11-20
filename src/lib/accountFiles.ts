import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const db = supabase as unknown as SupabaseClient

/** Carpetas públicas con archivos de cada cuenta (fotos y PDF de Descargables), todas en `<userId>/…` */
export const ACCOUNT_BUCKETS = ['profile-media', 'profile-files'] as const

/**
 * Borra todos los archivos de una cuenta en las carpetas públicas, de a 1000 hasta vaciarlas. Lo usan borrar la
 * cuenta (la persona, con su sesión) y el equipo al dar de baja el contenido de un perfil suspendido (políticas
 * account_media_admin_* de 20261123000001). Devuelve cuántos borró; si el almacenamiento falla, corta ahí.
 */
export async function removeAccountFiles(userId: string): Promise<number> {
  let removed = 0
  for (const bucket of ACCOUNT_BUCKETS) {
    for (let round = 0; round < 100; round++) {
      const { data, error } = await db.storage.from(bucket).list(userId, { limit: 1000 })
      if (error || !data?.length) break
      const { error: rmError } = await db.storage.from(bucket).remove(data.map(f => `${userId}/${f.name}`))
      if (rmError) break
      removed += data.length
    }
  }
  return removed
}
