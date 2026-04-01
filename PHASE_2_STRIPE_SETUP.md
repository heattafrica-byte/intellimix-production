# 🚀 PHASE 2: STRIPE ACCOUNT SETUP (15 MINUTES)

**Status:** ✅ Phase 1 (GitHub) Complete  
**Next:** Phase 2 (Stripe) - START NOW  
**Time:** ~15 minutes  
**Result:** 6 Stripe values ready for Phase 3

---

## 📋 YOUR EXACT STEPS

### Step 1: Create Stripe Account (5 min)

1. Go to: **https://stripe.com/register**
2. Fill in:
   - Email address
   - Password
   - Business info (you/solo founder is fine)
3. Verify email
4. Complete identity verification (usually instant)

**Result:** You're logged into Stripe Dashboard

---

### Step 2: Create 3 Products (7 min)

In Stripe Dashboard:

#### Product 1: Basic Plan
1. Top menu → **Products** → **+ Create product**
2. Fill in:
   - Name: `Basic Plan - $29/month`
   - Type: `Standard pricing`
3. Price section:
   - Price: `$29`
   - Billing period: `Monthly` (recurring)
4. Click **"Save product"**
5. **VIEW AND COPY THE PRICE ID** (looks like `price_1ABC123DEF456...`)
   - Save to a text file!

#### Product 2: Pro Plan
Repeat above with:
- Name: `Pro Plan - $99/month`
- Price: `$99`
- **COPY THE PRICE ID**

#### Product 3: Enterprise Plan
Repeat above with:
- Name: `Enterprise Plan - $299/month`
- Price: `$299`
- **COPY THE PRICE ID**

---

### Step 3: Get API Keys (3 min)

1. Left sidebar → **Developers** → **API Keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
3. **COPY BOTH** to your text file

---

### Step 4: Create Webhook (Bonus - optional for now)

Will do this in Phase 3 after you get Railway URL.

---

## 📝 SAVE THESE 6 VALUES

Create a text file with exactly these values:

```
STRIPE_PUBLISHABLE_KEY=pk_test_ABC123...
STRIPE_SECRET_KEY=sk_test_ABC123...
STRIPE_PRICE_BASIC=price_1ABC123...
STRIPE_PRICE_PRO=price_1ABC456...
STRIPE_PRICE_ENTERPRISE=price_1ABC789...
```

**Note the exact format above - you'll paste these into Railway in Phase 4**

---

## ✅ DONE WITH PHASE 2 WHEN YOU HAVE:

- [ ] Stripe account created
- [ ] 3 products created (Basic, Pro, Enterprise)
- [ ] 3 price IDs copied
- [ ] 2 API keys copied
- [ ] All 5 values in a text file

---

## ⏭️ READY FOR PHASE 3?

Once you have all 5 values, you'll:

1. Create Railway account
2. Deploy your code from GitHub
3. Add MySQL database
4. Get Railway URL
5. Add these 5 + 1 more value (from Railway) to Phase 4

---

## 🎯 KEY POINTS

✅ Use test keys (`pk_test_` and `sk_test_`)  
✅ Monthly billing for all 3 products  
✅ Save all values in plaintext (you'll need them soon)  
✅ Don't share these with anyone else  

---

## ⏱️ TIME TRACKING

- ✅ Phase 1 (GitHub): DONE
- ⏳ Phase 2 (Stripe): ~15 min (YOU ARE HERE)
- ⏳ Phase 3 (Railway): ~10 min
- ⏳ Phase 4 (Env Vars): ~5 min
- ⏳ Phase 5 (Test): ~5 min

**Total remaining: 35 minutes** 💨

---

## 📌 GO NOW!

**Action:** Open https://stripe.com/register and create your account

**Tell me when you have all 6 values** and I'll guide you through Phase 3 (Railway)! 🚀
