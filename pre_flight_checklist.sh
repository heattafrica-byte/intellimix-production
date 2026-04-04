#!/bin/bash
#==============================================================================
# INTELLIMIX MANUAL DEPLOYMENT PRE-FLIGHT CHECKLIST
# ============================================================================
# Comprehensive verification before pushing to production
# Ensures manual deployment matches GitHub main branch state
#
# Usage:  bash pre_flight_checklist.sh
# Output: GO/NO-GO decision + deployment readiness score
#==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass_count=0
fail_count=0
warn_count=0

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       INTELLIMIX PRODUCTION DEPLOYMENT PRE-FLIGHT CHECKLIST     ║"
echo "║                  Manual Deployment Verification                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Timestamp:    $(date)"
echo ""

# ============================================================================
# SECTION 1: GIT STATUS & BRANCH
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 1: GIT STATUS & SOURCE CONTROL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}✗ Not a git repository${NC}"
  ((fail_count++))
else
  echo -e "${GREEN}✓ Git repository detected${NC}"
  ((pass_count++))
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  echo -e "${GREEN}✓ On production branch: $CURRENT_BRANCH${NC}"
  ((pass_count++))
else
  echo -e "${YELLOW}⚠ On branch: $CURRENT_BRANCH (expected main/master)${NC}"
  ((warn_count++))
fi

# Check for uncommitted changes
if git diff-index --quiet HEAD --; then
  echo -e "${GREEN}✓ Working directory clean${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ Uncommitted changes detected${NC}"
  echo "   Run: git status"
  ((fail_count++))
fi

# Get last commit
LAST_COMMIT=$(git log -1 --oneline)
echo -e "${BLUE}  Last commit: $LAST_COMMIT${NC}"

# ============================================================================
# SECTION 2: ENVIRONMENT VARIABLES
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 2: REQUIRED ENVIRONMENT VARIABLES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Load from current environment or .env if available
if [ -f ".env" ]; then
  echo -e "${YELLOW}⚠ .env file found (should not be in git)${NC}"
  ((warn_count++))
fi

