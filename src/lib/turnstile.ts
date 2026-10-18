// CAPTCHA del acceso (Cloudflare Turnstile) para frenar cuentas creadas por bots. Supabase lo exige en signUp,
// signInWithPassword, resetPasswordForEmail y OTP cuando se prende Authentication → Attack Protection → CAPTCHA.
// Sin VITE_TURNSTILE_SITE_KEY no se muestra nada ni se manda token: todo funciona como antes (orden para prenderlo en
// docs/lanzamiento/captcha.md). El script de Cloudflare se descarga sólo en las pantallas que lo usan.
import { isNativeApp, nativePlatform } from '@/lib/platform'

export const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export interface CaptchaEnv {
  siteKey?: string
  /** Plataformas de la app donde se probó que Turnstile anda (VITE_TURNSTILE_IN_APP="android,ios"); por defecto ninguna */
  inApp?: string
  native: boolean
  platform: 'ios' | 'android' | 'web'
}

function currentEnv(): CaptchaEnv {
  return {
    siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
    inApp: import.meta.env.VITE_TURNSTILE_IN_APP as string | undefined,
    native: isNativeApp(),
    platform: nativePlatform(),
  }
}

/**
 * La clave pública si el widget se muestra acá; null si no (sin clave, o adentro de la app donde no se probó).
 * En la app (capacitor://localhost en iOS, https://localhost en Android) la página no es de mycen.id: Turnstile
 * valida el dominio y no hay garantía de que acepte esos orígenes, así que ahí no se muestra salvo que se pida.
 */
export function captchaSiteKey(env: CaptchaEnv = currentEnv()): string | null {
  const key = env.siteKey?.trim()
  if (!key) return null
  if (!env.native) return key
  const allowed = (env.inApp ?? '').split(',').map(s => s.trim().toLowerCase())
  return allowed.includes(env.platform) ? key : null
}

/** Hay clave pero esta plataforma de la app no muestra el widget: si Supabase lo exige, el acceso por email no anda acá */
export function captchaMissingInApp(env: CaptchaEnv = currentEnv()): boolean {
  return env.native && !!env.siteKey?.trim() && captchaSiteKey(env) === null
}

/** Agrega `captchaToken` a las opciones de Supabase sólo si hay token (sin clave, las opciones quedan iguales) */
export function withCaptcha<T extends object>(options: T, token: string | null | undefined): T & { captchaToken?: string } {
  return token ? { ...options, captchaToken: token } : options
}

/** Idioma del widget: los 12 de Mycen tienen código de 2 letras en Turnstile */
export function turnstileLanguage(lang: string): string {
  return lang.slice(0, 2).toLowerCase() || 'auto'
}

/** Tema del widget según el tema de Mycen más cercano (Amanecer = claro); las pantallas de acceso son oscuras */
export function turnstileTheme(el: Element | null): 'light' | 'dark' {
  return el?.closest('[data-mycen-theme]')?.getAttribute('data-mycen-theme') === 'amanecer' ? 'light' : 'dark'
}

export interface TurnstileOptions {
  sitekey: string
  theme: 'light' | 'dark' | 'auto'
  language: string
  size: 'normal' | 'flexible' | 'compact'
  callback: (token: string) => void
  'error-callback': (code: string) => boolean | void
  'expired-callback': () => void
  'timeout-callback': () => void
  'refresh-expired': 'auto' | 'manual' | 'never'
  retry: 'auto' | 'never'
}

export interface TurnstileApi {
  render: (el: HTMLElement, options: TurnstileOptions) => string | undefined
  reset: (id: string) => void
  remove: (id: string) => void
}

let loading: Promise<TurnstileApi> | null = null

/** Descarga el script de Turnstile una sola vez (modo explícito). Si no carga (red, bloqueador), se puede reintentar. */
export function loadTurnstile(timeoutMs = 15000): Promise<TurnstileApi> {
  const w = window as unknown as { turnstile?: TurnstileApi }
  if (w.turnstile) return Promise.resolve(w.turnstile)
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    const fail = () => { script.remove(); loading = null; reject(new Error('turnstile unavailable')) }
    const timer = window.setTimeout(fail, timeoutMs)
    script.onload = () => {
      window.clearTimeout(timer)
      if (w.turnstile) resolve(w.turnstile)
      else fail()
    }
    script.onerror = () => { window.clearTimeout(timer); fail() }
    document.head.appendChild(script)
  })
  return loading
}
