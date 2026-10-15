// Entrar con Google (V1.1). Supabase hace el ida y vuelta con Google y vuelve a /auth/callback con la sesión.
// Lo que el registro con email guarda en la cuenta (idioma de los mails, aceptación de los términos, referido) se
// anota antes de salir y se completa al volver, sin pisar lo que la cuenta ya tenga.
import { supabase } from '@/lib/supabase'
import type { Referral } from '@/lib/referral'

const KEY = 'mycen_oauth_pending'
const MAX_AGE_MS = 60 * 60 * 1000

export interface PendingSignup {
  at: string
  locale: string
  /** Tildó Términos y Privacidad antes de ir a Google (en el registro). Desde el login no se pide: si la cuenta es
   *  nueva, `/auth/terms` lo pide antes de entrar. */
  terms?: boolean
  ref?: string
  ref_purpose?: string | null
}

export async function startGoogleSignIn(locale: string, referral: Referral | null, terms: boolean): Promise<void> {
  const pending: PendingSignup = {
    at: new Date().toISOString(), locale, terms,
    ...(referral ? { ref: referral.ref, ref_purpose: referral.purpose } : {}),
  }
  try { localStorage.setItem(KEY, JSON.stringify(pending)) } catch { /* sin almacenamiento: se entra igual */ }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' },
  })
  if (error) throw error
}

/** Datos para completar la cuenta: sólo los que falten y si lo anotado tiene menos de una hora. */
export function pendingUpdates(
  pending: PendingSignup | null, meta: Record<string, unknown> | undefined, now: Date,
): Record<string, unknown> | null {
  if (!pending || typeof pending.at !== 'string') return null
  const age = now.getTime() - Date.parse(pending.at)
  if (!(age >= 0 && age <= MAX_AGE_MS)) return null
  const m = meta ?? {}
  const out: Record<string, unknown> = {}
  if (!m.terms_accepted_at && pending.terms === true) out.terms_accepted_at = pending.at
  if (!m.locale && typeof pending.locale === 'string') out.locale = pending.locale
  if (!m.ref && typeof pending.ref === 'string') {
    out.ref = pending.ref
    if (typeof pending.ref_purpose === 'string') out.ref_purpose = pending.ref_purpose
  }
  return Object.keys(out).length ? out : null
}

/** Al volver de Google: completa la cuenta y borra lo anotado. Si falla, se entra igual. */
export async function applyPendingSignup(): Promise<void> {
  let pending: PendingSignup | null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    localStorage.removeItem(KEY)
    pending = JSON.parse(raw) as PendingSignup
  } catch { return }
  try {
    const { data } = await supabase.auth.getUser()
    const updates = pendingUpdates(pending, data.user?.user_metadata, new Date())
    if (updates) await supabase.auth.updateUser({ data: updates })
  } catch { /* se completa la próxima vez que haga falta; no frena el ingreso */ }
}

/** Cuenta creada con Google que todavía no aceptó Términos y Privacidad: `/auth/terms` lo pide antes de seguir. */
export function needsTerms(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false
  return user.app_metadata?.provider === 'google' && !user.user_metadata?.terms_accepted_at
}

/** Pantallas que se pueden ver sin haber aceptado (para leer los textos o terminar el ingreso). */
export const TERMS_FREE_PATHS = ['/auth/terms', '/auth/callback', '/terminos', '/privacidad', '/login', '/register']
