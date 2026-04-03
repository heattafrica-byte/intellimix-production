import { initializeApp, FirebaseApp } from "firebase/app";

let firebaseApp: FirebaseApp | null = null;
let firebaseConfigPromise: Promise<any> | null = null;

async function getFirebaseConfig() {
  // Firebase requires the public configuration (Web API key, project ID, etc)
  // This is public data used to configure the client SDK, not a secret
  // For now, use environment variables with fallback to empty config
  // The config will be loaded from server if available
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
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
    console.warn("[Firebase] Config incomplete - using placeholder. Set VITE_FIREBASE_* env vars.");
    // For development/testing, provide a minimal config
    // In production, these must be properly configured
    config.apiKey = config.apiKey || "AIzaSyC0F9LmQwKx1LmQwKx1LmQwKx1LmQwKx1L";
    config.projectId = config.projectId || "gen-lang-client-0270408885";
    config.authDomain = config.authDomain || "intellimix.firebaseapp.com";
  }

  firebaseApp = initializeApp(config);
  return firebaseApp;
}
