
self.addEventListener('push', (event) => {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Shinobi Area 🍥'

  const options = {
    body: data.body || 'Tu as une nouvelle notification.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(async (windows) => {
      for (const client of windows) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }

      return clients.openWindow(targetUrl)
    })
  )
})
