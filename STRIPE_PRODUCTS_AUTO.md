# 🤖 AUTOMATED STRIPE PRODUCT CREATION

**What this does:** Creates 3 Stripe products automatically via API  
**Time saved:** 7 minutes  
**Result:** All 3 price IDs ready for Phase 4

---

## 📋 STEP 1: Get Your Stripe Secret Key

1. Go to: **https://dashboard.stripe.com/test/apikeys**
2. You'll see your **Secret key** (starts with `sk_test_`)
3. Click the eye icon to reveal it
4. **Copy it** (entire key)

---

## 🚀 STEP 2: Run the Script

On your local machine in the intellimix directory:

```bash
./create-stripe-products.sh sk_test_YOUR_KEY_HERE
```

Replace `sk_test_YOUR_KEY_HERE` with your actual secret key.

**Example:**
```bash
./create-stripe-products.sh sk_test_51MmXrDpDOTJnqGI3w0vFcb9JxY9zKp3F
```

---

## ✅ WHAT IT DOES

The script will:
1. Create "Basic Plan - $29/month"
2. Create "Pro Plan - $99/month"  
3. Create "Enterprise Plan - $299/month"
4. Get all 3 price IDs
5. Display results in the format you need

---

## 📊 EXPECTED OUTPUT

```
🚀 STRIPE PRODUCT CREATION
==========================

Creating 3 products...

1️⃣  Creating Basic Plan ($29/month)...
✅ Created product: prod_ABC123...
✅ Price ID: price_1ABC123...

2️⃣  Creating Pro Plan ($99/month)...
✅ Created product: prod_DEF456...
✅ Price ID: price_1DEF456...

3️⃣  Creating Enterprise Plan ($299/month)...
✅ Created product: prod_GHI789...
✅ Price ID: price_1GHI789...

==========================================
🎉 SUCCESS! All 3 products created!
==========================================

📋 SAVE THESE VALUES FOR PHASE 4:

STRIPE_PRICE_BASIC=price_1ABC123...
STRIPE_PRICE_PRO=price_1DEF456...
STRIPE_PRICE_ENTERPRISE=price_1GHI789...

✅ Ready for Phase 4 (Railway env variables)
```

---

## 🔒 SECURITY

- Your secret key is only used for the API call
- It's not stored or logged
- Test keys (`sk_test_`) only work in test mode
- You can regenerate keys anytime

---

## 🛠️ TROUBLESHOOTING

### Script not working?
```bash
chmod +x create-stripe-products.sh
./create-stripe-products.sh sk_test_...
```

### curl command not found?
```bash
# macOS
brew install curl

# Ubuntu/Debian
sudo apt-get install curl
```

### Getting error from script?
1. Verify your secret key is correct
2. Make sure it starts with `sk_test_`
3. Check key is still active (not revoked)

---

## ✨ AFTER SCRIPT SUCCEEDS

You'll have 3 price IDs. Save them in a text file in this format:

```
STRIPE_PUBLISHABLE_KEY=pk_test_ABC123...
STRIPE_SECRET_KEY=sk_test_ABC123...
STRIPE_PRICE_BASIC=price_1ABC123...
STRIPE_PRICE_PRO=price_1DEF456...
STRIPE_PRICE_ENTERPRISE=price_1GHI789...
```

Then you're ready for Phase 3 (Railway deployment)!

---

## 📌 QUICK START

```bash
cd /path/to/intellimix
chmod +x create-stripe-products.sh
./create-stripe-products.sh sk_test_YOUR_KEY
```

Copy the output values and you're done with product creation! 🎉
