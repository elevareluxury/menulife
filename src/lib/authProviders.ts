// Qué accesos con otra cuenta están prendidos en Supabase (GET /auth/v1/settings: público con la clave anónima).
// Así "Continuar con Apple" aparece solo cuando se configura Apple en Supabase → Authentication → Providers, sin
// tocar código ni volver a publicar la app; mientras no esté, no se muestra un botón que fallaría.
// Lo último que respondió queda en el dispositivo para dibujar el botón de entrada sin esperar.

export interface AuthProviders { apple: boolean; google: boolean }

const KEY = 'mycen_auth_providers'
const TIMEOUT_MS = 8_000

/** Lee la respuesta de /auth/v1/settings ({ external: { apple, google, … } }); si no tiene esa forma, null */
export function parseAuthSettings(json: unknown): AuthProviders | null {
  const ext = (json as { external?: unknown } | null)?.external
  if (!ext || typeof ext !== 'object') return null
  const e = ext as Record<string, unknown>
  return { apple: e.apple === true, google: e.google === true }
}

export function cachedAuthProviders(): AuthProviders | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? parseAuthSettings({ external: JSON.parse(raw) }) : null
  } catch {
    return null
  }
}

export async function fetchAuthProviders(): Promise<AuthProviders | null> {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) return null
  try {
    const res = await fetch(`${base}/auth/v1/settings`, {
      headers: { apikey: anon },
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    })
    if (!res.ok) return null
    const providers = parseAuthSettings(await res.json())
    if (providers) {
      try { localStorage.setItem(KEY, JSON.stringify(providers)) } catch { /* sin almacenamiento: no se recuerda */ }
    }
    return providers
  } catch {
    return null
  }
}
