#!/bin/bash
#==============================================================================
# INTELLIMIX PRODUCTION CLEANUP SCRIPT
# ============================================================================
# Removes all non-production files identified in forensic audit
# Execute ONCE before final deployment
#
# Usage:  bash final_cleanup.sh
# Verify: git status (should show deletions only)
#==============================================================================

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 INTELLIMIX PRODUCTION CLEANUP"
echo "=================================="
echo ""
echo "Removing non-production files..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup_count=0
failed_count=0

# Function to safely remove files
safe_remove() {
  local file="$1"
  local category="$2"
  
  if [ -f "$file" ] || [ -d "$file" ]; then
    rm -rf "$file"
    echo -e "${GREEN}✓${NC} Removed: $file ($category)"
    ((cleanup_count++))
  else
    echo -e "${YELLOW}⊘${NC} Not found: $file (skipped)"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 1: Documentation (deployment notes leak internals)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
safe_remove "AUTHENTICATION_IMPLEMENTATION.md" "docs"
safe_remove "AUTH_SYSTEM_DOCUMENTATION.md" "docs"
safe_remove "DATABASE_INIT.md" "docs"
safe_remove "DEPLOYMENT_COMPLETION_CHECKLIST.md" "docs"
safe_remove "DEPLOYMENT_FIX_REPORT.md" "docs"
safe_remove "DEPLOYMENT_STATUS_CURRENT.md" "docs"
safe_remove "DEPLOYMENT_SUCCESS.md" "docs"
safe_remove "DEPLOYMENT_VERIFICATION.md" "docs"
safe_remove "ENV_SETUP.md" "docs"
safe_remove "ERRORS_FIXED_MASTER_SUMMARY.md" "docs"
safe_remove "ERROR_RESOLUTION_REPORT.md" "docs"
safe_remove "FINAL_COMPLETION_REPORT.md" "docs"
safe_remove "FINAL_ERROR_RESOLUTION.md" "docs"
safe_remove "FIREBASE_AUTH_VERIFICATION.md" "docs"
safe_remove "FIREBASE_CONFIG_SETUP.md" "docs"
safe_remove "PRODUCTION_READINESS_FINAL.md" "docs"
safe_remove "QUICK_START_TEST.md" "docs"
safe_remove "SQL_LINTING_NOTES.md" "docs"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 2: Test & Debug Scripts (local development only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
safe_remove "test-db-url.js" "test"
safe_remove "test-db.js" "test"
safe_remove "test-firebase-init.mjs" "test"
safe_remove "test-mysql-connection.js" "test"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 3: Backup & Temporary Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
safe_remove "vite.config.ts.bak" "backup"
safe_remove "init-schema-simple.mjs.bak" "backup"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 4: System Junk Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
safe_remove ".DS_Store" "macos"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 5: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify no accidental key files remain
if grep -r "sk_live_" . --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}✗ ERROR: Found hardcoded Stripe keys!${NC}"
  ((failed_count++))
else
  echo -e "${GREEN}✓ No hardcoded Stripe keys found${NC}"
fi

if grep -r "AIza" . --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}✗ ERROR: Found hardcoded GCP API keys!${NC}"
  ((failed_count++))
else
  echo -e "${GREEN}✓ No hardcoded GCP API keys found${NC}"
fi

if grep -r "AKIA" . --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}✗ ERROR: Found hardcoded AWS keys!${NC}"
  ((failed_count++))
else
  echo -e "${GREEN}✓ No hardcoded AWS keys found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Cleaned: $cleanup_count files/folders${NC}"

if [ $failed_count -eq 0 ]; then
  echo -e "${GREEN}✓ Security verification: PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review git diffs: git diff --cached"
  echo "  2. Commit cleanup:   git add -A && git commit -m 'Cleanup: Remove dev/test files for production'"
  echo "  3. Run pre-flight:   bash pre_flight_checklist.sh"
  echo "  4. Deploy:          gcloud run deploy ..."
  exit 0
else
  echo -e "${RED}✗ Security verification: FAILED (see errors above)${NC}"
  exit 1
fi
