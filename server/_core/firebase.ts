import * as admin from "firebase-admin";

// Parse Firebase admin credentials from environment
const firebaseCredentials = (() => {
  try {
    const keyJson = process.env.FIREBASE_ADMIN_KEY;
    if (!keyJson) {
      console.warn("[Firebase] FIREBASE_ADMIN_KEY not set, Firebase Auth will not work");
      return null;
    }
    return JSON.parse(keyJson);
  } catch (error) {
    console.error("[Firebase] Failed to parse FIREBASE_ADMIN_KEY:", error);
    return null;
  }
})();

// Initialize Firebase Admin SDK
if (!admin.apps.length && firebaseCredentials) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
    projectId: firebaseCredentials.project_id,
  });
  console.log("[Firebase] Admin SDK initialized successfully");
} else if (!firebaseCredentials) {
  console.warn("[Firebase] Credentials not available, running without Firebase Auth");
}

export const firebaseApp = admin.app();
export const firebaseAuth = admin.auth();

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  try {
    return await firebaseAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[Firebase] Token verification failed:", error);
    throw new Error("Invalid token");
  }
}

/**
 * Get user by UID
 */
export async function getUserByUid(uid: string) {
  try {
    return await firebaseAuth.getUser(uid);
  } catch (error) {
    console.error("[Firebase] Failed to get user:", error);
    return null;
  }
}

/**
 * Create custom session JWT (similar to what the old system did)
 */
export async function createSessionToken(uid: string, customClaims: Record<string, any> = {}) {
  try {
    return await firebaseAuth.createCustomToken(uid, customClaims);
  } catch (error) {
    console.error("[Firebase] Failed to create session token:", error);
    throw error;
  }
}
