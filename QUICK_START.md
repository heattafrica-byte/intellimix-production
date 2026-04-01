# ⚡ Intellimix Quick Launch (1-2 Hours)

**Everything you need to launch this week is ready. Follow these 5 phases.**

---

## Phase 1: Install & Test (10 min)

```bash
# Install Stripe and all deps
pnpm install

# Test it builds
pnpm run build

# Verify no TypeScript errors
pnpm run check
```

✅ If all pass, continue.

---

## Phase 2: GitHub (5 min)

```bash
# Commit everything
git add .
git commit -m "production: ready to launch"

# Push to main branch
git push origin main
```

Go to GitHub → verify code is there.

---

## Phase 3: Stripe Setup (10 min)

1. Go to https://stripe.com/register → Sign up → Verify identity (5 min)
2. Go to **Products** → Add 3 products:
   - Basic: $29/month → Copy Price ID
   - Pro: $99/month → Copy Price ID
   - Enterprise: $299/month → Copy Price ID
3. Go to **Developers → API Keys** → Copy Secret Key and Publishable Key
4. Go to **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://YOUR-RAILWAY-APP.railway.app/api/webhooks/stripe`
   - Events: customer.subscription.* + invoice.payment_*
   - Copy Signing Secret

**Save all keys to a text file.**

---

## Phase 4: Railway Setup (10 min)

1. Go to https://railway.app → Sign up → Select "Deploy from GitHub"
2. Select your intellimix repo
3. Railway builds automatically (5 min)
4. Click "+ Add Service" → MySQL → Create New
5. Note: Railway creates DATABASE_URL automatically

---

## Phase 5: Connect Everything (5 min)

In Railway Dashboard → **Variables** → Add all these:

```
DATABASE_URL=[Railway creates this - copy from MySQL service]
JWT_SECRET=[Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
VITE_APP_ID=intellimix
NODE_ENV=production
PORT=3000
STRIPE_SECRET_KEY=sk_live_[FROM STRIPE]
STRIPE_PUBLISHABLE_KEY=pk_live_[FROM STRIPE]
STRIPE_WEBHOOK_SECRET=whsec_[FROM STRIPE]
STRIPE_PRICE_BASIC=price_[FROM STRIPE]
STRIPE_PRICE_PRO=price_[FROM STRIPE]
STRIPE_PRICE_ENTERPRISE=price_[FROM STRIPE]
```

Railway will automatically redeploy with new variables.

---

## Phase 6: Verify Live (5 min)

1. Wait for Railway deployment to finish (green checkmark)
2. Click the Railway app URL (something.railway.app)
3. Visit `/pricing` → see pricing page
4. Click "Upgrade Now" on any plan
5. Use test card: **4242 4242 4242 4242** (exp: any future, cvc: any 3 digits)
6. Complete checkout
7. Check Stripe dashboard → see subscription created

✅ **YOU'RE LIVE!** 🎉

---

## Next Steps

### Tell People
- Share your Railway app URL with beta users
- Post on Twitter/LinkedIn/forums
- Collect feedback

### Track Revenue
1. Go to Stripe Dashboard
2. See real-time subscriptions and revenue
3. Money lands in your bank weekly

### Feature Gates (Optional)
```typescript
// Check if user has active subscription
const sub = trpc.payment.getSubscription.useQuery();
if (!sub.data) return <UpgradeNeeded />;
```

---

## If Something Breaks

### Build failed?
- Check Railway logs (red X next to deployment)
- Usually: wrong env vars or missing dependency

### Can't access checkout?
- Verify STRIPE_PRICE_BASIC/PRO/ENTERPRISE are set
- Restart deployment

### Webhook not received?
- Check webhook URL is correct in Stripe
- Check STRIPE_WEBHOOK_SECRET is set
- Test in Stripe dashboard: Webhooks → click endpoint → Send test event

---

## Success Criteria

✅ App loads at Railway URL  
✅ Sign-up works  
✅ Pricing page shows 3 tiers  
✅ Test payment succeeds  
✅ Stripe dashboard shows subscription  

**That's it! You've launched.** 🚀

---

## For Detailed Help

- **Full launch guide:** See [PRODUCTION_LAUNCH.md](./PRODUCTION_LAUNCH.md)
- **Step-by-step with UI notes:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick checklist:** See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
