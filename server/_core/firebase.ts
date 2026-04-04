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
    // Strict input validation
    if (!idToken) {
      throw new Error('idToken is empty or null');
    }
    
    if (typeof idToken !== 'string') {
      throw new Error(`idToken must be a string, received ${typeof idToken}`);
    }

    const trimmed = idToken.trim();
    if (trimmed.length === 0) {
      throw new Error('idToken is empty (whitespace only)');
    }

    // Validate JWT format (must have 3 parts separated by dots)
    const jwtParts = trimmed.split('.');
    if (jwtParts.length !== 3) {
      throw new Error(`Invalid JWT format: expected 3 parts separated by dots, got ${jwtParts.length} parts. Token may be corrupted in transit.`);
    }

    if (jwtParts.some(part => part.length === 0)) {
      throw new Error('Invalid JWT format: one or more parts are empty');
    }

    console.log(`[Firebase] Verifying token (length: ${trimmed.length}, parts: [${jwtParts[0].length}, ${jwtParts[1].length}, ${jwtParts[2].length}])`);
    
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    console.log(`[Firebase] Auth object ready, calling verifyIdToken...`);
    
    try {
      const decodedToken = await auth.verifyIdToken(trimmed);
      console.log(`[Firebase] Token verified successfully for uid: ${decodedToken.uid}, email: ${decodedToken.email}, provider: ${decodedToken.firebase?.sign_in_provider}`);
      return decodedToken;
    } catch (firebaseError) {
      const fbMessage = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
      console.error(`[Firebase] Firebase Admin SDK error: ${fbMessage}`);
      
      // Provide helpful context about what went wrong
      if (fbMessage.includes("Cannot find a matching key")) {
        throw new Error("Token signing key mismatch - ensure client and server use the same Firebase project");
      } else if (fbMessage.includes("Decoding error")) {
        throw new Error("Token is malformed - cannot decode JWT structure");
      } else if (fbMessage.includes("Token expired")) {
        throw new Error("Firebase ID token has expired");
      } else if (fbMessage.includes("Signature verification failed")) {
        throw new Error("Token signature invalid - may be from wrong Firebase project");
      }
      
      throw new Error(`Token verification failed: ${fbMessage}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Firebase] Token verification failed:", message);
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
