// /api/health para el monitor externo (UptimeRobot, Better Stack…): 200 si la web y la base responden, 503 si no.
// Pide la RPC pública más liviana (get_site_flags) con la clave anónima; no lee ni devuelve datos de nadie.
// Sin caché: cada chequeo llega de verdad a la base.

export const config = { runtime: 'edge' }

const TIMEOUT_MS = 5000

export default async function handler(): Promise<Response> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
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
  return new Response(JSON.stringify({ ok, db, ms: Date.now() - started }), {
    status: ok ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
