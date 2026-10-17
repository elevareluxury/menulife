// ¿Web o app? La app de iOS y Android (Capacitor) carga la misma web desde el teléfono: su dirección no es mycen.id
// (capacitor://localhost o https://localhost), así que todo lo que arma links para compartir, llama a las funciones de
// Mycen (/api) o vuelve de un login usa `webOrigin()`. Sin importar @capacitor/core: Capacitor deja `window.Capacitor`.

const PUBLIC_WEB = ((import.meta.env.VITE_APP_URL as string | undefined) || 'https://mycen.id').replace(/\/+$/, '')

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string }

function cap(): CapacitorGlobal | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
}

/** true dentro de la app de iOS o Android */
export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.()
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  const p = cap()?.getPlatform?.()
  return p === 'ios' || p === 'android' ? p : 'web'
}

/** Dirección pública de Mycen: en la web, la de la página; en la app, mycen.id (o VITE_APP_URL) */
export function webOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_WEB
  return isNativeApp() ? PUBLIC_WEB : window.location.origin
}

/** A dónde vuelve el acceso (Google, confirmar email, recuperar contraseña): en la app, el link de mycen.id la abre */
export function authCallbackUrl(): string {
  return `${webOrigin()}/auth/callback`
}

/** Base de las funciones de Mycen (/api/…): relativa en la web, absoluta en la app */
export function apiUrl(path: string): string {
  return isNativeApp() ? `${PUBLIC_WEB}${path}` : path
}
