// /api/health para el monitor externo (UptimeRobot, Better Stack…): 200 si la web y la base responden, 503 si no.
// Pide la RPC pública más liviana (get_site_flags) con la clave anónima; no lee ni devuelve datos de nadie.
// Sin caché: cada chequeo llega de verdad a la base. Devuelve también la versión publicada (release).
//
// ?deep=1 (sólo para el panel del equipo, "Estado del sistema"): además prueba, desde el servidor, lo que el
// navegador no puede pedir por su cuenta — la vista previa al compartir (con el agente de WhatsApp), la imagen de la
// vista previa, el sitemap, "Último video", las portadas automáticas y el calendario. Exige la sesión de un
// super-admin (se comprueba con una RPC del panel); así nadie lo usa para multiplicar pedidos.

export const config = { runtime: 'edge' }

const TIMEOUT_MS = 5000
const DEEP_TIMEOUT_MS = 8000
// Canal y video públicos y estables para probar "Último video" y las portadas (no se guarda nada)
const PROBE_CHANNEL = 'UCBR8-60-B28hp2BmDPdntcQ'
const PROBE_VIDEO = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
const PREVIEW_UA = 'WhatsApp/2.23.20.0 A'
const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{1,29}(\/[a-z0-9][a-z0-9-]{0,39})?$/

export type DeepCheckId = 'og' | 'og_image' | 'sitemap' | 'youtube_latest' | 'media_cover' | 'calendar'
export interface DeepCheck { id: DeepCheckId; ok: boolean; status: number; ms: number; count?: number }

type Env = Record<string, string | undefined>

async function probe(
  id: DeepCheckId, url: string, init: RequestInit,
  judge: (res: Response) => Promise<{ ok: boolean; count?: number }>,
): Promise<DeepCheck> {
  const started = Date.now()
  try {
    const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(DEEP_TIMEOUT_MS) })
    const verdict = await judge(res)
    return { id, status: res.status, ms: Date.now() - started, ...verdict }
  } catch {
    return { id, ok: false, status: 0, ms: Date.now() - started }
  }
}

const isImage = (res: Response) => (res.headers.get('content-type') ?? '').startsWith('image/')

export async function deepChecks(origin: string, username: string | null): Promise<DeepCheck[]> {
  const jobs: Promise<DeepCheck>[] = []
  if (username) {
    jobs.push(probe('og', `${origin}/${username}`, { headers: { 'user-agent': PREVIEW_UA } }, async res => {
      const html = res.ok ? await res.text() : ''
      return { ok: res.status === 200 && html.includes('og:title') }
    }))
    jobs.push(probe('og_image', `${origin}/api/og/${encodeURIComponent(username.split('/')[0])}`, {}, async res => {
      await res.body?.cancel()
      return { ok: res.status === 200 && isImage(res) }
    }))
  }
  jobs.push(probe('sitemap', `${origin}/sitemap.xml`, {}, async res => {
    const xml = res.ok ? await res.text() : ''
    const count = (xml.match(/<loc>/g) ?? []).length
    return { ok: res.status === 200 && count > 0, count }
  }))
  jobs.push(probe('youtube_latest', `${origin}/api/youtube-latest?channel=${PROBE_CHANNEL}`, {}, async res => {
    await res.body?.cancel()
    return { ok: res.status === 200 }
  }))
  jobs.push(probe('media_cover', `${origin}/api/media-cover?url=${encodeURIComponent(PROBE_VIDEO)}`, {}, async res => {
    await res.body?.cancel()
    return { ok: res.status === 200 && isImage(res) }
  }))
  // Un token que no existe: el calendario tiene que contestar (vacío o "no existe"), nunca 503
  jobs.push(probe('calendar', `${origin}/cal/${'0'.repeat(64)}.ics`, {}, async res => {
    const body = res.status === 200 ? await res.text() : ''
    if (res.status !== 200) await res.body?.cancel()
    return { ok: res.status === 404 || (res.status === 200 && body.includes('BEGIN:VCALENDAR')) }
  }))
  return Promise.all(jobs)
}

async function isAdmin(supabaseUrl: string, anonKey: string, auth: string | null): Promise<boolean> {
  if (!auth || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return false
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_pending_counts`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: auth, 'content-type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    await res.body?.cancel()
    return res.ok
  } catch {
    return false
  }
}

export default async function handler(req?: Request): Promise<Response> {
  const env: Env = (globalThis as { process?: { env?: Env } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  const release = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null
  const started = Date.now()
  let db: 'ok' | 'down' | 'unconfigured' = 'unconfigured'
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_site_flags`, {
        method: 'POST',
        headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      db = res.ok ? 'ok' : 'down'
    } catch {
      db = 'down'
    }
  }
  const ok = db === 'ok'
  const body: Record<string, unknown> = { ok, db, ms: Date.now() - started, release }
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

  const url = req ? new URL(req.url) : null
  if (url?.searchParams.get('deep') === '1') {
    if (!supabaseUrl || !anonKey || !(await isAdmin(supabaseUrl, anonKey, req!.headers.get('authorization')))) {
      return new Response(JSON.stringify({ ...body, deep: 'forbidden' }), { status: 403, headers })
    }
    const u = (url.searchParams.get('u') ?? '').toLowerCase()
    body.checks = await deepChecks(url.origin, USERNAME_RE.test(u) ? u : null)
  }

  return new Response(JSON.stringify(body), { status: ok ? 200 : 503, headers })
}
