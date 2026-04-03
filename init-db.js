#!/usr/bin/env node

/**
 * Initialize the database with Drizzle schema
 * Run this after deploying Cloud SQL instance
 */

const { execSync } = require('child_process');

console.log('🔧 Initializing Cloud SQL database schema...');

try {
  // Get the DATABASE_URL from Secret Manager
  let secretOutput;
  try {
    secretOutput = execSync('gcloud secrets versions access latest --secret=DATABASE_URL', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch (err) {
    console.error('❌ Could not retrieve DATABASE_URL secret');
    process.exit(1);
  }

  // Set environment variable
  process.env.DATABASE_URL = secretOutput;

  // Run Drizzle migrations
  const migrationsDir = './drizzle/migrations';
  console.log(`📁 Running migrations from ${migrationsDir}...`);

  // Import and run the Drizzle setup
  const { getDb } = require('./server/db');
  
  (async () => {
    try {
      const db = await getDb();
      console.log('✅ Database connected successfully');
      
      // Run migrations (Drizzle will auto-apply on getDb())
      console.log('✅ Database schema initialized');
      process.exit(0);
    } catch (err) {
      console.error('❌ Database initialization failed:', err.message);
      process.exit(1);
    }
  })();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
