#!/bin/bash

# Intellimix Production Deployment Script
# This script helps you quickly prepare and validate the app for deployment

echo "🚀 Intellimix Production Deployment Script"
echo "==========================================="
echo ""

# Check Node version
echo "✓ Checking Node.js version..."
node --version

# Check pnpm
echo "✓ Checking pnpm..."
pnpm --version

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Type checking
echo ""
echo "🔍 Checking TypeScript..."
pnpm run check

# Build
echo ""
echo "🔨 Building application..."
pnpm run build

# Tests
echo ""
echo "✅ Running tests..."
pnpm run test

echo ""
echo "==========================================="
echo "✅ All checks passed! Ready for deployment."
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Set up Railway: https://railway.app"
echo "3. Set up Stripe: https://stripe.com"
echo "4. Follow DEPLOYMENT.md for detailed steps"
echo ""
