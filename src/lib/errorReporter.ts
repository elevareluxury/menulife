import { supabase } from '@/lib/supabase'

// Registro de errores propio (Lanzamiento L5, sin proveedores externos): lo que falla en el navegador de alguien
// llega a la RPC report_client_error y el super-admin lo ve en /super-admin/errores, agrupado.
// No se manda nada personal: mensaje, stack, zona, ruta sin query, versión y navegador (familia y versión mayor).

export type ErrorArea = 'landing' | 'auth' | 'profile' | 'studio' | 'life' | 'business' | 'admin' | 'other'

const MAX_PER_PAGE = 10
const sent = new Set<string>()

/** Zona de la app según la ruta (sirve para agrupar y filtrar en el panel). */
export function areaFromPath(pathname: string): ErrorArea {
  const first = pathname.split('/')[1] ?? ''
  if (first === '') return 'landing'
  if (first === 'studio') return 'studio'
  if (first === 'life') return 'life'
  if (first === 'super-admin') return 'admin'
  if (['dashboard', 'waiter', 'delivery', 'kitchen', 'pos', 'menu'].includes(first)) return 'business'
  if (['login', 'register', 'forgot-password', 'reset-password', 'auth'].includes(first)) return 'auth'
  if (['terminos', 'privacidad'].includes(first)) return 'other'
  return 'profile'
}

/** "Chrome 128 · Android" — sólo familia, versión mayor y sistema (nada que identifique a la persona). */
export function browserLabel(ua: string): string {
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Mac OS X/i.test(ua) ? 'macOS'
    : /Windows/i.test(ua) ? 'Windows' : /Linux/i.test(ua) ? 'Linux' : ''
  // El orden importa: Edge, Opera y Samsung también dicen "Chrome", y Chrome dice "Safari"
  let m: [string, string] | undefined
  for (const n of ['Edg', 'OPR', 'SamsungBrowser', 'FxiOS', 'Firefox', 'CriOS', 'Chrome', 'Version']) {
    const v = new RegExp(`${n}/(\\d+)`).exec(ua)
    if (v) { m = [n, v[1]]; break }
  }
  const names: Record<string, string> = { Edg: 'Edge', OPR: 'Opera', SamsungBrowser: 'Samsung', FxiOS: 'Firefox', CriOS: 'Chrome', Version: 'Safari' }
  const name = m ? `${names[m[0]] ?? m[0]} ${m[1]}` : 'Otro'
  return os ? `${name} · ${os}` : name
}

/** Errores que no son nuestros o no dicen nada (extensiones, scripts de otro dominio, cancelaciones). */
export function isNoise(message: string, stack?: string): boolean {
  if (!message) return true
  if (/^(\w+: )?(Script error\.?|ResizeObserver loop)/i.test(message)) return true
  if (/AbortError|The user aborted a request|cancelled/i.test(message)) return true
  if (stack && /(chrome|moz|safari(-web)?)-extension:\/\//i.test(stack)) return true
  return false
}

function toParts(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: `${err.name}: ${err.message}`, stack: err.stack }
  if (typeof err === 'string') return { message: err }
  try { return { message: JSON.stringify(err).slice(0, 500) } } catch { return { message: String(err) } }
}

function enabled(): boolean {
  return import.meta.env.PROD || import.meta.env.VITE_REPORT_ERRORS === '1'
}

/** Manda un error al registro. Nunca tira: si falla el envío, no pasa nada. */
export function reportError(err: unknown, extra?: { area?: ErrorArea; componentStack?: string }): void {
  if (!enabled() || typeof window === 'undefined') return
  const { message, stack } = toParts(err)
  if (isNoise(message, stack)) return
  const area = extra?.area ?? areaFromPath(window.location.pathname)
  const key = `${area}|${message}`
  if (sent.has(key) || sent.size >= MAX_PER_PAGE) return
  sent.add(key)
  const fullStack = [stack, extra?.componentStack && `Componentes:${extra.componentStack}`].filter(Boolean).join('\n')
  void Promise.resolve(
    (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> }).rpc('report_client_error', {
      p_message: message,
      p_stack: fullStack || null,
      p_area: area,
      p_path: window.location.pathname,
      p_release: (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined)?.slice(0, 7) ?? 'dev',
      p_browser: browserLabel(navigator.userAgent),
    }),
  ).catch(() => { /* sin red o sin la migración: se ignora */ })
}

/** Escucha los errores que nadie atrapó (se llama una vez al arrancar la app). */
export function installErrorReporting(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', e => reportError(e.error ?? e.message))
  window.addEventListener('unhandledrejection', e => reportError(e.reason))
}
