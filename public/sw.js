// Service Worker for Push Notifications
/// <reference lib="webworker" />

// Precache manifest will be injected here by Workbox
const manifest = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...', manifest.length, 'files to precache');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received', event);
  
  let data = {
    title: 'MedTracker',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'medication-reminder',
    requireInteraction: true,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  });

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window if none found
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // This would sync with your backend when back online
    console.log('[SW] Syncing notifications...');
  } catch (error) {
    console.error('[SW] Error syncing notifications:', error);
  }
}
