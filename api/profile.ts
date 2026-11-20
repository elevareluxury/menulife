// /api/profile?h=<handle>: el perfil público cacheado en la CDN de Vercel (salida web, auditoría del 20/11/2026).
// Sin esto cada visita a mycen.id/{usuario} llamaba dos veces a Postgres (los datos y la visita): un perfil viral
// saturaba la base y se caían todos los perfiles. Acá se pide `get_public_profile` como visitante anónimo (lo mismo
// que ve cualquiera, nunca la vista del dueño) y la CDN lo guarda 30 s; después, durante 10 min, sirve la copia que
// tiene mientras busca la nueva en segundo plano. La página (profileApi.ts) y el pedido temprano de index.html
// (scripts/profilePrefetch.ts) la usan sin sesión; con sesión, o si esto falla, siguen con la RPC directa.
//
// Sólo acepta `h` (cualquier otro parámetro = 400): así no se puede esquivar la caché agregando ?x=1 a cada pedido.

export const config = { runtime: 'edge' }

type Env = Record<string, string | undefined>

const TIMEOUT_MS = 6000
// "ana", "ana/estudio" (Space secundario) y los usernames heredados de Business (con punto o guion bajo)
const HANDLE_RE = /^[a-z0-9][a-z0-9_.-]{0,39}(\/[a-z0-9][a-z0-9-]{0,39})?$/

export const PROFILE_CDN_CACHE = 'public, s-maxage=30, stale-while-revalidate=600'

const json = (body: string, status: number, cache: string) => new Response(body, {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    // El navegador no la guarda (cada visita pregunta a la CDN); la CDN, según `cache`
    'cache-control': 'public, max-age=0, must-revalidate',
    'cdn-cache-control': cache,
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
  },
})

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const keys = [...url.searchParams.keys()]
  const handle = (url.searchParams.get('h') ?? '').trim().toLowerCase()
  if (keys.length !== 1 || keys[0] !== 'h' || !HANDLE_RE.test(handle)) {
    return json('{"error":"bad_request"}', 400, 'public, s-maxage=3600')
  }

  const env: Env = (globalThis as { process?: { env?: Env } }).process?.env ?? {}
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return json('{"error":"unconfigured"}', 503, 'no-store')

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_username: handle }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = await res.text()
    // Un error de la base no se guarda: el próximo pedido vuelve a probar (y la CDN sigue con la copia anterior)
    if (!res.ok) return json('{"error":"upstream"}', 502, 'no-store')
    return json(text || 'null', 200, PROFILE_CDN_CACHE)
  } catch {
    return json('{"error":"upstream"}', 502, 'no-store')
  }
}
