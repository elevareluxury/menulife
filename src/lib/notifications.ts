import { isNativeApp } from '@/lib/platform'
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission !== 'granted') return
  // En el celular el constructor tira error (ahí sólo se puede desde el service worker): sin aviso, pero sin romper
  try {
    const notification = new Notification(title, { icon: APP_ICON, ...options })
    setTimeout(() => notification.close(), 5000)
  } catch { /* sin aviso del sistema */ }
}

function playAlertBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // AudioContext may be blocked by browser policy
  }
}

function playDing(ctx: AudioContext, startTime: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(880, startTime)
  osc.frequency.exponentialRampToValueAtTime(440, startTime + 0.3)
  gain.gain.setValueAtTime(0.5, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)
  osc.start(startTime)
  osc.stop(startTime + 0.5)
}

export function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    playDing(ctx, ctx.currentTime)
  } catch {
    // AudioContext may be blocked by browser policy
  }
}

export function playUrgentSound() {
  try {
    const ctx = new AudioContext()
    playDing(ctx, ctx.currentTime)
    playDing(ctx, ctx.currentTime + 0.35)
    playDing(ctx, ctx.currentTime + 0.70)
  } catch {
    // AudioContext may be blocked by browser policy
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // En la app de iOS/Android no hay service worker: la app ya funciona sin conexión y avisa con notificaciones nativas
  if (!('serviceWorker' in navigator) || isNativeApp()) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch {
    return null
  }
}

let appSw: Promise<ServiceWorkerRegistration | null> | null = null

/**
 * Service worker de la app (una vez por carga). Sólo lo piden Life OS instalado en el inicio o con avisos permitidos:
 * al instalarse baja la app entera, y quien sólo mira la landing o un perfil no tiene por qué cargarla.
 */
export function appServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!appSw) appSw = registerServiceWorker()
  return appSw
}

/** Abierta desde el ícono del inicio (PWA instalada) */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

const APP_ICON = '/web-app-manifest-192x192.png'

/**
 * Aviso del sistema. En el celular (Android y la app instalada en iPhone) sólo se puede mostrar desde el service worker:
 * `new Notification()` tira error ahí. Devuelve si se mostró, para que quien llama avise en pantalla si no.
 * `url`: adónde lleva al tocarlo (sw.ts → notificationclick).
 */
export async function showSystemNotification(title: string, opts: { body?: string; tag?: string; url?: string } = {}): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const reg = await appServiceWorker()
    if (reg) {
      // Recién registrado puede no estar activo todavía: se espera un poco y si no, se prueba lo del navegador
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ])
      if (ready) {
        await ready.showNotification(title, { body: opts.body, tag: opts.tag, icon: APP_ICON, badge: APP_ICON, data: { url: opts.url } })
        return true
      }
    }
  } catch { /* abajo: lo del navegador */ }
  try {
    new Notification(title, { body: opts.body, tag: opts.tag, icon: APP_ICON })
    return true
  } catch {
    return false
  }
}

export function notifyNewOrder(orderType: string, tableOrName: string) {
  showNotification('🔔 Nuevo Pedido', {
    body: orderType === 'dine_in'
      ? `Mesa ${tableOrName}`
      : `Para llevar: ${tableOrName}`,
    tag: 'new-order',
    requireInteraction: true,
  })
  playAlertBeep()
}

export function notifyDelayedOrder(orderInfo: string, minutes: number) {
  showNotification('⚠️ Pedido Demorado', {
    body: `${orderInfo} lleva ${minutes} minutos`,
    tag: `delayed-${orderInfo}`,
  })
}
