# ⚡ PHASE 2 QUICK START - STRIPE PRODUCTS

**Goal:** Get 3 price IDs in next 10 minutes  
**Method:** Automated script  
**Result:** Ready for Phase 3 & 4

---

## 🎯 YOUR OPTIONS

### Option A: Automated (Recommended - 5 min)
Use the script to create products automatically

### Option B: Manual (10 min)
Create products manually in Stripe dashboard

### Option C: API Call (Advanced - 3 min)
Use curl directly

---

## 🚀 OPTION A: AUTOMATED SCRIPT (FASTEST)

**Step 1:** Get your Stripe Secret Key
- Go: https://dashboard.stripe.com/test/apikeys
- Copy your secret key (starts with `sk_test_`)

**Step 2:** Run the script
```bash
cd /path/to/intellimix
chmod +x create-stripe-products.sh
./create-stripe-products.sh sk_test_YOUR_KEY
```

**Step 3:** Copy the output values
The script will show:
```
STRIPE_PRICE_BASIC=price_1...
STRIPE_PRICE_PRO=price_1...
STRIPE_PRICE_ENTERPRISE=price_1...
```

✅ **Done in 5 minutes!**

---

## 📋 OPTION B: MANUAL (If script doesn't work)

1. Go to: https://dashboard.stripe.com/test/products
2. Click "+ Create product"
3. For each (Basic $29, Pro $99, Enterprise $299):
   - Name: `[Plan Name] - $[Price]/month`
   - Price: $[amount]
   - Billing: Monthly (recurring)
   - Save
   - **Copy the Price ID**

✅ **Takes 10 minutes**

---

## 🔧 OPTION C: API CALL (Advanced)

```bash
# Get your secret key from dashboard first
STRIPE_KEY="sk_test_YOUR_KEY"

# Create Basic ($29)
curl https://api.stripe.com/v1/products \
  -u "$STRIPE_KEY:" \
  -d name="Basic Plan - \$29/month" \
  -d type=service | grep -o '"id":"price_[^"]*'

# Plus 2 more for Pro and Enterprise...
```

✅ **Takes 3 minutes but complex**

---

## 📝 COLLECT THESE 5 VALUES

After creating products, you'll have:

```
STRIPE_PUBLISHABLE_KEY=pk_test_ABC123...     [from API keys page]
STRIPE_SECRET_KEY=sk_test_ABC123...          [from API keys page]
STRIPE_PRICE_BASIC=price_1ABC123...          [from script/manual]
STRIPE_PRICE_PRO=price_1DEF456...            [from script/manual]
STRIPE_PRICE_ENTERPRISE=price_1GHI789...     [from script/manual]
```

---

## 🎬 NEXT STEPS

1. **Choose your option** (A, B, or C above)
2. **Get the 5 values**
3. **Save them to a text file**
4. **Reply: "Phase 2 complete - I have my 5 Stripe values"**
5. **Then:** I'll guide Phase 3 (Railway deployment)

---

## ⏱️ TIME REMAINING

- ✅ Phase 1: GitHub - DONE
- ⏳ Phase 2: Stripe - ~10 min (YOU ARE HERE)
- ⏳ Phase 3: Railway - ~10 min
- ⏳ Phase 4: Env Vars - ~5 min
- ⏳ Phase 5: Test - ~5 min

**Total remaining: ~30 minutes to LIVE!** 🚀

---

## 🚀 RECOMMENDED: START WITH OPTION A

The script is the fastest and easiest. Just:

```bash
cd /path/to/intellimix
chmod +x create-stripe-products.sh
./create-stripe-products.sh sk_test_YOUR_SECRET_KEY
```

Then copy the output values!

See: **STRIPE_PRODUCTS_AUTO.md** for detailed instructions

---

**Ready? Choose your option and get those 5 values!** 💪
