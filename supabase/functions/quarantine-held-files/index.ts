// Retención legal (abuso sexual infantil, docs/seguridad/csam.md): pasa las fotos y los PDF de una cuenta retenida de
// los buckets públicos (profile-media, profile-files) al bucket privado mycen-evidence, en <bucket>/<ruta>. Así dejan
// de estar en un link público y la evidencia queda guardada. La llama Super-admin → Personas ("Pasar a evidencia
// privada") con la sesión del super-admin; sólo sigue si admin_get_legal_hold responde (super-admin con aal2) y hay
// retención. Copia primero y borra el original sólo de lo que se copió. De a 300 archivos por vez (`more` = faltan).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SOURCES = ['profile-media', 'profile-files'] as const
const EVIDENCE = 'mycen-evidence'
const MAX_PER_CALL = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    return await run(req)
  } catch (e) {
    console.error('[quarantine-held-files]', e instanceof Error ? e.message : String(e))
    return json({ error: 'internal' }, 500)
  }
})

type Storage = ReturnType<typeof createClient>['storage']

// Todas las rutas de archivos debajo de `prefix` (las carpetas vienen con id null)
async function listFiles(storage: Storage, bucket: string, prefix: string, out: string[], limit: number) {
  for (let offset = 0; out.length < limit; offset += 100) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list ${bucket}: ${error.message}`)
    if (!data?.length) return
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) await listFiles(storage, bucket, path, out, limit)
      else out.push(path)
      if (out.length >= limit) return
    }
    if (data.length < 100) return
  }
}

async function run(req: Request): Promise<Response> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
  const body = await req.json().catch(() => null) as { user_id?: unknown } | null
  const userId = typeof body?.user_id === 'string' ? body.user_id : ''
  if (!UUID.test(userId)) return json({ error: 'invalid_user' }, 400)

  const url = Deno.env.get('SUPABASE_URL')!
  // Con la sesión de quien llama: la base decide si es super-admin (con aal2) y si hay retención
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false }, global: { headers: { Authorization: auth } },
  })
  const hold = await caller.rpc('admin_get_legal_hold', { p_user_id: userId })
  if (hold.error) return json({ error: 'forbidden' }, 403)
  if (!hold.data) return json({ error: 'no_legal_hold' }, 409)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  let moved = 0
  let failed = 0
  let more = false
  for (const bucket of SOURCES) {
    const left = MAX_PER_CALL - moved - failed
    if (left <= 0) { more = true; break }
    const paths: string[] = []
    await listFiles(admin.storage, bucket, userId, paths, left + 1)
    if (paths.length > left) { more = true; paths.length = left }
    const copied: string[] = []
    for (const path of paths) {
      const file = await admin.storage.from(bucket).download(path)
      if (file.error || !file.data) { failed++; continue }
      const up = await admin.storage.from(EVIDENCE).upload(`${bucket}/${path}`, file.data, {
        upsert: true, contentType: file.data.type || 'application/octet-stream',
      })
      if (up.error) { failed++; continue }
      copied.push(path)
    }
    for (let i = 0; i < copied.length; i += 100) {
      const batch = copied.slice(i, i + 100)
      const rm = await admin.storage.from(bucket).remove(batch)
      if (rm.error) failed += batch.length
      else moved += batch.length
    }
  }

  // Bitácora del equipo con la sesión del super-admin (queda quién lo hizo)
  if (moved > 0) await caller.rpc('admin_log_evidence_quarantine', { p_user_id: userId, p_files: moved })
  return json({ moved, failed, more })
}
