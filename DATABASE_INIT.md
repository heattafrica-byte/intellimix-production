# Database Initialization Guide

Due to network connectivity limitations from Cloud Run to the private Cloud SQL instance, the database schema needs to be created manually using the GCP Console.

## Quick Steps

### Option 1: Use GCP Console SQL Editor (Easiest)

1. Go to [GCP Console](https://console.cloud.google.com)
2. Select project: `gen-lang-client-0270408885`
3. Navigate to: **SQL** → **Instances** → **intellimix**
4. Click on the instance to open details
5. Go to the **SQL** tab
6. Click **CONNECT USING CLOUD SHELL** or use the **Queries** section
7. Copy and paste the SQL below into the query editor
8. Click **Run Query**

### Option 2: Use Cloud Run Job (Recommended for future automated deploys)

Create a Cloud Run job that runs the schema initialization script on every deployment.

## SQL Schema

Copy and paste this into GCP Console SQL editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user','admin') DEFAULT 'user' NOT NULL,
  stripeCustomerId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Pipeline sessions
CREATE TABLE IF NOT EXISTS pipeline_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  subGenre VARCHAR(100),
  targetLufs FLOAT DEFAULT -14 NOT NULL,
  targetSampleRate INT DEFAULT 44100 NOT NULL,
  targetBitDepth INT DEFAULT 24 NOT NULL,
  status ENUM('uploading','analysing','processing','mastering','complete','error') DEFAULT 'uploading' NOT NULL,
  sessionAnalysis TEXT,
  mixdownWavUrl TEXT,
  masterWavUrl TEXT,
  masterAiffUrl TEXT,
  masterFlacUrl TEXT,
  mixdownLufs FLOAT,
  mixdownLra FLOAT,
  mixdownTruePeak FLOAT,
  masterLufs FLOAT,
  masterLra FLOAT,
  masterTruePeak FLOAT,
  masteringReport TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  bpm INT DEFAULT 120,
  masterVolume FLOAT DEFAULT 1,
  masterSettings JSON,
  aiInsights TEXT,
  duration FLOAT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Stems
CREATE TABLE IF NOT EXISTS stems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sessionId INT NOT NULL,
  userId INT NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  fileUrl TEXT NOT NULL,
  fileKey VARCHAR(512) NOT NULL,
  fileSizeBytes INT DEFAULT 0 NOT NULL,
  mimeType VARCHAR(100) NOT NULL,
  `order` INT DEFAULT 0 NOT NULL,
  stemType VARCHAR(100),
  stemCategory VARCHAR(50),
  processingParams JSON,
  processingStatus ENUM('pending','processing','complete','error') DEFAULT 'pending' NOT NULL,
  processingError TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  `order` INT DEFAULT 0,
  volume FLOAT DEFAULT 1,
  pan FLOAT DEFAULT 0,
  muted BOOLEAN DEFAULT 0,
  soloed BOOLEAN DEFAULT 0,
  audioFileUrl TEXT,
  audioFileKey VARCHAR(512),
  audioFileName VARCHAR(255),
  audioDuration FLOAT DEFAULT 0,
  waveformData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Track Effects
CREATE TABLE IF NOT EXISTS track_effects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trackId INT NOT NULL,
  effectType VARCHAR(50) NOT NULL,
  params JSON,
  enabled BOOLEAN DEFAULT 1,
  `order` INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Automation Lanes
CREATE TABLE IF NOT EXISTS automation_lanes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trackId INT NOT NULL,
  parameter VARCHAR(100) NOT NULL,
  points JSON,
  enabled BOOLEAN DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  stripeCustomerId VARCHAR(255) NOT NULL,
  stripeSubscriptionId VARCHAR(255) NOT NULL UNIQUE,
  planName VARCHAR(100) DEFAULT 'basic' NOT NULL,
  status ENUM('active','canceled','past_due','paused','trialing') DEFAULT 'active' NOT NULL,
  currentPeriodEnd TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY userId (userId),
  KEY stripeCustomerId (stripeCustomerId),
  KEY stripeSubscriptionId (stripeSubscriptionId)
);
```

## Cloud SQL Instance Details

- **Instance**: `intellimix`
- **Host**: `34.59.2.8`
- **Port**: `3306`
- **Database**: `intellimix`
- **User**: `root`
- **Password**: See `DATABASE_URL` secret in Secret Manager

## Verification

After creating tables, test the login endpoint:

```bash
curl -X POST "https://intellimix-176297454384.europe-west1.run.app/api/trpc/auth.login?batch=1" \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"test@example.com"}}}'
```

Expected response (no more "table doesn't exist" error):
```json
[{"error":{"json":{"message":"User not found"}}}]
```

This means tables exist but user doesn't, which is the correct behavior!

## Next Steps

1. Run the SQL to create tables (via GCP Console)
2. Test login endpoint to verify
3. Ready to use the app!
