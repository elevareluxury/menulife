/**
 * Traduce errores de Supabase Auth a mensajes claros, sin detalles internos.
 */
export function authErrorMessage(err: unknown, fallback = 'Algo salió mal. Intentá de nuevo.'): string {
  const raw = ((err as { message?: string })?.message ?? '').toLowerCase()
  const status = (err as { status?: number })?.status
  if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already exists'))
    return 'Ese email ya tiene una cuenta. Iniciá sesión o recuperá tu contraseña.'
  if (raw.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (raw.includes('email not confirmed')) return 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y spam).'
  if (raw.includes('password should be') || raw.includes('weak password')) return 'La contraseña es muy débil: usá al menos 8 caracteres, con letras y números.'
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) return 'El email no es válido.'
  if (raw.includes('banned') || raw.includes('disabled')) return 'Esta cuenta está desactivada. Escribinos si creés que es un error.'
  if (raw.includes('rate limit') || raw.includes('too many') || status === 429) return 'Demasiados intentos. Esperá unos minutos y volvé a probar.'
  if (raw.includes('jwt expired') || raw.includes('session') && raw.includes('expired')) return 'Tu sesión expiró. Iniciá sesión de nuevo.'
  if (raw.includes('failed to fetch') || raw.includes('network')) return 'Sin conexión. Revisá internet e intentá de nuevo.'
  return fallback
}
