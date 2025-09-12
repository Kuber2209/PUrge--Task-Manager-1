
// This file needs to be in the public folder.

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// You need to copy your Firebase config object here.
// This should be the same config object used to initialize the app in your main code.
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  authDomain: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  projectId: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  storageBucket: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  messagingSenderId: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  appId: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
  measurementId: "REPLACE_WITH_YOUR_FIREBASE_CONFIG_VALUE",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// The service worker doesn't do anything else here.
// Firebase handles the background notification logic.
// See: https://firebase.google.com/docs/cloud-messaging/js/receive#handle_messages_when_your_app_is_in_the_background

