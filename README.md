# Intellimix — AI Mixing & Mastering Platform

**Production-ready full-stack application with monetized subscriptions.**

## 🚀 Quick Start

### For Development
```bash
pnpm install
pnpm run dev
```

### For Production Launch
**Ready to go live this week!** Follow the quick launch guide:

```bash
# 1. Install dependencies
pnpm install

# 2. Verify build works
pnpm run build

# 3. Push to GitHub
git push origin main

# 4. Follow the launch guide
cat PRODUCTION_LAUNCH.md
```

**Time to live:** ~1-2 hours with Railway + Stripe

---

## 📚 Documentation

- **[PRODUCTION_LAUNCH.md](./PRODUCTION_LAUNCH.md)** ← **START HERE**
  - Complete launch guide
  - Step-by-step from local to live
  - With pricing page and payments

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**
  - Detailed technical setup
  - Railway + Stripe integration
  - Environment configuration

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**
  - Quick reference checklist
  - All steps at a glance

---

## ✨ What's Included

### 🔧 Backend
- Express.js server with TRPC API
- MySQL database with Drizzle ORM
- OAuth + JWT authentication
- AWS S3 file uploads
- **Stripe payment integration**
- **Subscription webhook handlers**

### 🎨 Frontend
- React 19 with TypeScript
- Vite build system
- Tailwind CSS + Shadcn/ui components
- **Pricing page with 3 subscription tiers**
- Responsive design

### 💰 Monetization
- Stripe payment processing
- Recurring subscription billing
- 3 configurable pricing tiers (Basic, Pro, Enterprise)
- Automatic invoicing & receipts
- Webhook-based subscription tracking

### 🚀 Deployment
- Docker configuration
- Railway.app support
- GitHub Actions CI/CD
- One-command deployment
- Auto-scaling database

---

## 🎯 Key Routes

### API (TRPC)
- `/api/trpc` - All API endpoints
  - `auth.me` - Current user
  - `pipeline.*` - Audio processing pipeline
  - `ai.*` - AI features
  - **`payment.*` - Subscriptions & billing**

### Web
- `/` - Home page
- `/studio` - Main mixing/mastering interface
- **`/pricing` - Pricing page**
- `/dashboard` - User dashboard (auth required)

---

## 📊 Subscription Tiers

### Basic - $29/month
- 50 monthly credits
- Standard support

### Pro - $99/month
- 500 monthly credits
- Priority support
- API access

### Enterprise - $299/month
- Unlimited credits
- Dedicated support
- Custom integration

---

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:pass@host/db

# Auth
JWT_SECRET=<random-32-char-string>
VITE_APP_ID=intellimix

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx

# Storage
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=your-bucket

# Server
NODE_ENV=production
PORT=3000
```

See `.env.example` for all options.

---

## 📦 Tech Stack

- **Runtime:** Node.js 22
- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Express.js + TRPC
- **Database:** MySQL + Drizzle ORM
- **UI:** Tailwind CSS + Radix UI (Shadcn)
- **Payments:** Stripe API
- **Storage:** AWS S3
- **Deployment:** Railway.app Docker
- **CI/CD:** GitHub Actions

---

## 🏃 Getting Started

### Prerequisites
- Node.js 22+
- pnpm 10+
- GitHub account
- Railway account (free)
- Stripe account (free to create)

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Visit http://localhost:3000
```

### Testing

```bash
# Run all tests
pnpm run test

# Type checking
pnpm run check

# Format code
pnpm run format
```

### Database Migrations

```bash
# Generate and apply migrations
pnpm run db:push

# Generate migration files
pnpm exec drizzle-kit generate
```

---

## 🌐 Deployment

### One-Time Setup (30 min)
1. Create Railway account
2. Create Stripe account
3. Push code to GitHub
4. Connect Railway to GitHub
5. Set environment variables
6. Deploy

### Continuous Deployment
After setup, every push to `main` branch automatically:
1. Builds Docker image
2. Runs tests
3. Deploys to production

See [PRODUCTION_LAUNCH.md](./PRODUCTION_LAUNCH.md) for detailed steps.

---

## 💡 Features

### Audio Processing
- Real-time mixing & mastering
- Multiple export formats (WAV, FLAC, AIFF)
- Stem analysis & processing
- LUFS metering & normalization

### User Management
- OAuth-based authentication
- Email verification
- Session management
- Role-based access (user/admin)

### Payments
- Secure Stripe checkout
- Automatic subscription billing
- Credit-based usage tracking
- Webhook notifications

### Admin
- User management
- Subscription overview
- Revenue tracking
- API monitoring

---

## 🐛 Troubleshooting

### Build Issues
- Clear `node_modules/`: `rm -rf node_modules && pnpm install`
- Check Node version: `node --version` (should be 22+)
- Check pnpm version: `pnpm --version` (should be 10+)

### Database Issues
- Verify `DATABASE_URL` format
- Check MySQL service is running
- Run migrations: `pnpm db:push`

### Payment Issues
- Check Stripe keys are correct
- Verify webhook URL in Stripe dashboard
- Test with Stripe test cards (see docs)

---

## 📞 Support

- **Railway:** [railway.app/support](https://railway.app/support)
- **Stripe:** [stripe.com/support](https://stripe.com/support)
- **Drizzle ORM:** [orm.drizzle.team](https://orm.drizzle.team)

---

## 📄 License

MIT

---

## 🎉 Ready to Launch?

Follow the **[PRODUCTION_LAUNCH.md](./PRODUCTION_LAUNCH.md)** guide to get live in ~1-2 hours!

Questions? Check the docs folder for detailed guides.