# Hardcoded required vars for Cloud Run
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "FIREBASE_ADMIN_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠ $var not in current shell (expected in Cloud Run Secret Manager)${NC}"
    ((missing_vars++))
  else
    # Show only first/last 10 chars for security
    val="${!var}"
    if [ ${#val} -gt 20 ]; then
      display_val="${val:0:10}...${val: -10}"
    else
      display_val="[SET]"
    fi
    echo -e "${GREEN}✓ $var = $display_val${NC}"
    ((pass_count++))
  fi
done

if [ $missing_vars -gt 0 ]; then
  echo -e "${YELLOW}⚠ Note: Some vars may be in GCP Secret Manager only (OK for Cloud Run)${NC}"
fi

# ============================================================================
# SECTION 3: BUILD SYSTEM
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 3: BUILD SYSTEM & DEPENDENCIES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if pnpm installed
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  echo -e "${GREEN}✓ pnpm ${PNPM_VERSION} installed${NC}"
  ((pass_count++))
else
  echo -e "${YELLOW}⚠ pnpm not found (Docker will install it)${NC}"
  ((warn_count++))
fi

# Check if Node installed
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "${GREEN}✓ Node ${NODE_VERSION} installed${NC}"
  ((pass_count++))
else
  echo -e "${YELLOW}⚠ Node not found (Docker will use node:22-alpine)${NC}"
  ((warn_count++))
fi

# Check pnpm-lock.yaml
if [ -f "pnpm-lock.yaml" ]; then
  echo -e "${GREEN}✓ pnpm-lock.yaml exists (lock file maintains deterministic builds)${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ pnpm-lock.yaml missing (will cause non-deterministic builds)${NC}"
  ((fail_count++))
fi

# Check package.json scripts
if grep -q '"build"' package.json; then
  echo -e "${GREEN}✓ package.json has 'build' script${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ package.json missing 'build' script${NC}"
  ((fail_count++))
fi

# ============================================================================
# SECTION 4: DOCKER & CLOUD RUN
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 4: DOCKER & CLOUD RUN READINESS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Dockerfile exists
if [ -f "Dockerfile" ]; then
  echo -e "${GREEN}✓ Dockerfile exists${NC}"
  ((pass_count++))
  
  # Verify Dockerfile has required patterns
  if grep -q "node:22-alpine" Dockerfile; then
    echo -e "${GREEN}  ├─ Uses node:22-alpine base image${NC}"
  fi
  if grep -q "pnpm install --frozen-lockfile" Dockerfile; then
    echo -e "${GREEN}  ├─ Uses --frozen-lockfile flag (reproducible builds)${NC}"
  fi
  if grep -q "pnpm run build" Dockerfile; then
    echo -e "${GREEN}  ├─ Runs 'pnpm build' step${NC}"
  fi
  if grep -q "CMD.*start.sh" Dockerfile; then
    echo -e "${GREEN}  └─ Executes start.sh wrapper${NC}"
  fi
else
  echo -e "${RED}✗ Dockerfile missing${NC}"
  ((fail_count++))
fi

# Check cloudbuild.yaml
if [ -f "cloudbuild.yaml" ]; then
  echo -e "${GREEN}✓ cloudbuild.yaml exists (Cloud Build configuration)${NC}"
  ((pass_count++))
  
  # Verify secrets mapping
  if grep -q "set-secrets=" cloudbuild.yaml; then
    echo -e "${GREEN}  └─ Secret Manager integration configured${NC}"
  fi
else
  echo -e "${YELLOW}⚠ cloudbuild.yaml not found (manual gcloud command required)${NC}"
  ((warn_count++))
fi

# Check start.sh
if [ -f "start.sh" ]; then
  echo -e "${GREEN}✓ start.sh wrapper script exists${NC}"
  ((pass_count++))
else
  echo -e "${YELLOW}⚠ start.sh not found${NC}"
  ((warn_count++))
fi

# ============================================================================
# SECTION 5: FILE INTEGRITY & SECURITY
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 5: FILE INTEGRITY & SECURITY SCAN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for junk files
junk_files=(
  "AUTHENTICATION_IMPLEMENTATION.md"
  "AUTH_SYSTEM_DOCUMENTATION.md"
  "DEPLOYMENT_COMPLETION_CHECKLIST.md"
  "test-db.js"
  "test-db-url.js"
  "test-firebase-init.mjs"
  "vite.config.ts.bak"
)

junk_found=0
for file in "${junk_files[@]}"; do
  if [ -f "$file" ] || [ -d "$file" ]; then
    echo -e "${RED}✗ Junk file found: $file${NC}"
    ((junk_found++))
    ((fail_count++))
  fi
done

if [ $junk_found -eq 0 ]; then
  echo -e "${GREEN}✓ No development-only files detected${NC}"
  ((pass_count++))
else
  echo -e "${RED}  → Run: bash final_cleanup.sh${NC}"
fi

# Check for hardcoded secrets
echo -e "${BLUE}Scanning for hardcoded credentials...${NC}"

secrets_found=0

# Stripe keys
if grep -r "sk_live_" client/ server/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}✗ Found hardcoded Stripe live keys${NC}"
  ((secrets_found++))
fi

# Firebase keys
if grep -r "service_account" client/ server/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "SECRET\|env\|process.env" | grep -v node_modules; then
  echo -e "${YELLOW}⚠ Possible hardcoded Firebase keys (verify)${NC}"
fi

# GCP/AWS patterns
if grep -r "AIza" . --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}✗ Found GCP API keys${NC}"
  ((secrets_found++))
fi

if grep -r "AKIA" . --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v example; then
  echo -e "${RED}✗ Found AWS access keys${NC}"
  ((secrets_found++))
fi

if [ $secrets_found -eq 0 ]; then
  echo -e "${GREEN}✓ No hardcoded secrets detected${NC}"
  ((pass_count++))
else
  echo -e "${RED}  → Fix secrets before deploying${NC}"
fi

