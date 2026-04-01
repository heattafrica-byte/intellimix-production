# Intellimix - Production Deployment Checklist

## Pre-Deployment (Do This First)
- [ ] All code committed to Git
- [ ] No secret keys in `.env` file (use `.env.example` instead)
- [ ] `pnpm-lock.yaml` is committed
- [ ] Run `pnpm run check` - no TypeScript errors
- [ ] Run `pnpm run test` - tests pass
- [ ] Run `pnpm run build` - builds successfully locally

## GitHub Setup (~5 min)
- [ ] Create GitHub repository
- [ ] Push code to main branch
- [ ] Create `.gitignore` with:
  ```
  node_modules/
  dist/
  .env
  .env.local
  .env.*.local
  *.log
  .manus-logs/
  ```

## Stripe Setup (~10 min)
- [ ] Create Stripe account at stripe.com
- [ ] Verify identity
- [ ] Create 3 products: Basic ($29), Pro ($99), Enterprise ($299)
- [ ] Copy all 3 Price IDs (starts with `price_`)
- [ ] Copy Secret Key (starts with `sk_live_`)
- [ ] Copy Publishable Key (starts with `pk_live_`)
- [ ] Create webhook endpoint: `/api/webhooks/stripe`
- [ ] Copy Webhook Signing Secret (starts with `whsec_`)

## Railway Setup (~20 min)
- [ ] Create Railway account at railway.app
- [ ] Link GitHub account
- [ ] Create new project from GitHub repo
- [ ] Add MySQL service
- [ ] Copy MySQL connection string
- [ ] Add all environment variables (see below)

## Environment Variables to Add in Railway
```
DATABASE_URL=<from Railway MySQL>
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
VITE_APP_ID=intellimix
STRIPE_SECRET_KEY=<from Stripe>
STRIPE_PUBLISHABLE_KEY=<from Stripe>
STRIPE_WEBHOOK_SECRET=<from Stripe>
STRIPE_PRICE_BASIC=<from Stripe>
STRIPE_PRICE_PRO=<from Stripe>
STRIPE_PRICE_ENTERPRISE=<from Stripe>
NODE_ENV=production
PORT=3000
```

## After Deployment
- [ ] Check Railway logs - no errors
- [ ] Visit app URL - loads successfully
- [ ] Run migrations: `pnpm db:push`
- [ ] Test pricing page: `/pricing`
- [ ] Test checkout with Stripe test card `4242 4242 4242 4242`
- [ ] Verify webhook received in Stripe dashboard
- [ ] Update DNS if using custom domain

## Custom Domain (Optional)
- [ ] Buy domain (GoDaddy, Namecheap, etc.)
- [ ] Point nameservers to Railway's DNS
- [ ] Set custom domain in Railway project settings
- [ ] Wait for SSL certificate (usually 5-15 min)

## Go Live! 🚀
- [ ] Share URL with beta users
- [ ] Monitor logs for errors
- [ ] Track subscription signups
- [ ] Celebrate! 🎉
