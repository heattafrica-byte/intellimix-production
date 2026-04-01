# 🚀 Intellimix — Production Launch Guide

**Goal**: Get Intellimix live and monetized with subscriptions this week.

**Timeline**: ~1-2 hours total setup

---

## What Just Got Added

✅ **Payment System**
- Stripe subscription integration
- 3 subscription tiers (Basic, Pro, Enterprise)
- Pricing page component
- Webhook handlers for subscription events
- Database schema for tracking subscriptions

✅ **Deployment Ready**
- Docker configuration
- GitHub Actions CI/CD
- Railway.app support
- Environment variable templates
- Database migration files
- Deployment guides

---

## Your Launch Checklist

### Phase 1: Pre-Launch (30 minutes)

#### 1. Configure Environment Locally

Copy `.env.example` to `.env.local` and test locally:

```bash
cp .env.example .env.local
pnpm install
pnpm run dev
```

Visit http://localhost:3000 to verify everything works.

#### 2. Prepare Code for GitHub

```bash
# Make sure everything is committed
git status  # Should show clean working directory

# If not committed:
git add .
git commit -m "production-ready: payment system + deployment config"
```

#### 3. Verify Build Locally

```bash
# Build exactly as Railway will
pnpm run build  # Should complete without errors
pnpm run start  # Should start server on port 3000
```

### Phase 2: Cloud Infrastructure (30 minutes)

#### 1. Push to GitHub

```bash
# If repo doesn't exist yet:
git push -u origin main

# If it does:
git push origin main
```

#### 2. Create Railway Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select **GitHub repo → intellimix**
5. Railway auto-detects Dockerfile
6. Approve and Railway starts building

#### 3. Add Database

In Railway project dashboard:
1. Click "+ Add Service"
2. Select "MySQL"
3. Select "Create New"
4. Railway provisions database automatically

Get your DATABASE_URL from the MySQL service details.

### Phase 3: Payment Setup (20 minutes)

#### 1. Stripe Account

1. Go to https://stripe.com/register
2. Sign up and verify identity (takes ~5-10 min)
3. Go to **Developers → API Keys**
4. Copy and save:
   - Secret Key (sk_live_...)
   - Publishable Key (pk_live_...)

#### 2. Create Products

Navigate to **Products** tab:

**Product 1: Basic**
- Name: "Basic"
- Price: $29/month (recurring)
- Copy Price ID (price_...)

**Product 2: Pro**
- Name: "Pro"
- Price: $99/month (recurring)
- Copy Price ID (price_...)

**Product 3: Enterprise**
- Name: "Enterprise"
- Price: $299/month (recurring)
- Copy Price ID (price_...)

#### 3. Webhooks

1. Go to **Developers → Webhooks**
2. Click "+ Add endpoint"
3. **URL**: `https://YOUR-RAILWAY-APP.railway.app/api/webhooks/stripe`
4. **Events**: Select:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy Signing Secret (whsec_...)

### Phase 4: Connect Everything (10 minutes)

#### In Railway Dashboard

Go to **Variables** and add:

```
DATABASE_URL=<copy from MySQL service>
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
VITE_APP_ID=intellimix
NODE_ENV=production
PORT=3000
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

Railway will automatically restart with new variables.

### Phase 5: Verify & Go Live (10 minutes)

#### 1. Check Build Logs

In Railway → **Deployments** → latest:
- All green? ✅
- Any errors? Check logs

#### 2. Run Database Migrations

Open Railway shell and run:
```bash
pnpm db:push
```

#### 3. Test the App

1. Visit your Railway app URL (something.railway.app)
2. Sign up / log in
3. Go to `/pricing`
4. Click "Upgrade Now"
5. Use test card: **4242 4242 4242 4242** (exp: any future date, any CVC)
6. Complete the flow
7. Check webhook received: Stripe → Developers → Webhooks → webhook → Recent Events

#### 4. Celebrate! 🎉

Your app is now live with subscriptions!

---

## What Users See

### Pricing Page (`/pricing`)
- 3 subscription options
- Monthly prices
- Feature lists per tier
- Upgrade buttons → Stripe checkout

### Checkout Flow
- Stripe-hosted checkout (secure, PCI compliant)
- Card processing
- Receipt via email
- Instant access to features

### Subscription Management
- Current plan displayed
- Upgrade/downgrade available
- Cancel anytime option
- Usage tracking (configurable)

---

## How Money Works

### Stripe Handles:
- ✅ Card processing
- ✅ PCI compliance
- ✅ Recurring billing
- ✅ Failed payment retries
- ✅ Tax calculation (optional)
- ✅ Invoices & receipts

### You Control:
- ✅ Pricing
- ✅ Features per tier
- ✅ Feature gates (via subscription status)
- ✅ Cancellation policy
- ✅ Customer communication

### Stripe Fees:
- 2.9% + $0.30 per successful transaction
- You get paid weekly to your bank
- Full settlement history in dashboard

---

## Feature Implementation (Next Steps)

### Gating Features by Subscription

```typescript
// In any router or component:
const subscription = trpc.payment.getSubscription.useQuery();

// Hide features for non-subscribers
if (!subscription.data) {
  return <UpgradePrompt />;
}

// Gate by tier
if (subscription.data.plan !== "pro" && subscription.data.plan !== "enterprise") {
  return <ProFeatureOnly />;
}
```

### Tracking Credits

In `payment.ts`, expand `createCheckoutSession` to:
1. Set initial credits based on tier
2. Track credit usage
3. Warn at thresholds
4. Reset monthly or on renewal

### Custom Limits Per Tier

```typescript
const TIER_LIMITS = {
  basic: { creditsPerMonth: 50, maxFileSize: 100 },
  pro: { creditsPerMonth: 500, maxFileSize: 500 },
  enterprise: { creditsPerMonth: Infinity, maxFileSize: Infinity },
};
```

---

## Monitoring After Launch

### Daily Checks
- [ ] Any error logs in Railway?
- [ ] Any failed Stripe webhooks?
- [ ] New subscribers in Stripe dashboard?

### Weekly Checks
- [ ] Revenue dashboard in Stripe
- [ ] User feedback on pricing
- [ ] Performance metrics

### Optional: Error Tracking

Add Sentry for production error monitoring:

```bash
pnpm add @sentry/node
```

Then in `server/_core/index.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## Troubleshooting

### Build Failed
- [ ] Check `pnpm-lock.yaml` is committed
- [ ] Check `Dockerfile` in root
- [ ] Check all env vars set correctly

### App Won't Start
- [ ] Check DATABASE_URL format
- [ ] Check migrations ran
- [ ] Check logs in Railway

### Stripe Not Working
- [ ] Verify price IDs correct
- [ ] Check webhook signing secret
- [ ] Test webhook in Stripe dashboard

### Payment Tests
```bash
# Test card (always succeeds)
4242 4242 4242 4242

# Test card (always fails)
4000 0000 0000 0002

# Test card (requires 3D Secure)
4000 0025 0000 3010
```

---

## Success Metrics

🎯 **You've Won When:**

✅ Live URL accessible  
✅ Sign-ups working  
✅ Pricing page shows all tiers  
✅ First test payment successful  
✅ Webhook received + subscription recorded  
✅ First real user signs up  

---

## Keep Going

This is just the beginning! Next:

1. **Tell users about it** - Share your app
2. **Collect feedback** - Are prices right? Features?
3. **Iterate** - Add features, adjust pricing
4. **Scale** - As demand grows, Railway scales automatically

Good luck! 🚀

Need help? Check the detailed guides:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step with screenshots
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Quick checklist
