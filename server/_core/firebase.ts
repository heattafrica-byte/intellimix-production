import * as admin from "firebase-admin";

let isInitialized = false;

/**
 * Lazy-load Firebase Admin SDK initialization
 */
function initializeFirebase() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    const keyJson = process.env.FIREBASE_ADMIN_KEY;
    if (!keyJson) {
      console.warn("[Firebase] FIREBASE_ADMIN_KEY not set");
      return;
    }

    const credentials = JSON.parse(keyJson);
    
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id,
    });

    isInitialized = true;
    console.log("[Firebase] Admin SDK initialized successfully");
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error instanceof Error ? error.message : error);
  }
}

// Initialize on first use, not on import
export function getFirebaseAuth() {
  if (!isInitialized) {
    initializeFirebase();
  }
  return admin.auth();
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  try {
    const auth = getFirebaseAuth();
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[Firebase] Token verification failed:", error instanceof Error ? error.message : error);
    throw new Error("Invalid token");
  }
}

/**
 * Get user by UID
 */
export async function getUserByUid(uid: string) {
  try {
    const auth = getFirebaseAuth();
    return await auth.getUser(uid);
  } catch (error) {
    console.error("[Firebase] Failed to get user:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Create custom session JWT (similar to what the old system did)
 */
export async function createSessionToken(uid: string, customClaims: Record<string, any> = {}) {
  try {
    const auth = getFirebaseAuth();
    return await auth.createCustomToken(uid, customClaims);
  } catch (error) {
    console.error("[Firebase] Failed to create session token:", error instanceof Error ? error.message : error);
    throw error;
  }
}
