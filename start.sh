#!/bin/sh
set +e

echo "[Startup] Starting Intellimix..."
echo "[Startup] NODE_ENV=$NODE_ENV"
echo "[Startup] PORT=$PORT"

# Start the application
echo "[Startup] Starting Express server on port $PORT..."
exec node dist/index.js
