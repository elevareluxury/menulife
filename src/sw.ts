/// <reference lib="webworker" />

// Service worker for MenuLife PWA
// Combines Workbox precache manifest (injected by VitePWA) with:
//   - Runtime caching for Supabase API, images and fonts
//   - Offline fallback to /offline.html
//   - Push notification handler (preserved from original sw.js)

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const PRECACHE   = 'menulife-precache-v1'
const API_CACHE  = 'menulife-api'
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
  const CURRENT = new Set([PRECACHE, API_CACHE, IMG_CACHE, FONT_CACHE])
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

  // Supabase API — Network First (5 min TTL)
  if (url.hostname.endsWith('.supabase.co')) {
    event.respondWith(networkFirst(request, API_CACHE, 10_000))
    return
  }

  // Google Fonts — Cache First (1 year)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
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
async function networkFirst(
  request: Request,
  cacheName: string,
  timeoutMs: number
): Promise<Response> {
  const cache = await caches.open(cacheName)
  try {
    const response = await Promise.race<Response>([
      fetch(request.clone()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ])
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

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

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data: { title: string; body: string; tag: string } = {
    title: '🔔 MenuLife',
    body: 'Nueva notificación',
    tag: 'waiter',
  }
  try {
    data = { ...data, ...(event.data.json() as typeof data) }
  } catch {
    data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/waiter/') && 'focus' in client) return client.focus()
        }
        return self.clients.openWindow('/')
      })
  )
})
