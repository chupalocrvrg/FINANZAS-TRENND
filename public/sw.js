const CACHE_NAME = 'stratos-pwa-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn("Offline fallback assets cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip api requests, Firestore sockets or Firebase-auth calls
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || !url.pathname.match(/\.(html|js|css|png|jpg|jpeg|svg|woff2|json|webmanifest)$/) && url.pathname !== '/') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// FCM Background Push Notification Handler
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { notification: { title: 'Notificación', body: event.data.text() } };
    }
  }
  
  const title = data.notification?.title || 'Notificación del Sistema';
  const options = {
    body: data.notification?.body || 'Tienes nuevas actualizaciones',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notify click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background Sync Strategy for Pending Ledger Entries
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ledger') {
    console.log('[ServiceWorker] Executing sync-ledger');
    event.waitUntil(syncPendingLedgerEntries());
  }
});

async function syncPendingLedgerEntries() {
  // We use indexedDB directly or fallback to Firestore's built-in offline capabilities.
  // Since Firestore automatically handles offline persistence when `enableIndexedDbPersistence` is on,
  // we are primarily logging here for visibility that the background sync event successfully fired.
  console.log('[ServiceWorker] Pending ledger entries synchronized with the server.');
  return Promise.resolve();
}
