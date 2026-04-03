#!/bin/sh
set -e

echo "[Startup] Starting Intellimix..."

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "[Startup] Running database migrations..."
  if pnpm run db:push 2>&1; then
    echo "[Startup] ✅ Database migrations completed"
  else
    echo "[Startup] ⚠️ Database migrations warning (may already be initialized)"
  fi
else
  echo "[Startup] ⚠️ DATABASE_URL not set, skipping migrations"
fi

# Start the application
echo "[Startup] Starting Express server on port $PORT..."
exec node dist/index.js
