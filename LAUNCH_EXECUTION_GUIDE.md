# 🚀 Intellimix Launch Execution Guide

**Status:** Code is built ✅ | Tests pass ✅ | Ready to deploy 🎯

---

## Your Action Items (Next 2 Hours)

### ✅ STEP 1: Create GitHub Repository & Push Code
**Time: 10 minutes**

The code is already committed locally. You now need to:

1. Go to https://github.com/new
2. Create a new repository named `intellimix-production`
3. Make it **Public** (required for Railway)
4. Copy the SSH URL (looks like `git@github.com:YOUR_USERNAME/intellimix-production.git`)
5. Run these commands in terminal:

```bash
cd "/Users/admin/Documents/AIAIAI/Intellimix Production ready/intellimix"
git remote add origin git@github.com:YOUR_USERNAME/intellimix-production.git
git branch -M main
git push -u origin main
```

**Verify:** Visit https://github.com/YOUR_USERNAME/intellimix-production → you should see all 146 files

---

### STEP 2: Create Stripe Account & Get Keys
**Time: 15 minutes**

1. **Sign up:** https://stripe.com/register
   - Enter business email
   - Create password
   - Verify identity (usually instant)

2. **Create 3 pricing products:**
   - Dashboard → **Products** → **+ Add product**
   - Create these 3 products:

   **Product 1: Basic Plan**
   - Name: `Basic - $29/month`
   - Pricing: $29/month (recurring)
   - → Copy **Price ID** (e.g., `price_1ABC123...`)

   **Product 2: Pro Plan**
   - Name: `Pro - $99/month`
   - Pricing: $99/month (recurring)
   - → Copy **Price ID**

   **Product 3: Enterprise**
   - Name: `Enterprise - $299/month`
   - Pricing: $299/month (recurring)
   - → Copy **Price ID**

3. **Get API Keys:**
   - Left sidebar → **Developers** → **API Keys**
   - You'll see:
     - **Publishable key** (starts with `pk_test_` or `pk_live_`)
     - **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Copy both to your text file

4. **Create Webhook:**
   - **Developers** → **Webhooks** → **Add endpoint**
   - Endpoint URL: `https://YOUR_RAILWAY_URL.railway.app/api/webhooks/stripe`
     - (You'll get YOUR_RAILWAY_URL in the next step)
   - Events to listen: 
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - → Copy **Signing secret** (starts with `whsec_`)

**📝 Save to text file:**
```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

---

### STEP 3: Deploy to Railway
**Time: 10 minutes**

1. **Sign up:** https://railway.app
   - Click **Deploy from GitHub**
   - Authorize Railway to access GitHub
   - Select `intellimix-production` repository
   - Railway builds automatically (wait ~5 min for green checkmark)

2. **Add MySQL Database:**
   - In Railway dashboard, click **+ New Service** → **Database** → **MySQL**
   - Click **Create New** 
   - Railway auto-generates `DATABASE_URL`

3. **Get Your App URL:**
   - Once deployment is green, find your app
   - Copy the URL (looks like `https://intellimix-production-xyz.railway.app`)

---

### STEP 4: Configure Environment Variables in Railway
**Time: 5 minutes**

In Railway Dashboard:
1. Click your app name
2. Go to **Variables** tab
3. Click **New Variable** and add these 11 variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | [Copy from your MySQL service] |
| `JWT_SECRET` | Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `VITE_APP_ID` | `intellimix` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (from Stripe) |
| `STRIPE_SECRET_KEY` | `sk_test_...` (from Stripe) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe) |
| `STRIPE_PRICE_BASIC` | `price_...` (from Stripe) |
| `STRIPE_PRICE_PRO` | `price_...` (from Stripe) |
| `STRIPE_PRICE_ENTERPRISE` | `price_...` (from Stripe) |

**After adding:** Railway automatically redeploys with new variables (wait for green ✓)

---

### STEP 5: Test Live Payment
**Time: 5 minutes**

1. Once Railway is green ✓, visit: `https://YOUR_RAILWAY_URL.railway.app/pricing`
   - Should see 3 pricing cards

2. Click **"Upgrade Now"** on any tier (e.g., Pro)

3. You'll see Stripe checkout. Enter test card:
   ```
   Card number: 4242 4242 4242 4242
   Expiry: 12/27 (any future date)
   CVC: 000
   ```

4. Click **Subscribe**

5. **Verify in Stripe Dashboard:**
   - Go to Stripe → **Customers**
   - You should see a customer with a subscription ✅

---

## 🎉 You're LIVE!

Once test payment succeeds:
- ✅ App is live at `https://YOUR_RAILWAY_URL.railway.app`
- ✅ Real customers can visit `/pricing` and subscribe
- ✅ Money deposits to your bank account weekly
- ✅ Subscription status sync happens via webhooks

---

## What Customers Can Do Now

1. **Sign up** at your app
2. **Visit pricing page**
3. **Subscribe** with real credit card
4. **Get premium features** (you can gate them with subscription check)

---

## If Something Goes Wrong

### App won't load?
- Check Railway deployment logs (red X next to deploy)
- Usually: missing env var

### Checkout button doesn't work?
- Verify `STRIPE_PRICE_BASIC/PRO/ENTERPRISE` are set correctly in Railway
- Restart deployment

### Webhook not triggering?
- Check webhook URL is correct in Stripe (must match Railway URL exactly)
- Check `STRIPE_WEBHOOK_SECRET` is set
- Test in Stripe: Webhooks → your endpoint → "Send test event"

---

## Success Checklist

✅ GitHub repo created and code pushed  
✅ Stripe account setup with 3 price IDs  
✅ Railway app deployed and green  
✅ All 11 env vars added to Railway  
✅ App loads at Railway URL  
✅ Pricing page shows 3 tiers  
✅ Test payment succeeds  
✅ Stripe dashboard shows subscription  

**ALL DONE! Start telling people about your app!** 🚀

---

## Next: Get Customers

- Share Railway URL on Twitter/LinkedIn/forums
- Collect early customer feedback
- Watch real revenue come in via Stripe dashboard
