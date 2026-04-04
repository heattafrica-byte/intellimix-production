/**
 * Session-level storage utilities
 * Separate from full auth session management
 */

const SESSION_COOKIE_NAME = "intellimix_session";

export function getSessionCookie(): string | null {
  // In browser, check localStorage as fallback
  if (typeof window !== "undefined") {
    return localStorage.getItem(SESSION_COOKIE_NAME);
  }
  return null;
}

export function setSessionCookie(value: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_COOKIE_NAME, value);
  }
}

export function clearSessionCookie(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_COOKIE_NAME);
  }
}
