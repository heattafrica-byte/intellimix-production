# Intellimix Authentication System - Complete Documentation

## System Overview

The authentication system uses **Firebase for user identity** + **custom backend session management** to provide secure, persistent authentication across the application.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Application (React)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────────────┐              │
│  │ SignupDialog │ ─────→  │  authTokenManager    │              │
│  │  LoginDialog │         │  (Token Lifecycle)   │              │
│  └──────────────┘         └──────────┬───────────┘              │
│                                       │                          │
│     getValidToken() ← auto-refresh ───┴────────────────┐         │
│                                                        │         │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Firebase SDK (Client)                   │       │
│  │  - signInWithEmailAndPassword()                      │       │
│  │  - signInWithPopup(GoogleAuthProvider)              │       │
│  │  - signInWithPopup(GithubAuthProvider)              │       │
│  │  - getIdToken() → Firebase ID Token (1 hour)        │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Backend Server (Node.js + Express)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/oauth/verify                                │    │
│  │  Input: { idToken, plan? }                             │    │
│  │  - Verify token with Firebase Admin SDK                │    │
│  │  - Create/update user in DB                            │    │
│  │  - Create session token (JWT)                          │    │
│  │  - Set secure session cookie                           │    │
│  │  Output: { success, sessionToken, uid, email, name }  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/oauth/refresh                               │    │
│  │  Input: { idToken }                                    │    │
│  │  - Verify new Firebase ID token                        │    │
│  │  - Create new session token                            │    │
│  │  Output: { success, sessionToken, expiresAt }         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Firebase Admin SDK (Backend)                          │    │
│  │  - admin.auth().verifyIdToken(idToken)                 │    │
│  │  - Validates token signature + expiry                  │    │
│  │  - Returns decoded token: { uid, email, name, ... }   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL)                                 │    │
│  │  - Users table (uid, email, name, loginMethod, ...)   │    │
│  │  - Sessions table (if tracking sessions)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↑ HTTP Requests        ↓ HTTP Responses
         └──────────────────────────────────────┘
```

## Authentication Flows

### 1. Initial Sign-Up / Sign-In Flow

```
User clicks "Sign Up" or "Sign In"
         ↓
SignupDialog / LoginDialog opens
         ↓
User selects auth method:
  ✓ Email + Password
  ✓ Google (OAuth)
  ✓ GitHub (OAuth)
         ↓
Firebase SDK handles auth and returns ID Token
         ↓
authTokenManager.createSession(idToken)
         ↓
POST /api/oauth/verify {idToken}
         ↓
Backend:
  1. Verify Firebase ID token signature + expiry
  2. Extract uid, email, name from token
  3. Create/update user in database
  4. Generate JWT session token
  5. Set HTTPOnly secure cookie
         ↓
Return to client:
  {
    success: true,
    sessionToken: "...",
    uid: "...",
    email: "...",
    name: "..."
  }
         ↓
authTokenManager stores session in localStorage
         ↓
Redirect to /studio or onSignupSuccess callback
```

### 2. Token Refresh Flow (Automatic)

Firebase ID tokens expire after **~1 hour**. To keep users logged in, the token must be refreshed before expiry:

```
authTokenManager.getValidToken() called
         ↓
Check stored session.expiresAt
         ↓
If expires in < 5 minutes:
  authTokenManager.refreshToken()
         ↓
Firebase SDK: currentUser.getIdToken(force = true)
  → Forces Firebase to refresh ID token
         ↓
POST /api/oauth/refresh { idToken: newIdToken }
         ↓
Backend:
  1. Verify new Firebase ID token
  2. Create new JWT session token
  3. Return new session token
         ↓
authTokenManager updates stored session
         ↓
Client continues with new token for another hour
```

### 3. Error Handling & Retry Flow

```
User attempts auth action
         ↓
1st attempt: POST /api/oauth/verify {idToken}
         ↓
If 401 (Unauthorized):
  → Token invalid/expired
  → authTokenManager.refreshToken() attempts refresh
         ↓
If refresh succeeds:
  → Retry original request with new token
         ↓
If refresh fails:
  → Clear session, force user to re-authenticate
  → Show error: "Session expired, please sign in again"
         ↓
If 400 (Bad Request):
  → Client error (malformed token, missing field)
  → Show error to user
         ↓
If 500 (Server Error):
  → Database/system error
  → Retry with exponential backoff
