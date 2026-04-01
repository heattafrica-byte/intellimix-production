# 📦 STRIPE CLI INSTALLATION & SETUP

**What it is:** Command-line tool for testing Stripe integration locally  
**Why you need it:** To test webhooks and sync subscription data  
**Optional for launch:** Yes, but useful for testing

---

## 🚀 INSTALL STRIPE CLI

### Option 1: Homebrew (macOS - Easiest)

```bash
brew install stripe/stripe-cli/stripe
```

Verify:
```bash
stripe --version
```

### Option 2: Direct Download (macOS)

```bash
curl https://files.stripe.com/stripe-cli/installer.sh -o installer.sh
bash installer.sh
```

### Option 3: Linux

```bash
# Ubuntu/Debian
sudo apt-get install stripe

# Fedora
sudo dnf install stripe
```

### Option 4: Windows

Download from: https://github.com/stripe/stripe-cli/releases

---

## 🔐 LOGIN TO STRIPE

Once installed:

```bash
stripe login
```

This will:
1. Open browser to Stripe dashboard
2. Ask to confirm
3. Generate a local API key

---

## 🧪 TEST WEBHOOKS LOCALLY

After you deploy to Railway, use this to test:

```bash
# Listen for Stripe events
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

In another terminal:
```bash
# Trigger a test event
stripe trigger customer.subscription.created
```

---

## 📋 STRIPE CLI USEFUL COMMANDS

```bash
# Login/logout
stripe login
stripe logout

# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded

# View events
stripe logs data

# Create test sessions (advanced)
stripe samples create
```

---

## 🎯 DO YOU NEED IT FOR LAUNCH?

**Short answer:** Not immediately

**When you'll use it:**
- After Railway deployment
- To test webhook events locally
- To verify subscription sync works

**For now:** Focus on Phase 2 (Stripe setup) and Phase 3 (Railway deploy)

---

## ⏭️ NEXT STEPS

1. ✅ **Phase 1: GitHub** - DONE ✅
2. ⏳ **Phase 2: Stripe Setup** - START HERE
   - Create account at https://stripe.com/register
   - Create 3 products
   - Get API keys
3. ⏳ **Phase 3: Railway Deploy**
4. ⏳ **Phase 4: Env Variables**
5. ⏳ **Phase 5: Test Payment**

**Can install Stripe CLI later for testing after deployment.**

---

## 📚 RESOURCES

- Stripe CLI docs: https://stripe.com/docs/stripe-cli
- GitHub: https://github.com/stripe/stripe-cli
- Webhooks guide: https://stripe.com/docs/webhooks

---

**For now:** Follow Phase 2 in LAUNCH_YOUR_TASKS.md 📋
