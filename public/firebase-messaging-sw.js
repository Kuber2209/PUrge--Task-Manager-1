// This file needs to be in the public directory

// Scripts for firebase and messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// Fetch the Firebase config from our secure API endpoint
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/__/firebase/init.json')) {
    event.respondWith(
      fetch('/api/firebase-config')
    );
  }
});

// This is the crucial part: it fetches the config and initializes Firebase
fetch('/__/firebase/init.json').then(response => response.json()).then(firebaseConfig => {
    firebase.initializeApp(firebaseConfig);

    if (firebase.messaging.isSupported()) {
        const messaging = firebase.messaging();

        // This is the background message handler.
        // It's called when the app is in the background or closed.
        messaging.onBackgroundMessage((payload) => {
            console.log(
                '[firebase-messaging-sw.js] Received background message ',
                payload
            );
            
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: '/icon-192x192.png' // Make sure you have an icon in your public folder
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    }
});
