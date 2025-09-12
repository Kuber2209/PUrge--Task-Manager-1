
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  // IMPORTANT: You need to add your VAPID key here for notifications to work.
  // Go to your Firebase project settings -> Cloud Messaging -> Web Push certificates and copy the "Key pair" value.
  vapidKey: "BGFDHORp9hP5L0PhHxn3cxFGHAndGQb-E9MLK1pXp707LXro7UCEREJo4YgkdtEnDVyzWz9Cr_nzuX2bVej9RGY",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app,"pu-tasker");
const storage = getStorage(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = (typeof window !== 'undefined') ? getMessaging(app) : null;


export { app, auth, db, storage, messaging };