# Check .env files should not be committed
if [ -f ".env.local" ] || [ -f ".env.production" ]; then
  echo -e "${YELLOW}⚠ Local .env files present (ensure .gitignore prevents commit)${NC}"
  ((warn_count++))
fi

# ============================================================================
# SECTION 6: CODE QUALITY
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 6: CODE QUALITY CHECKS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check TypeScript
if [ -f "tsconfig.json" ]; then
  echo -e "${GREEN}✓ tsconfig.json exists${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ tsconfig.json missing${NC}"
  ((fail_count++))
fi

# Check for console.logs (should be minimal in production)
console_log_count=$(grep -r "console\.log\|console\.debug" client/src server --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "addLog\|node_modules" | wc -l)
if [ "$console_log_count" -gt 10 ]; then
  echo -e "${YELLOW}⚠ Found $console_log_count console.log statements (should minimize for prod)${NC}"
  ((warn_count++))
else
  echo -e "${GREEN}✓ Console logging usage is reasonable${NC}"
  ((pass_count++))
fi

# ============================================================================
# SECTION 7: DATABASE MIGRATIONS
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 7: DATABASE SETUP${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Drizzle setup
if [ -f "drizzle.config.ts" ]; then
  echo -e "${GREEN}✓ drizzle.config.ts exists${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ drizzle.config.ts missing${NC}"
  ((fail_count++))
fi

if [ -f "drizzle/schema.ts" ]; then
  echo -e "${GREEN}✓ drizzle/schema.ts exists${NC}"
  ((pass_count++))
else
  echo -e "${RED}✗ drizzle/schema.ts missing${NC}"
  ((fail_count++))
fi

# ============================================================================
# SECTION 8: DEPLOYMENT COMMAND SIMULATION
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SECTION 8: DEPLOYMENT COMMAND TEMPLATE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat << 'EOF'

MANUAL DEPLOYMENT COMMAND (for Cloud Run):

  gcloud run deploy intellimix \
    --source . \
    --region=europe-west1 \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=3600 \
    --set-env-vars=NODE_ENV=production,LOG_LEVEL=error \
    --set-secrets=\
DATABASE_URL=DATABASE_URL:latest,\
JWT_SECRET=JWT_SECRET:latest,\
FIREBASE_ADMIN_KEY=FIREBASE_ADMIN_KEY:latest,\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,\
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\
STRIPE_PRICE_BASIC=STRIPE_PRICE_BASIC:latest,\
STRIPE_PRICE_PRO=STRIPE_PRICE_PRO:latest,\
STRIPE_PRICE_ENTERPRISE=STRIPE_PRICE_ENTERPRISE:latest,\
AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID:latest,\
AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY:latest,\
AWS_REGION=AWS_REGION:latest,\
AWS_S3_BUCKET=AWS_S3_BUCKET:latest

PREREQUISITES:
  1. All secrets exist in GCP Secret Manager with :latest version
  2. MySQL database initialized and accessible
  3. Repository on 'main' branch with clean working directory
  4. All credentials configured in .env or Secret Manager

EOF

# ============================================================================
# FINAL TALLY
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PRE-FLIGHT SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

total=$((pass_count + fail_count + warn_count))
if [ $total -eq 0 ]; then
  readiness=0
else
  readiness=$((pass_count * 100 / total))
fi

echo ""
echo -e "${GREEN}✓ Passed:  $pass_count${NC}"
echo -e "${RED}✗ Failed:  $fail_count${NC}"
echo -e "${YELLOW}⚠ Warned:  $warn_count${NC}"
echo ""
echo -e "Production Readiness: ${readiness}% (${pass_count}/${total})"
echo ""

if [ $fail_count -eq 0 ] && [ $warn_count -le 2 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          🚀 GO FOR DEPLOYMENT 🚀          ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Verify all secrets are in GCP Secret Manager"
  echo "  2. Run the deployment command above"
  echo "  3. Monitor: gcloud run services logs read intellimix --limit=50"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║        ⛔ NO-GO - FIX ISSUES FIRST ⛔       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Critical failures must be resolved before deployment."
  echo "Warnings can be addressed post-deployment if low-risk."
  exit 1
fi
