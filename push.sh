#!/bin/bash

# ✅ INTELLIMIX GITHUB PUSH SCRIPT
# Run this on your local machine in the intellimix directory

echo "🚀 Intellimix GitHub Push"
echo "========================"
echo ""

# Configuration
REPO_PATH="."  # Current directory
SSH_URL="git@github.com:heattafrica-byte/intellimix-production.git"
GITHUB_URL="https://github.com/heattafrica-byte/intellimix-production"

echo "📍 Repository: $REPO_PATH"
echo "🔗 Remote: $SSH_URL"
echo ""

# Step 1: Verify we're in the right directory
if [ ! -d ".git" ]; then
    echo "❌ ERROR: Not in a git repository!"
    echo "Make sure you're in the intellimix directory"
    exit 1
fi

echo "✅ Git repository found"
echo ""

# Step 2: Add remote
echo "Step 1/3: Adding GitHub remote..."
git remote add origin "$SSH_URL" 2>/dev/null || git remote set-url origin "$SSH_URL"
echo "✅ Remote configured"
echo ""

# Step 3: Push code
echo "Step 2/3: Pushing code to GitHub..."
git push -u origin main
PUSH_RESULT=$?
echo ""

if [ $PUSH_RESULT -eq 0 ]; then
    echo "✅ Push successful!"
    echo ""
    echo "🎉 PHASE 1 COMPLETE!"
    echo ""
    echo "Your code is live at:"
    echo "👉 $GITHUB_URL"
    echo ""
    echo "Check it out - you should see all files there!"
    echo ""
    echo "========================================================"
    echo "Next: Follow PHASE 2 - Stripe Setup"
    echo "========================================================"
else
    echo "❌ Push failed. Error code: $PUSH_RESULT"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure you have SSH keys set up for GitHub"
    echo "2. Run: ssh -T git@github.com"
    echo "   (Should show: Hi USERNAME! You've successfully authenticated)"
    echo "3. If that fails, add your SSH key to GitHub:"
    echo "   https://github.com/settings/keys"
    exit 1
fi
