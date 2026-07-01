import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notification permission granted.');
    try {
      if (messaging) {
        // En una app real usariamos un vapidKey de variables de entorno:
        // const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_VAPID_KEY });
        const token = await getToken(messaging);
        console.log('FCM Token:', token);
      }
    } catch (e) {
      console.warn('FCM token generation failed (expected if keys not set):', e);
    }
  }
}

export function setupMessageListener() {
  if (messaging) {
    onMessage(messaging, (payload) => {
      console.log('FCM Message received. ', payload);
      const title = payload.notification?.title || 'System Notification';
      const body = payload.notification?.body || '';
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, { body });
        });
      } else {
        new Notification(title, { body });
      }
    });
  }
}

// Function to simulate a push notification from the client for demonstration when a backend is not available
export async function sendLocalPushNotification(title: string, body: string, urlPath?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: urlPath || '/'
    }
  };

  // Run asynchronously and non-blocking
  (async () => {
    try {
      if ('serviceWorker' in navigator) {
        // Race service worker ready promise with a 500ms timeout to avoid infinite hanging when offline or unregistered
        const swReady = navigator.serviceWorker.ready;
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
        const reg = await Promise.race([swReady, timeout]);

        if (reg) {
          await reg.showNotification(title, options);
          return;
        }
      }

      // Fallback: standard web notification
      const notif = new Notification(title, { body, icon: '/icon-192.png', data: { url: urlPath || '/' } });
      notif.onclick = (e) => {
        e.preventDefault();
        window.focus();
        const query = urlPath?.split('?')[1];
        if (query) {
          const params = new URLSearchParams(query);
          const tabParam = params.get('tab');
          const searchParam = params.get('search');
          if (tabParam) {
            window.dispatchEvent(new CustomEvent('app-tab-navigation', { detail: { tab: tabParam, search: searchParam } }));
          }
        }
      };
    } catch (err) {
      console.warn("Notification dispatch failed (expected in some restricted frames/offline):", err);
      try {
        new Notification(title, { body, icon: '/icon-192.png' });
      } catch (e) {}
    }
  })();
}
