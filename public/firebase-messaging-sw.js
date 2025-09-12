// Import and configure the Firebase SDK
// See: https://firebase.google.com/docs/web/messaging/js/client
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { getAnalytics } from "firebase/analytics";

// This self-referencing fetch is a trick to get the environment variables from Next.js
// into the service worker context.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Initialize the Firebase app in the service worker
(async () => {
  try {
    const response = await fetch('/__/firebase/init.json');
    const firebaseConfig = await response.json();
    
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    onBackgroundMessage(messaging, (payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      if (!payload.notification) {
          return;
      }

      const notificationTitle = payload.notification.title || 'New Message';
      const notificationOptions = {
        body: payload.notification.body || 'You have a new message.',
        icon: '/favicon.ico', // Make sure you have a favicon
        data: {
          url: payload.fcmOptions?.link || payload.notification.click_action || '/',
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

  } catch (error) {
    console.error("Error initializing Firebase in service worker:", error);
  }
})();


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    self.clients.openWindow(urlToOpen)
  );
});
