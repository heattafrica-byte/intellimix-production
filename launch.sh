#!/bin/bash
set -e

echo "🚀 INTELLIMIX LAUNCH SEQUENCE INITIATED"
echo "========================================"
echo ""

# Step 1: Check we're in the right directory
if [ ! -f "cloudbuild.yaml" ]; then
    echo "❌ ERROR: Not in intellimix directory or cloudbuild.yaml missing"
    exit 1
fi

echo "✅ Correct directory: intellimix/"
echo ""

# Step 2: Verify commits are ready
COMMIT_COUNT=$(git rev-list --count origin/main..main 2>/dev/null || echo "0")
echo "📊 Local commits ready to push: $COMMIT_COUNT"
echo ""

# Step 3: Attempt git push
echo "🔄 Pushing to GitHub..."
echo ""

# Try to push with existing remote
if git push origin main -u 2>&1; then
    echo ""
    echo "✅ PUSH SUCCESSFUL!"
    echo ""
    echo "🎯 NEXT STEPS - GOOGLE CLOUD SETUP:"
    echo "===================================="
    echo ""
    echo "1️⃣  ENABLE GOOGLE CLOUD APIs:"
    echo "   gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com"
    echo ""
    echo "2️⃣  Connect GitHub to Cloud Build:"
    echo "   - Go to: https://console.cloud.google.com/cloud-build/repositories"
    echo "   - Click 'Connect Repository'"
    echo "   - Select intellimix-production repo"
    echo "   - Create trigger for main branch"
    echo "   - Build config: cloudbuild.yaml"
    echo ""
    echo "3️⃣  Add Environment Variables:"
    echo "   - Go to: https://console.cloud.google.com/security/secret-manager"
    echo "   - Create 6 secrets:"
    echo "     • STRIPE_PUBLISHABLE_KEY"
    echo "     • STRIPE_SECRET_KEY"
    echo "     • STRIPE_PRICE_BASIC"
    echo "     • STRIPE_PRICE_PRO"
    echo "     • STRIPE_PRICE_ENTERPRISE"
    echo "     • DATABASE_URL"
    echo ""
    echo "4️⃣  Check deployment:"
    echo "   - Go to: https://console.cloud.google.com/cloud-build/builds"
    echo "   - Watch your build complete (3-5 min)"
    echo "   - Get live URL from Cloud Run"
    echo ""
    echo "🎉 YOU'RE GOING LIVE IN 15 MINUTES!"
    exit 0
else
    echo ""
    echo "❌ Push failed. Need authentication."
    echo ""
    echo "SOLUTION: Create a Personal Access Token"
    echo "=========================================="
    echo ""
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token' → 'Tokens (classic)'"
    echo "3. Name: intellimix-cloud-deploy"
    echo "4. Scopes: repo, read:user, write:repo_hook"
    echo "5. Generate and COPY the token"
    echo ""
    echo "Then run:"
    echo "  git remote set-url origin \"https://heattafrica-byte:YOUR_TOKEN@github.com/heattafrica-byte/intellimix-production.git\""
    echo "  git push origin main"
    echo ""
    exit 1
fi
