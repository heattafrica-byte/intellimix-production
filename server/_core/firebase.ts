import * as admin from "firebase-admin";

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK - MUST succeed on first call
 */
function initializeFirebase() {
  if (isInitialized || admin.apps.length > 0) {
    return;
  }

  const keyJson = process.env.FIREBASE_ADMIN_KEY;
  if (!keyJson) {
    const error = "[Firebase] FIREBASE_ADMIN_KEY environment variable is not set - authentication will fail";
    console.error(error);
    throw new Error(error);
  }

  try {
    const credentials = JSON.parse(keyJson);
    
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error("Firebase credential JSON is missing required fields: project_id, private_key, or client_email");
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id,
    });

    isInitialized = true;
    console.log(`[Firebase] Admin SDK initialized successfully for project: ${credentials.project_id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullError = `[Firebase] Initialization failed: ${message}`;
    console.error(fullError);
    throw new Error(fullError);
  }
}

// Initialize on first use, not on import
export function getFirebaseAuth() {
  if (!isInitialized) {
    initializeFirebase();
  }
  
  if (admin.apps.length === 0) {
    throw new Error("Firebase app not initialized");
  }
  
  return admin.auth();
}

/**
 * Verify Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  try {
    console.log(`[Firebase] Verifying token: type=${typeof idToken}, length=${typeof idToken === 'string' ? idToken.length : 'N/A'}`);
    
    if (!idToken || typeof idToken !== 'string') {
      throw new Error(`idToken must be a non-empty string, got: ${typeof idToken}`);
    }
    
    if (idToken.length === 0) {
      throw new Error('idToken is empty string');
    }
    
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    console.log(`[Firebase] Auth object ready, calling verifyIdToken...`);
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log(`[Firebase] Token verified successfully for uid: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error("[Firebase] Token verification failed:", message);
    console.error("[Firebase] Stack:", stack);
    throw new Error(`Invalid token: ${message}`);
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
