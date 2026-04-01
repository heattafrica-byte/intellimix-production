# Deployment Guide - Intellimix

This guide will get your Intellimix app live on Railway with Stripe subscriptions in under an hour.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Railway Setup](#railway-setup)
4. [Stripe Setup](#stripe-setup)
5. [Environment Variables](#environment-variables)
6. [Database Migrations](#database-migrations)
7. [Go Live](#go-live)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

You'll need:
- GitHub account (free)
- Railway account (free tier available)
- Stripe account (free to create, no fees until you make money)
- Your source code pushed to GitHub

### Quick Setup Time
- GitHub: 5 minutes
- Railway: 10 minutes
- Stripe: 10 minutes
- Deployment: 20 minutes
- **Total: ~45 minutes**

---

## GitHub Setup

### 1. Create a GitHub Repository

```bash
# Initialize git (if not already done)
cd /path/to/intellimix
git init
git add .
git commit -m "Initial commit: Ready for production"

# Create a new repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/intellimix.git
git branch -M main
git push -u origin main
```

### 2. Add .gitignore

Make sure these are ignored:

```bash
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.manus-logs/
```

---

## Railway Setup

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easiest)
3. Authorize Railway to access your GitHub

### 2. Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your `intellimix` repository
4. Railway will auto-detect it's a Node.js project

### 3. Configure Build & Deploy

Railway should auto-detect your `Dockerfile` and `railway.json`. If not:

- **Builder**: Select "Dockerfile"
- **Start Command**: `pnpm start`
- **Port**: Set to 3000

### 4. Add MySQL Database

1. In your Railway project, click "Add Service"
2. Select "MySQL"
3. Railway will create a managed MySQL instance
4. Copy the connection string (DATABASE_URL)

---

## Stripe Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up (free - no credit card needed)
3. Complete identity verification

### 2. Create Products & Prices

In Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create 3 products:

**Basic Plan**
- Name: "Basic"
- Price: $29/month
- Copy the **Price ID** (starts with `price_`)

**Pro Plan**
- Name: "Pro"
- Price: $99/month
- Copy the **Price ID**

**Enterprise Plan**
- Name: "Enterprise"
- Price: $299/month
- Copy the **Price ID**

### 3. Get Your API Keys

1. Go to **Developers** → **API Keys**
2. Copy:
   - **Secret Key** (starts with `sk_live_`)
   - **Publishable Key** (starts with `pk_live_`)

### 4. Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click "Add an Endpoint"
3. URL: `https://your-app.railway.app/api/webhooks/stripe`
4. Events to listen: Select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_`)

---

## Environment Variables

### Set in Railway Dashboard

1. In your Railway project, go to **Variables**
2. Add all these environment variables:

```bash
# Database (Railway creates this)
DATABASE_URL=mysql://user:password@host:port/database

# JWT & Auth
JWT_SECRET=generate_a_random_string_here_at_least_32_chars
VITE_APP_ID=intellimix

# Stripe Keys from setup above
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Product Price IDs from setup above
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx

# Server Config
NODE_ENV=production
PORT=3000

# OAuth (if you have this configured)
OAUTH_SERVER_URL=https://your-oauth-provider.com
OWNER_OPEN_ID=your_owner_id

# AWS S3 (if uploading files)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket

# Forge API (if using)
BUILT_IN_FORGE_API_URL=https://api.example.com
BUILT_IN_FORGE_API_KEY=your_key
```

### Generate Secure Secrets

```bash
# For JWT_SECRET, generate a random string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Migrations

### 1. Run Migrations on Railway

Once your app is deployed, you need to:

1. In Railway dashboard, go to **Deployments**
2. Open a shell into the running container
3. Run migrations:

```bash
pnpm db:push
```

Or manually run the migration SQL from `drizzle/migrations/` folder.

### 2. Verify Database Changes

Check that these new tables/columns exist:
- `users.stripeCustomerId` column (added)
- `subscriptions` table (new)

---

## Go Live

### 1. Deploy

Once you push to `main` branch, Railway automatically:
1. Builds your Docker image
2. Runs tests (if defined)
3. Deploys to production

Check the deployment logs in Railway dashboard.

### 2. Get Your Live URL

1. In Railway project, find your **app domain**
2. It will look like: `intellimix-production-xxxx.railway.app`
3. Your app is now live! 🎉

### 3. Test Payment Flow

1. Visit `https://your-app.railway.app/pricing`
2. Click "Upgrade Now" on a plan
3. Use Stripe test card: `4242 4242 4242 4242` (exp: any future date, any CVC)
4. Complete checkout
5. Verify webhook was received in Stripe dashboard

---

## Monitoring & Troubleshooting

### Check Logs

In Railway dashboard:
1. Go to **Deployments**
2. Click the latest deployment
3. View **Logs** tab for any errors

### Common Issues

#### Build fails
- Check that `pnpm-lock.yaml` is committed
- Ensure `Dockerfile` is in root directory
- Check `package.json` scripts

#### Database connection error
- Verify `DATABASE_URL` is set correctly
- Check MySQL service is running in Railway
- Try re-running migrations

#### Stripe webhooks not received
- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is set
- Test webhook in Stripe dashboard

#### Payment checkout redirects to error
- Check Stripe keys are correct
- Verify price IDs match your products
- Check browser console for errors

### Monitor Performance

Add Sentry for error tracking (optional):

```bash
npm install @sentry/node
```

Then in `server/_core/index.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Next Steps

After going live:

1. **Update DNS** (if using custom domain)
   - Point your domain to Railroad's load balancer

2. **Set up monitoring**
   - Add error tracking (Sentry)
   - Monitor database performance

3. **Optimize**
   - Enable caching
   - Optimize database queries
   - Monitor cold starts

4. **Scale**
   - Railway automatically scales
   - Monitor resource usage
   - Upgrade plan if needed

---

## Support

- Railway support: [railway.app/support](https://railway.app/support)
- Stripe support: [stripe.com/support](https://stripe.com/support)
- Drizzle ORM docs: [orm.drizzle.team](https://orm.drizzle.team)

Good luck! 🚀
