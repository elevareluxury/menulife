import type { AuthDict } from '@/i18n/app/auth'
import { captchaMissingInApp } from '@/lib/turnstile'

/** Supabase rechazó el CAPTCHA (Turnstile): token vencido, ya usado, ausente o inválido */
export function isCaptchaError(err: unknown): boolean {
  if (!err) return false
  const raw = ((err as { message?: string })?.message ?? '').toLowerCase()
  const code = (err as { code?: string })?.code
  return code === 'captcha_failed' || raw.includes('captcha')
}

/**
 * Traduce errores de Supabase Auth a mensajes claros (en el idioma de la persona), sin detalles internos.
 */
export function authErrorMessage(err: unknown, errors: AuthDict['errors'], fallback: string): string {
  const raw = ((err as { message?: string })?.message ?? '').toLowerCase()
  const status = (err as { status?: number })?.status
  const code = (err as { code?: string })?.code
  // "captcha verification process failed": en la app sin widget (captchaMissingInApp) se ofrece otro camino
  if (isCaptchaError(err)) return captchaMissingInApp() ? errors.captchaApp : errors.captcha
  if (code === 'user_already_exists' || code === 'email_exists' || raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already exists'))
    return errors.alreadyRegistered
  if (raw.includes('invalid login credentials')) return errors.invalidCredentials
  if (raw.includes('email not confirmed')) return errors.notConfirmed
  // Supabase rechaza la contraseña por sus reglas (largo, tipos de caracteres) o por estar filtrada: code weak_password
  if (code === 'weak_password' || raw.includes('password should') || raw.includes('weak password') || raw.includes('known to be weak'))
    return errors.weakPassword
  if (code === 'email_address_invalid' || raw.includes('invalid email') || raw.includes('unable to validate email')
      || /email address .* is invalid/.test(raw)) return errors.invalidEmail
  if (raw.includes('banned') || raw.includes('disabled')) return errors.disabled
  if (raw.includes('rate limit') || raw.includes('too many') || status === 429) return errors.rateLimit
  if (raw.includes('jwt expired') || raw.includes('session') && raw.includes('expired')) return errors.expired
  if (raw.includes('failed to fetch') || raw.includes('network')) return errors.offline
  // Lo que no conocemos lleva su código entre paréntesis (sin datos de la persona): así soporte sabe qué pasó
  const ref = authErrorRef(err)
  return ref ? `${fallback} (${ref})` : fallback
}

/** Código corto de un error de Supabase Auth (p. ej. "email_address_not_authorized" o "HTTP 400"); nunca el mensaje */
export function authErrorRef(err: unknown): string | null {
  const code = (err as { code?: unknown })?.code
  if (typeof code === 'string' && /^[a-z0-9_]{2,64}$/.test(code)) return code
  const status = (err as { status?: unknown })?.status
  if (typeof status === 'number' && status > 0) return `HTTP ${status}`
  return null
}

/**
 * Para el registro de errores del equipo: un error de acceso que no sabemos explicar, sin emails ni números largos
 * (los mensajes de Supabase a veces repiten el email). Va a /super-admin/errores con zona "auth".
 */
export function authFailureForReport(err: unknown, where: 'register' | 'login'): Error {
  const raw = String((err as { message?: unknown })?.message ?? err ?? '')
  const clean = raw.replace(/[^\s"'<>@]+@[^\s"'<>]+/g, '<email>').replace(/\d{5,}/g, '<n>').slice(0, 200)
  return new Error(`Auth ${where}: ${authErrorRef(err) ?? 'sin código'} · ${clean}`)
}

/**
 * El registro falló del lado del servidor (5xx, por ejemplo si el mail tarda y se corta la respuesta), pero la cuenta
 * suele quedar creada y el mail de confirmación sale igual: conviene pedir que revise el email, no decir que falló.
 */
export function signupMaybeCreated(err: unknown): boolean {
  const raw = ((err as { message?: string })?.message ?? '').toLowerCase()
  const status = (err as { status?: number })?.status
  if (raw.includes('failed to fetch') || raw.includes('network')) return false
  return (typeof status === 'number' && status >= 500 && status < 600)
    || raw.includes('error sending confirmation') || raw.includes('gateway timeout')
}
