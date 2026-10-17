// RPC públicas sin el cliente de Supabase (~50 KB gzip): la página pública y la landing sólo llaman funciones
// públicas, así que alcanza con un POST a /rest/v1/rpc/<función>. Si hay sesión en el dispositivo se manda su token
// (algunas RPC distinguen al dueño: no cuentan su visita, no lo dejan denunciarse); si venció, se reintenta anónimo.

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface RpcResult<T = unknown> { data: T | null; error: { message: string; code?: string } | null }

/** Token de la sesión que guarda supabase-js en este dispositivo (sb-<ref>-auth-token), si hay */
function sessionToken(): string | null {
  try {
    const ref = new URL(URL_BASE).hostname.split('.')[0]
    const raw = localStorage.getItem(`sb-${ref}-auth-token`)
    if (!raw) return null
    const s = JSON.parse(raw) as { access_token?: string; expires_at?: number; currentSession?: { access_token?: string } }
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return null
    return s.access_token ?? s.currentSession?.access_token ?? null
  } catch {
    return null
  }
}

async function call(fn: string, args: Record<string, unknown>, token: string): Promise<Response> {
  return fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
}

export async function publicRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
  try {
    const token = sessionToken()
    let res = await call(fn, args, token ?? ANON)
    if (res.status === 401 && token) res = await call(fn, args, ANON)
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) return { data: null, error: { message: body?.message ?? res.statusText, code: body?.code } }
    return { data: body as T, error: null }
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
  }
}
