
// This file needs to be in the public directory.

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwg1BwRKqbHe254U8qilaBOxf_d6PV9vc",
  authDomain: "tasktracker-bphc.firebaseapp.com",
  projectId: "tasktracker-bphc",
  storageBucket: "tasktracker-bphc.firebasestorage.app",
  messagingSenderId: "45392067984",
  appId: "1:45392067984:web:6e9b096aed900f1ce80715",
  measurementId: "G-5000MDKBZ3",
  vapidKey: "REPLACE_WITH_YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
