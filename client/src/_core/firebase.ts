import { initializeApp, FirebaseApp } from "firebase/app";

let firebaseApp: FirebaseApp | null = null;
let firebaseConfigPromise: Promise<any> | null = null;

async function getFirebaseConfig() {
  // Firebase requires the public configuration (Web API key, project ID, etc)
  // This is public data used to configure the client SDK, not a secret
  // Firebase credentials are meant to be public in web apps
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC0fm1hfBrzHwDSdN6kE2WS9cou6DlAato",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "intellimix-c87ea.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "intellimix-c87ea",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "intellimix-c87ea.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "283928119735",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:283928119735:web:8b6af20ebefee4e03a8032",
  };
}

export async function initializeFirebase(): Promise<FirebaseApp> {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!firebaseConfigPromise) {
    firebaseConfigPromise = getFirebaseConfig();
  }

  const config = await firebaseConfigPromise;
  
  // Verify required config is present
  if (!config.apiKey || !config.projectId) {
    throw new Error("Firebase configuration is incomplete. Check your configuration in client/src/_core/firebase.ts");
  }

  firebaseApp = initializeApp(config);
  return firebaseApp;
}
