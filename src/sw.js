import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'AnimeVerse'
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: { url: data.url || '/' },
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    const title = event.data.text() || 'AnimeVerse'
    event.waitUntil(self.registration.showNotification(title, { icon: '/favicon.ico' }))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})
