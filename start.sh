#!/bin/sh
set +e

echo "[Startup] Starting Intellimix..."

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "[Startup] Running database migrations..."
  pnpm run db:push 2>&1
  migration_result=$?
  
  if [ $migration_result -eq 0 ]; then
    echo "[Startup] ✅ Database migrations completed successfully"
  else
    echo "[Startup] ⚠️ Database migration had issues (continuing to start app)"
    echo "[Startup] This is normal if the database schema is already initialized"
  fi
else
  echo "[Startup] ⚠️ DATABASE_URL not set, skipping migrations"
fi

# Start the application
echo "[Startup] Starting Express server on port $PORT..."
exec node dist/index.js
