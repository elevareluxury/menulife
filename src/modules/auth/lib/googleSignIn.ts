import { authCallbackUrl, isNativeApp, nativePlatform } from '@/lib/platform'
// Entrar con Google (V1.1). Supabase hace el ida y vuelta con Google y vuelve a /auth/callback con la sesión.
// Lo que el registro con email guarda en la cuenta (idioma de los mails, aceptación de los términos, referido) se
// anota antes de salir y se completa al volver, sin pisar lo que la cuenta ya tenga.
import { loadSupabase } from '@/lib/supabaseLazy'
import type { Referral } from '@/lib/referral'
import { claimMetadata, type Claim } from '@/lib/claim'
import { validUsername } from '@/lib/username'
import { betaOn, featureOn } from '@/lib/features'
import { cachedAuthProviders, type AuthProviders } from '@/lib/authProviders'
import { crossBorderConsent, crossBorderMissing, type CrossBorderRegion } from '@/lib/crossBorder'

/** Qué botones de acceso con otra cuenta se muestran.
 *  - Apple: con `appleSignIn` prendido, sólo si Supabase dice que Apple está configurado (`server`, por defecto lo
 *    último que respondió en este dispositivo); con `?beta=1`, siempre (para probarlo antes).
 *  - Google: salvo que Supabase diga que está apagado.
 *  - App Store (regla 4.8): en la app de iPhone, Google sólo va junto a "Entrar con Apple"; sin Apple, ahí se entra
 *    con email. */
export function oauthProviders(server: AuthProviders | null = cachedAuthProviders()): { google: boolean; apple: boolean } {
  const apple = featureOn('appleSignIn') && (server?.apple === true || betaOn())
  const google = featureOn('googleSignIn') && server?.google !== false
  return { google: google && (nativePlatform() !== 'ios' || apple), apple }
}

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
  /** Nombre elegido en "Elegí tu nombre" (landing o perfil) y desde dónde */
  claimed_username?: string
  claim_from?: string
  /** Corea del Sur o China: tildó en el registro el permiso aparte para guardar los datos fuera del país */
  xborder?: CrossBorderRegion
}

export async function startGoogleSignIn(locale: string, referral: Referral | null, terms: boolean): Promise<void> {
  return startOAuthSignIn('google', locale, referral, terms)
}

/** Google o Apple: mismo camino (se anota idioma, términos y referido; vuelve a /auth/callback) */
export async function startOAuthSignIn(
  provider: 'google' | 'apple', locale: string, referral: Referral | null, terms: boolean, claim: Claim | null = null,
  xborder: CrossBorderRegion | null = null,
): Promise<void> {
  const pending: PendingSignup = {
    at: new Date().toISOString(), locale, terms, ...(xborder ? { xborder } : {}),
    ...(referral ? { ref: referral.ref, ref_purpose: referral.purpose } : {}),
    ...claimMetadata(claim),
  }
  try { localStorage.setItem(KEY, JSON.stringify(pending)) } catch { /* sin almacenamiento: se entra igual */ }
  const supabase = await loadSupabase()
  // En la app, el acceso se abre en el navegador del sistema (Google no deja entrar desde una vista web) y vuelve con
  // un link de mycen.id que abre la app (NativeBridge lo lleva a /auth/callback)
  const native = isNativeApp()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authCallbackUrl(), skipBrowserRedirect: native },
  })
  if (error) throw error
  if (native && data?.url) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: data.url, presentationStyle: 'popover' })
  }
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
  if (!m.xborder_consent_at && (pending.xborder === 'kr' || pending.xborder === 'cn')) Object.assign(out, crossBorderConsent(pending.xborder, pending.at))
  if (!m.ref && typeof pending.ref === 'string') {
    out.ref = pending.ref
    if (typeof pending.ref_purpose === 'string') out.ref_purpose = pending.ref_purpose
  }
  if (!m.claimed_username && typeof pending.claimed_username === 'string' && validUsername(pending.claimed_username)) {
    out.claimed_username = pending.claimed_username
    if (typeof pending.claim_from === 'string') out.claim_from = pending.claim_from
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
    const supabase = await loadSupabase()
    const { data } = await supabase.auth.getUser()
    const updates = pendingUpdates(pending, data.user?.user_metadata, new Date())
    if (updates) await supabase.auth.updateUser({ data: updates })
  } catch { /* se completa la próxima vez que haga falta; no frena el ingreso */ }
}

type GateUser = { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null

/** Cuenta creada con Google que todavía no aceptó Términos y Privacidad. */
export function needsTermsOnly(user: GateUser): boolean {
  if (!user) return false
  return user.app_metadata?.provider === 'google' && !user.user_metadata?.terms_accepted_at
}

/** Lo que `/auth/terms` pide antes de seguir: Términos (cuenta de Google nueva) y, en Corea del Sur o China, el
 *  permiso aparte para guardar los datos fuera del país (cualquier cuenta que no lo dio). */
export function needsTerms(user: GateUser, timeZone?: string | null): boolean {
  if (!user) return false
  return needsTermsOnly(user) || crossBorderMissing(user.user_metadata, timeZone) !== null
}

/** Pantallas que se pueden ver sin haber aceptado (para leer los textos o terminar el ingreso). */
export const TERMS_FREE_PATHS = ['/auth/terms', '/auth/callback', '/terminos', '/privacidad', '/soporte', '/eliminar-cuenta', '/login', '/register']
