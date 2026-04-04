import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { initializeFirebase } from "./firebase";
import { getSessionCookie, setSessionCookie } from "@/_core/sessionStorage";

export interface AuthSession {
  sessionToken: string;
  uid: string;
  email: string | null;
  name: string | null;
  expiresAt: number;
  refreshToken?: string;
}

const SESSION_STORAGE_KEY = "intellimix_auth_session";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

class AuthTokenManager {
  private session: AuthSession | null = null;
  private refreshPromise: Promise<AuthSession | null> | null = null;

  /**
   * Load session from localStorage
   */
  loadSession(): AuthSession | null {
    if (this.session) {
      return this.session;
    }

    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
        
        // Check if session is still valid
        if (this.session && this.session.expiresAt > Date.now()) {
          console.log("[AuthTokenManager] Session loaded from storage");
          return this.session;
        } else {
          console.log("[AuthTokenManager] Stored session expired, clearing");
          localStorage.removeItem(SESSION_STORAGE_KEY);
          this.session = null;
        }
      }
    } catch (error) {
      console.error("[AuthTokenManager] Failed to load session from storage:", error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      this.session = null;
    }

    return null;
  }

  /**
   * Save session to localStorage
   */
  saveSession(session: AuthSession) {
    this.session = session;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log("[AuthTokenManager] Session saved to storage, expires in", Math.round((session.expiresAt - Date.now()) / 1000), "seconds");
  }

  /**
   * Clear session
   */
  clearSession() {
    this.session = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log("[AuthTokenManager] Session cleared");
  }

  /**
   * Get current valid session token
   * Will try to refresh if expired/expiring soon
   */
  async getValidToken(): Promise<string | null> {
    const session = this.loadSession();
    
    if (!session) {
      console.log("[AuthTokenManager] No session found");
      return null;
    }

    // If token is expiring soon (within 5 mins), try to refresh
    const timeUntilExpiry = session.expiresAt - Date.now();
    if (timeUntilExpiry < TOKEN_REFRESH_BUFFER_MS) {
      console.log(`[AuthTokenManager] Token expiring soon (${Math.round(timeUntilExpiry / 1000)}s), attempting refresh...`);
      const refreshedSession = await this.refreshToken();
      return refreshedSession?.sessionToken || null;
    }

    console.log(`[AuthTokenManager] Token valid for ${Math.round(timeUntilExpiry / 1000)}s`);
    return session.sessionToken;
  }

  /**
   * Refresh authentication token from backend
   * This should be called when the Firebase ID token expires
   */
  async refreshToken(): Promise<AuthSession | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log("[AuthTokenManager] Refresh already in progress, waiting...");
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    return result;
  }

  private async _performRefresh(): Promise<AuthSession | null> {
    try {
      const session = this.loadSession();
      if (!session) {
        console.log("[AuthTokenManager] No session to refresh");
        return null;
      }

      const app = await initializeFirebase();
      const auth = getAuth(app);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("[AuthTokenManager] No current user in Firebase");
        this.clearSession();
        return null;
      }

      // Force refresh the Firebase ID token
      const newIdToken = await currentUser.getIdToken(true);
      console.log("[AuthTokenManager] Got new Firebase ID token, validating with backend...");

      // Send refreshed token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: newIdToken }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const newSession: AuthSession = {
          sessionToken: data.sessionToken,
          uid: data.uid,
          email: data.email,
          name: data.name,
          expiresAt: Date.now() + (60 * 60 * 1000), // Session valid for 1 hour (same as Firebase ID token)
          refreshToken: session.refreshToken, // Preserve refresh token if we have it
        };
        this.saveSession(newSession);
        console.log("[AuthTokenManager] Token refresh successful");
        return newSession;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AuthTokenManager] Backend rejected refresh:", errorData);
        this.clearSession();
        return null;
      }
    } catch (error) {
      console.error("[AuthTokenManager] Token refresh failed:", error);
      // Don't clear session on network errors, let client-side retry
      return null;
    }
  }

  /**
   * Create new session after successful auth
   */
  async createSession(idToken: string, plan?: string): Promise<AuthSession | null> {
    try {
      // Validate token format before sending
      if (!idToken || typeof idToken !== 'string') {
        throw new Error(`Invalid idToken type: ${typeof idToken}`);
      }

      const trimmed = idToken.trim();
      if (trimmed.length === 0) {
        throw new Error("idToken is empty");
      }

      // Check JWT format
      const parts = trimmed.split('.');
      if (parts.length !== 3) {
        throw new Error(`Token format invalid: expected 3 parts, got ${parts.length}. This usually means Firebase SDK didn't return a valid token.`);
      }

      console.log(`[AuthTokenManager] Creating new session with ID token (length: ${trimmed.length})...`);
      
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken: trimmed,
          plan: plan?.toLowerCase(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }
        
        const errorMessage = errorData.details || errorData.error || "Unknown error";
        console.error(`[AuthTokenManager] Backend error (${response.status}):`, errorMessage);
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const session: AuthSession = {
        sessionToken: data.sessionToken,
        uid: data.uid,
        email: data.email,
        name: data.name,
        expiresAt: Date.now() + (60 * 60 * 1000), // Session valid for 1 hour
      };

      this.saveSession(session);
      console.log("[AuthTokenManager] Session created successfully");
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[AuthTokenManager] Failed to create session:", message);
      throw error;
    }
  }

  /**
   * Sign out completely
   */
  async signOut(): Promise<void> {
    try {
      const app = await initializeFirebase();
      const auth = getAuth(app);
      await signOut(auth);
      this.clearSession();
      console.log("[AuthTokenManager] Signed out successfully");
    } catch (error) {
      console.error("[AuthTokenManager] Sign out error:", error);
      this.clearSession();
    }
  }

  /**
   * Setup auto-refresh on Firebase auth state changes
   */
  setupAutoRefresh(): () => void {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const app = await initializeFirebase();
        const auth = getAuth(app);

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log("[AuthTokenManager] Auth state changed, refreshing token...");
            await this.refreshToken();
          } else {
            console.log("[AuthTokenManager] User signed out in Firebase");
            this.clearSession();
          }
        });
      } catch (error) {
        console.error("[AuthTokenManager] Failed to setup auto-refresh:", error);
      }
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }
}

export const authTokenManager = new AuthTokenManager();
