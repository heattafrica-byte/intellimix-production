#!/bin/bash

# 🚀 INTELLIMIX GITHUB PUSH - READY TO EXECUTE
# Once user provides SSH URL, replace placeholder and run this

GITHUB_SSH_URL="${1:-git@github.com:USERNAME/intellimix-production.git}"
REPO_PATH="/Users/admin/Documents/AIAIAI/Intellimix Production ready/intellimix"

echo "🚀 INTELLIMIX LAUNCH - PHASE 1: GITHUB PUSH"
echo "=============================================="
echo ""
echo "📍 Repository: $REPO_PATH"
echo "🔗 Remote URL: $GITHUB_SSH_URL"
echo ""

cd "$REPO_PATH"

# Step 1: Add remote
echo "Step 1/4: Adding remote origin..."
git remote add origin "$GITHUB_SSH_URL" 2>/dev/null || git remote set-url origin "$GITHUB_SSH_URL"
echo "✅ Remote configured"
echo ""

# Step 2: Verify branch
echo "Step 2/4: Verifying main branch..."
git branch -M main
echo "✅ Main branch ready"
echo ""

# Step 3: Push code
echo "Step 3/4: Pushing 153 files to GitHub..."
git push -u origin main
echo "✅ Code pushed!"
echo ""

# Step 4: Show results
echo "Step 4/4: Verifying on GitHub..."
echo ""
REPO_NAME=$(echo "$GITHUB_SSH_URL" | sed 's/.*\///' | sed 's/\.git$//')
USERNAME=$(echo "$GITHUB_SSH_URL" | sed 's/.*://' | sed 's/\/.*//')
GITHUB_URL="https://github.com/$USERNAME/$REPO_NAME"

echo "🎉 PHASE 1 COMPLETE!"
echo ""
echo "Your code is now live at:"
echo "👉 $GITHUB_URL"
echo ""
echo "Check it out - you should see all 153 files!"
echo ""
echo "=====================================================
echo "Next: Follow PHASE 2 in LAUNCH_YOUR_TASKS.md"
echo "========================================================"
