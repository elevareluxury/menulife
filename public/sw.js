// Level 3: Push Notification Service Worker
// Handles background push events when the waiter app is closed/minimized.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = { title: '🔔 MenuLife', body: 'Nueva notificación', tag: 'waiter' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    data.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/waiter/') && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow('/')
    })
  )
})
