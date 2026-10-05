// Usernames / slugs que nadie puede usar porque chocan con rutas del sistema.
// Mantener sincronizado con `reserved_usernames` en
// supabase/migrations/20261001000001_mycen_profiles_foundation.sql
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Rutas existentes de la app
  'dashboard', 'login', 'logout', 'register', 'signup', 'auth', 'forgot-password', 'reset-password',
  'solicitar-acceso', 'onboarding', 'life', 'portal', 'q', 'r', 'kitchen', 'mozo', 'waiter',
  'delivery', 'super-admin', 'superadmin', 'catalogo', 'catalog',
  // Rutas de Mycen (actuales y futuras)
  'studio', 'profile', 'profiles', 'exchange', 'analytics', 'settings', 'business', 'hub',
  'intelligence', 'explore', 'pricing', 'precios', 'planes', 'about', 'acerca', 'help', 'ayuda',
  'support', 'soporte', 'contact', 'contacto', 'terms', 'terminos', 'privacy', 'privacidad',
  'legal', 'blog', 'docs', 'status', 'jobs',
  // Técnicas
  'api', 'app', 'www', 'admin', 'root', 'static', 'assets', 'public', 'cdn', 'offline', 'sw',
  'manifest', 'favicon', 'robots', 'sitemap', 'og', 'well-known', 'null', 'undefined',
  // Marca
  'mycen', 'menulife', 'resilio', 'official', 'oficial',
])

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.trim().toLowerCase())
}

/** Si el slug generado choca con una ruta del sistema, le agrega un sufijo estable. */
export function avoidReservedSlug(slug: string): string {
  return isReservedUsername(slug) ? `${slug}-1` : slug
}