```

## Key Components

### Client-Side

#### `authTokenManager.ts`
Main token lifecycle manager:
- `loadSession()` - Load session from localStorage
- `saveSession()` - Save session to localStorage
- `clearSession()` - Clear session (logout)
- `getValidToken()` - Get current valid token (auto-refreshes if needed)
- `createSession(idToken, plan?)` - Create new session after auth
- `refreshToken()` - Manually refresh session token
- `setupAutoRefresh()` - Listen to Firebase auth state changes

```typescript
const token = await authTokenManager.getValidToken();
// use token for API requests
```

#### `sessionStorage.ts`
Utilities for session persistence:
- `getSessionCookie()` - Retrieve session token
- `setSessionCookie(value)` - Store session token
- `clearSessionCookie()` - Remove session token

#### `LoginDialog.tsx`
Sign-in dialog with three auth methods:
- **Email + Password**: `signInWithEmailAndPassword()`
- **Google**: `signInWithPopup(GoogleAuthProvider)`
- **GitHub**: `signInWithPopup(GithubAuthProvider)`

```typescript
const result = await signInWithEmailAndPassword(auth, email, password);
const idToken = await result.user.getIdToken();
await authTokenManager.createSession(idToken);
```

#### `SignupDialog.tsx`
Sign-up dialog (same three methods as login):
- Supports optional `plan` parameter (Basic, Pro)
- Validates email/password strength
- Creates new user account

```typescript
const result = await createUserWithEmailAndPassword(auth, email, password);
const idToken = await result.user.getIdToken();
await authTokenManager.createSession(idToken, plan);
```

### Server-Side

#### `firebase.ts` (Backend)
Firebase Admin SDK wrapper:
- `getFirebaseAuth()` - Get initialized Firebase Auth instance
- `verifyIdToken(idToken)` - Verify and decode Firebase ID token
- `getUserByUid(uid)` - Get user from Firebase by UID

Handles errors:
- Invalid token format
- Expired token
- Invalid signature
- Missing signing key

#### `oauth.ts`
OAuth routes:

**POST /api/oauth/verify**
- Input: `{ idToken, plan? }`
- Output: `{ success, sessionToken, uid, email, name }`
- Creates user and session

**POST /api/oauth/refresh**
- Input: `{ idToken }`
- Output: `{ success, sessionToken, expiresAt }`
- Refreshes existing session

**GET /api/oauth/callback** (legacy)
- Redirect-based OAuth callback
- Rarely used now that we use popup flow

#### `db.ts` (Database)
Database operations:
- `upsertUser({openId, name, email, loginMethod, lastSignedIn})` - Create/update user

## Session Format

### localStorage Session Object
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIs...",
  "uid": "firebase_user_id_12345",
  "email": "user@example.com",
  "name": "User Name",
  "expiresAt": 1712282400000,
  "refreshToken": "optional_firebase_refresh_token"
}
```

### JWT Session Token (Backend)
```
Header:   { alg: "HS256", typ: "JWT" }
Payload:  { uid: "...", iat: ..., exp: ... }
Signature: HMAC(secret)
```

## Environment Variables

**Client-side** (hardcoded Firebase config - publicly safe):
```
VITE_FIREBASE_API_KEY=AIzaSyC0fm1hfBrzHwDSdJ6kE2WS9cou6DlAato
VITE_FIREBASE_AUTH_DOMAIN=intellimix-c87ea.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=intellimix-c87ea
```

**Server-side** (secrets):
```
FIREBASE_ADMIN_KEY=<JSON service account key>
JWT_SECRET=<secret for signing session tokens>
DATABASE_URL=postgresql://...
```

## Security Considerations

### Strengths
1. **Token Verification**: Firebase Admin SDK verifies token signatures server-side
2. **Secure Cookies**: Session token stored in HTTPOnly cookie (not accessible to JS)
3. **Token Expiry**: Tokens expire after 1 hour
4. **Database Verification**: User existence checked on every session creation
5. **Plan Tracking**: Plan stored in database, not token (can't be spoofed client-side)

### Additional Recommendations
1. **CSRF Protection**: Add CSRF token for form submissions
2. **Rate Limiting**: Limit `/api/oauth/verify` requests per IP
3. **Audit Logging**: Log all auth attempts (success/failure)
4. **Session Revocation**: Add manual session invalidation endpoint
5. **Device Tracking**: Track login location/device for security alerts

## Common Issues & Solutions

### Issue: "Cannot read properties of undefined (reading 'length')"
**Root Cause**: idToken is null/undefined being passed to backend
**Fix**: 
- Validate idToken before sending
- Check Firebase SDK initialization
- Verify auth event fired properly

### Issue: 400 "Invalid token format"
**Root Cause**: Token is empty string or not a valid JWT
**Fix**:
- Check `getIdToken()` actually returned a token
- Verify Firebase SDK configured correctly
- Check for timezone issues affecting token generation

### Issue: 401 "Token verification failed"
**Root Cause**: Firebase token signature invalid or expired
**Fix**:
- Check Firebase Admin credentials (FIREBASE_ADMIN_KEY)
- Verify service account has correct permissions
- Check system clock is in sync
- Token may have legitimately expired

### Issue: "email-already-in-use"
**Root Cause**: User already has account with this email
**Fix**:
- User should use "Sign In" instead of "Sign Up"
- Provide link to password reset if needed

### Issue: COOP/CORP Policy errors
**Root Cause**: Cross-origin popup handling
**Fix**:
- These are warnings, not fatal (current code ignores them)
- Ensure backend returns proper CORS headers
- Don't rely on `window.close()` in popup

## Debugging

### Enable Debug Logging

```typescript
// In client code
console.log("[AuthTokenManager] Token valid for ...");
console.log("[LoginDialog] Got Google token...");
console.log("[SignupDialog] Email sign-up failed...");

// In server logs
console.log("[Firebase] Verifying token...");
console.log("[OAuth] Token verified for user...");
```

Check browser console for `[AuthTokenManager]`, `[LoginDialog]`, `[SignupDialog]` entries

Check Cloud Run logs:
```bash
gcloud run services logs read intellimix --region=europe-west1
```

Look for `[Firebase]`, `[OAuth]`, `[OAuth Refresh]` entries

### Test Token Refresh Manually

```typescript
// In browser console
const manager = authTokenManager;
const session = manager.loadSession();
console.log("Session expires in", Math.round((session.expiresAt - Date.now()) / 1000), "seconds");

// Force refresh (should succeed if Firebase token still valid)
await manager.refreshToken();
console.log("Refresh successful");
```

## Future Improvements

1. **Refresh Token Rotation**: Use Firebase refresh tokens for long-term session refresh
2. **Multi-Device Logout**: Logout from all devices simultaneously
3. **Passwordless Auth**: Email link sign-in
4. **Social Account Linking**: Connect multiple auth methods to one account
5. **2FA/MFA**: Multiple authentication factors
6. **WebAuthn/FIDO2**: Hardware key support
7. **Session History**: View login history and revoke sessions
