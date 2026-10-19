/// <reference lib="webworker" />

// Service worker de Mycen (lo registran Life OS instalado en el inicio o con avisos permitidos, y los mozos de Business)
// Junta el precache que inyecta VitePWA con:
//   - Caché de imágenes y fuentes propias
//   - /offline.html sin conexión
//   - Avisos: los que muestra la app (showSystemNotification) y los push (Web Push); al tocarlos abre su pantalla

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const PRECACHE   = 'menulife-precache-v1'
const IMG_CACHE  = 'menulife-images'
const FONT_CACHE = 'menulife-fonts'

// ── Install: precache all static assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => {
      const urls = (self.__WB_MANIFEST ?? []).map((e) => e.url)
      return cache.addAll([...urls, '/offline.html']).catch(() => {
        // Individual failures shouldn't abort install
        return Promise.all(
          [...urls, '/offline.html'].map((url) =>
            cache.add(url).catch(() => null)
          )
        )
      })
    })
  )
})

// ── Activate: clean stale caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  // Se borra también la caché vieja de respuestas de Supabase ('menulife-api')
  const CURRENT = new Set([PRECACHE, IMG_CACHE, FONT_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch: caching strategies ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Supabase: directo a la red, sin guardar. Las respuestas son datos privados de la cuenta y la caché las guardaría por
  // URL, sin la sesión: en un celular compartido, otra persona podría verlas sin conexión.
  if (url.hostname.endsWith('.supabase.co')) return

  // Otros orígenes (portadas de YouTube/Spotify, imágenes de terceros…): los pide el navegador directo. Desde acá
  // serían un fetch() del service worker, que la CSP limita con connect-src (sólo Mycen y Supabase) y fallaría.
  if (url.origin !== self.location.origin) return

  // Fuentes (servidas por Mycen) — Cache First
  if (request.destination === 'font') {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  // Images — Cache First (7 days)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMG_CACHE))
    return
  }

  // Navigation — SPA fallback → serve index.html, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then((r) => r ?? caches.match('/index.html'))
          .then((r) => r ?? caches.match('/offline.html'))
          .then((r) => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // Static assets — Cache First with network fallback
  event.respondWith(cacheFirst(request, PRECACHE))
})

// ── Cache helpers ─────────────────────────────────────────────────────────────
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

// ── Avisos ────────────────────────────────────────────────────────────────────
// Push (Web Push): { title, body, tag, url }. Sin datos, un aviso genérico de Mycen.
self.addEventListener('push', (event) => {
  let data: { title: string; body?: string; tag?: string; url?: string } = { title: 'Mycen' }
  if (event.data) {
    try {
      data = { ...data, ...(event.data.json() as typeof data) }
    } catch {
      data.body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag ?? 'mycen',
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      data: { url: data.url },
    })
  )
})

// Al tocar un aviso: su pantalla (data.url, siempre de Mycen) en la ventana abierta, o una nueva. Sin url, los mozos
// vuelven a su pantalla y el resto a Life OS.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = (event.notification.data as { url?: string } | null)?.url
  const target = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        if (!target) {
          const waiter = clientList.find((c) => c.url.includes('/waiter/'))
          if (waiter) return waiter.focus()
        }
        const url = new URL(target ?? '/life', self.location.origin).href
        const open = clientList.find((c) => new URL(c.url).origin === self.location.origin)
        if (open) {
          await open.focus()
          return open.navigate(url).catch(() => self.clients.openWindow(url))
        }
        return self.clients.openWindow(url)
      })
  )
})
