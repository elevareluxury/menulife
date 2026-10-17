import type { AuthDict } from '@/i18n/app/auth'

/**
 * Traduce errores de Supabase Auth a mensajes claros (en el idioma de la persona), sin detalles internos.
 */
export function authErrorMessage(err: unknown, errors: AuthDict['errors'], fallback: string): string {
  const raw = ((err as { message?: string })?.message ?? '').toLowerCase()
  const status = (err as { status?: number })?.status
  const code = (err as { code?: string })?.code
  if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already exists'))
    return errors.alreadyRegistered
  if (raw.includes('invalid login credentials')) return errors.invalidCredentials
  if (raw.includes('email not confirmed')) return errors.notConfirmed
  // Supabase rechaza la contraseña por sus reglas (largo, tipos de caracteres) o por estar filtrada: code weak_password
  if (code === 'weak_password' || raw.includes('password should') || raw.includes('weak password') || raw.includes('known to be weak'))
    return errors.weakPassword
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) return errors.invalidEmail
  if (raw.includes('banned') || raw.includes('disabled')) return errors.disabled
  if (raw.includes('rate limit') || raw.includes('too many') || status === 429) return errors.rateLimit
  if (raw.includes('jwt expired') || raw.includes('session') && raw.includes('expired')) return errors.expired
  if (raw.includes('failed to fetch') || raw.includes('network')) return errors.offline
  return fallback
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
