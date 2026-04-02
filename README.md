# Intellimix - AI Music Processing Platform

Full-stack music production assistant with AI analysis, mixing recommendations, and Stripe payments.

## Quick Start

### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env and fill in your actual values
```

### 2. Install & Run
```bash
# Install dependencies
pnpm install

# Development
pnpm run dev

# Production build
pnpm run build
pnpm start
```

## Environment Variables

**Required:**
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session secret (generate: `openssl rand -hex 32`)
- `VITE_APP_ID` - App identifier
- `OAUTH_SERVER_URL` - OAuth provider URL
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key

**Optional:**
- AWS S3, Forge API, additional Stripe pricing IDs

See `.env.example` for all options.

## Architecture

```
client/     - React frontend + UI components
server/     - Express backend + tRPC API
shared/     - Shared types & constants
drizzle/    - Database migrations & schema
```

## Deployment

### Google Cloud Run
```bash
git push origin main
# Cloud Build auto-deploys from cloudbuild.yaml
```

**Important**: Create secrets in Google Cloud Secret Manager before deployment:
https://console.cloud.google.com/security/secret-manager

See `../GOOGLE_CLOUD_FIREBASE_SETUP.md` for complete setup.

## Available Scripts

- `pnpm run dev` - Start development server with auto-reload
- `pnpm run build` - Build for production
- `pnpm start` - Run production build
- `pnpm run check` - TypeScript type check
- `pnpm run format` - Format code with Prettier
- `pnpm run db:push` - Generate & run database migrations

## Technologies

- **Frontend**: React 19, TypeScript, TailwindCSS, Vite
- **Backend**: Express, tRPC, Drizzle ORM
- **Database**: MySQL
- **Auth**: Custom OAuth + JWT
- **Payments**: Stripe
- **Deployment**: Google Cloud Run + Cloud Build
- **Container**: Docker

## Live URLs

- Frontend: `https://intellimix.example.com`
- API: `https://intellimix.example.com/api/trpc`
- Backend: Cloud Run service

## Troubleshooting

### Database Unavailable
1. Check `DATABASE_URL` in `.env`
2. Verify MySQL connection
3. Run: `pnpm run db:push` to initialize schema

### Auth Errors
1. Verify `JWT_SECRET` is set
2. Check `OAUTH_SERVER_URL` is accessible
3. Inspect logs: Google Cloud Logging

### Stripe Issues
1. Verify all `STRIPE_*` keys in `.env`
2. Check webhook signature in code matches Secret Manager

See Google Cloud logs: 
```bash
gcloud run services logs read intellimix --limit=50
```
