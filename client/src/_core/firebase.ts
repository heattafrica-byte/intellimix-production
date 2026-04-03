import { initializeApp, FirebaseApp } from "firebase/app";

let firebaseApp: FirebaseApp | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC0F9LmQwKx1LmQwKx1LmQwKx1LmQwKx1L",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "intellimix.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0270408885",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "intellimix.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
};

export function initializeFirebase(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
}
