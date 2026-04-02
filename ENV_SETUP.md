# Environment Setup Guide

## Your Actual Environment Values

The `.env` file with your **production values** should be:

1. **Created locally** (not committed to Git):
   ```bash
   cp .env.example .env
   ```

2. **Filled with your actual values** from:

   | Variable | Where to Get It |
   |----------|-----------------|
   | `DATABASE_URL` | Your MySQL database connection string (host, port, user, pass, db name) |
   | `JWT_SECRET` | Generate: `openssl rand -hex 32` |
   | `VITE_APP_ID` | Identifier for your app (e.g., `intellimix`) |
   | `OAUTH_SERVER_URL` | Your OAuth provider URL (Google, GitHub, custom, etc.) |
   | `OWNER_OPEN_ID` | Admin user ID from your OAuth provider |
   | `STRIPE_SECRET_KEY` | From Stripe Dashboard → API Keys (secret) |
   | `STRIPE_PUBLISHABLE_KEY` | From Stripe Dashboard → API Keys (public) |
   | `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard → Webhooks → Signing secret |
   | `STRIPE_PRICE_BASIC` | From Stripe Dashboard → Products (price ID) |
   | `STRIPE_PRICE_PRO` | From Stripe Dashboard → Products (price ID) |
   | `STRIPE_PRICE_ENTERPRISE` | From Stripe Dashboard → Products (price ID) |
   | `AWS_ACCESS_KEY_ID` | From AWS IAM (if using S3) |
   | `AWS_SECRET_ACCESS_KEY` | From AWS IAM (if using S3) |
   | `AWS_REGION` | AWS region (e.g., `us-east-1`) |
   | `AWS_S3_BUCKET` | Your S3 bucket name |

## For Google Cloud Deployment

Your production environment variables are stored in **Google Cloud Secret Manager**, NOT in `.env`:

1. Go to: https://console.cloud.google.com/security/secret-manager
2. Create each secret with the values above
3. Cloud Build will automatically retrieve and inject them

See: `../GOOGLE_CLOUD_FIREBASE_SETUP.md` for complete setup.

## Local Development (.env)

For local development, create `.env` in project root:

```bash
cp .env.example .env
# Edit .env and fill in your actual values
```

Then run:
```bash
pnpm run dev
```

## Production Deployment

When you push to `main`:
1. GitHub webhook triggers Google Cloud Build
2. Cloud Build reads secrets from Secret Manager
3. App deploys to Cloud Run with all variables injected
4. No `.env` file needed in Docker container

## .gitignore

The `.env` file is **never committed** to Git (in `.gitignore`).
Only `.env.example` is committed as a template.
