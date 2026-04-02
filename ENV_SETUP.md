# Environment Setup Guide - EXACTLY Where to Get Each Value

## Step-by-Step: Getting Each Secret

### 1. JWT_SECRET (Generate This)
```bash
# Run this in terminal - it generates a random secret
openssl rand -hex 32

# Output will look like:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Copy that entire output and use it
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 2. DATABASE_URL (Your MySQL Connection)
**You need:** Host, Port, Username, Password, Database Name

**Format:** `mysql://username:password@host:port/databasename`

**Example:**
```
DATABASE_URL=mysql://admin:mypassword123@db.example.com:3306/intellimix_prod
```

**Where to get this:**
- If you have existing MySQL: contact your hosting provider or check your DB admin panel
- If you need to create MySQL: use Google Cloud SQL or AWS RDS
- **Google Cloud SQL**: Go to Cloud Console → SQL → Create Instance → Copy connection string

### 3. VITE_APP_ID (Just Pick a Name)
```
VITE_APP_ID=intellimix
```
(This is just an identifier - any name works)

### 4. OAUTH_SERVER_URL (Your Auth Provider)
This depends on where you're authenticating users:

**If using Google OAuth:**
```
OAUTH_SERVER_URL=https://oauth.google.com
```

**If using GitHub OAuth:**
```
OAUTH_SERVER_URL=https://github.com/login/oauth
```

**If using custom auth:**
```
OAUTH_SERVER_URL=https://your-auth-server.com
```

### 5. OWNER_OPEN_ID (Admin User ID)
This is the unique ID of the admin user from your OAuth provider.

**How to get:**
- After you log in with OAuth, the system creates a user ID
- Once deployed, check your database for the first user's `openId` value
- Use that value here

**Placeholder for now:**
```
OWNER_OPEN_ID=admin-user-123
```

### 6-8. STRIPE Keys (If Using Payments)

**Go here:** https://dashboard.stripe.com/apikeys

**You'll see:**
- **Secret key** (starts with `sk_live_` or `sk_test_`)
- **Publishable key** (starts with `pk_live_` or `pk_test_`)

```
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_STRIPE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_STRIPE_KEY_HERE
```

### 9. STRIPE_WEBHOOK_SECRET

**Go here:** https://dashboard.stripe.com/webhooks

1. Click "Add Endpoint"
2. URL: `https://your-app-url.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Click "Add Endpoint"
5. Copy the **Signing secret** (starts with `whsec_`)

```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE
```

### 10-12. STRIPE Pricing IDs

**Go here:** https://dashboard.stripe.com/products

For EACH product (Basic, Pro, Enterprise):
1. Click the product name
2. Scroll down to "Pricing"
3. Copy the **Price ID** (starts with `price_`)

```
STRIPE_PRICE_BASIC=price_1THOMWDpDOTJnqGILNuUvxSs
STRIPE_PRICE_PRO=price_1THOMsDpDOTJnqGIQ5DGY6lC
STRIPE_PRICE_ENTERPRISE=price_1THOM3DpDOTJnqGIQqzpiN5I
```

### 13-16. AWS Keys (If Using S3 Storage)

**Go here:** https://console.aws.amazon.com/iam/home#/users

1. Click "Users" → Click your user
2. Go to "Security credentials"
3. Under "Access keys", click "Create access key"
4. Copy both keys (they only show once!)

```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_FROM_IAM
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY_FROM_IAM
AWS_REGION=us-east-1
```

**For S3 bucket:**
```
AWS_S3_BUCKET=my-intellimix-storage
```

---

## Quick Reference - Copy & Fill This In

```
JWT_SECRET=[RUN: openssl rand -hex 32]
DATABASE_URL=[mysql://user:pass@host:port/dbname]
VITE_APP_ID=intellimix
OAUTH_SERVER_URL=[Your OAuth provider URL]
OWNER_OPEN_ID=[Admin user ID - get after first deploy]
STRIPE_SECRET_KEY=[From Stripe Dashboard → API Keys]
STRIPE_PUBLISHABLE_KEY=[From Stripe Dashboard → API Keys]
STRIPE_WEBHOOK_SECRET=[From Stripe Dashboard → Webhooks]
STRIPE_PRICE_BASIC=[From Stripe Dashboard → Products]
STRIPE_PRICE_PRO=[From Stripe Dashboard → Products]
STRIPE_PRICE_ENTERPRISE=[From Stripe Dashboard → Products]
AWS_ACCESS_KEY_ID=[From AWS IAM → Create Access Key]
AWS_SECRET_ACCESS_KEY=[From AWS IAM → Create Access Key]
AWS_REGION=us-east-1
AWS_S3_BUCKET=[Your S3 bucket name]
```

## For Google Cloud Deployment

After you get all the secrets above:

1. Go to: https://console.cloud.google.com/security/secret-manager
2. Click "+ CREATE SECRET"
3. **Name:** JWT_SECRET
4. **Value:** (paste the value you generated above)
5. Click "Create Secret"
6. **Repeat for all 15 secrets**

Cloud Build will automatically pull these and inject them into the app.

## Local Development (for testing)

If you want to test locally before deploying:

```bash
# Copy the template
cp .env.example .env

# Edit .env and fill in YOUR values from above
nano .env

# Then run:
pnpm run dev
```

The app will read from `.env` during local development.
