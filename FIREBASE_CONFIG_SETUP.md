# Firebase Configuration Setup

## Issue
The Firebase configuration in the frontend is using placeholder values because `VITE_FIREBASE_*` environment variables are not set during the build process.

## Solution
Get your Firebase Web Config from Firebase Console and set as environment variables:

### Step 1: Get Firebase Web Config
1. Go to https://console.firebase.google.com
2. Select your project: "gen-lang-client-0270408885"
3. In Project Settings (gear icon), find "Your apps"
4. Copy the "Web API Key" and other config values
5. Or find the config block that looks like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "project.firebaseapp.com",
  projectId: "gen-lang-client-0270408885",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

### Step 2: Set Environment Variables (Local Build)
Create a `.env.local` file in the project root:
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0270408885
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### Step 3: Build & Deploy
```bash
# Build locally (will use .env.local)
pnpm build

# Commit and push
git add -A
git commit -m "Build with actual Firebase configuration"
git push

# Deploy to Cloud Run
gcloud run deploy intellimix --source . --region=europe-west1 --project=gen-lang-client-0270408885 --allow-unauthenticated --platform=managed
```

### Alternative: Set Build-Time Environment Variables
If building in CI/CD, set environment variables before the build:
```bash
export VITE_FIREBASE_API_KEY="your_api_key"
export VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
# ... etc
pnpm build
```

## Firebase Authentication Features Now Available

### Email/Password Auth
- Users can sign up with email and password
- Users can sign in with email and password
- Passwords are securely handled by Firebase

### OAuth (Google & GitHub)
- Continue to work with Google account
- Continue to work with GitHub account
- Both methods create the same user account in the database

## Testing Locally
1. Set up `.env.local` with real credentials
2. Run `pnpm build`
3. Run `npm start` or use next command to start server
4. Visit http://localhost:3000 (or your dev port)
5. Test login/signup with email or OAuth

## Troubleshooting
- If you still see "API key not valid", check that VITE_* vars are set
- Vite only loads vars that start with `VITE_` prefix  
- Make sure `.env.local` is in the repo root, not a subdirectory
- After changing .env vars, rebuild: `pnpm build`
