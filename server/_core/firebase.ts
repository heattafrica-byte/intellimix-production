import * as admin from "firebase-admin";

let isInitialized = false;
let initError: Error | null = null;

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
    initError = new Error(error);
    throw initError;
  }

  try {
    console.log("[Firebase] Parsing FIREBASE_ADMIN_KEY JSON...");
    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch (parseError) {
      throw new Error(`Failed to parse FIREBASE_ADMIN_KEY as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    console.log(`[Firebase] ✅ Parsed Firebase credentials for project: ${credentials.project_id}`);
    
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error("Firebase credential JSON is missing required fields: project_id, private_key, or client_email");
    }
    
    console.log("[Firebase] Calling admin.initializeApp()...");
    try {
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id,
      });
    } catch (initErr) {
      console.error(`[Firebase] admin.initializeApp() error:`, initErr);
      throw initErr;
    }

    isInitialized = true;
    console.log(`[Firebase] ✅ Admin SDK initialized successfully for project: ${credentials.project_id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullError = `[Firebase] Initialization failed: ${message}`;
    console.error(fullError);
    initError = new Error(message);
    throw initError;
  }
}

// Initialize on first use, not on import
export function getFirebaseAuth() {
  if (!isInitialized) {
    try {
      initializeFirebase();
    } catch (error) {
      console.error(`[Firebase] Failed to initialize during getFirebaseAuth():`, error);
      throw error;
    }
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

    console.log(`[Firebase] ========== Token Verification Started ==========`);
    console.log(`[Firebase] Token length: ${trimmed.length}`);
    console.log(`[Firebase] JWT parts: [${jwtParts[0].length} chars, ${jwtParts[1].length} chars, ${jwtParts[2].length} chars]`);
    console.log(`[Firebase] Token header: ${jwtParts[0]}`);
    console.log(`[Firebase] Token payload (first 100 chars): ${jwtParts[1].substring(0, 100)}...`);
    console.log(`[Firebase] Token signature (first 50 chars): ${jwtParts[2].substring(0, 50)}...`);
    
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    console.log(`[Firebase] Calling admin.auth().verifyIdToken()...`);
    
    try {
      // Wrap in try-catch to get full error details from Firebase Admin SDK
      let decodedToken;
      try {
        decodedToken = await auth.verifyIdToken(trimmed);
      } catch (fbError: any) {
        // Log the exact error from Firebase
        console.error(`[Firebase] Firebase Admin SDK threw:`, {
          message: fbError?.message,
          code: fbError?.code,
          errorConstructor: fbError?.constructor?.name,
          ...(fbError instanceof Error && { stack: fbError.stack })
        });
        throw fbError;
      }

      console.log(`[Firebase] ✅ Token verified for uid: ${decodedToken.uid}`);
      console.log(`[Firebase] Email: ${decodedToken.email}, Provider: ${decodedToken.firebase?.sign_in_provider}`);
      console.log(`[Firebase] =========================================`);
      return decodedToken;
    } catch (fbError: any) {
      const fbMessage = fbError?.message || String(fbError);
      console.error(`[Firebase] ❌ Firebase verification error: ${fbMessage}`);
      
      // Handle specific Firebase errors
      if (fbMessage.includes("Cannot find a matching key")) {
        throw new Error("Token from different Firebase project - ensure client Firebase config matches server");
      } else if (fbMessage.includes("Decoding error")) {
        throw new Error("Token structure invalid - cannot decode JWT");
      } else if (fbMessage.includes("Token expired")) {
        throw new Error("Firebase ID token has expired");
      } else if (fbMessage.includes("Signature verification failed")) {
        throw new Error("Token signature invalid");
      } else if (fbMessage.includes("Cannot read properties")) {
        throw new Error("Firebase SDK internal error - token may be malformed. Server mismatch with client Firebase config?");
      }
      
      throw new Error(`Token verification failed: ${fbMessage}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Firebase] ❌ Token verification failed:", message);
    console.error("[Firebase] =========================================");
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
