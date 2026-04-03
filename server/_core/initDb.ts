import { createConnection } from "mysql2/promise";

/**
 * Initialize database schema
 * Safely creates tables based on schema definitions
 */
export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("[DB Init] DATABASE_URL not set - skipping initialization");
    return { success: false, reason: "DATABASE_URL not set" };
  }

  let connection;
  try {
    console.log("[DB Init] Starting database initialization...");
    
    // Parse DATABASE_URL: mysql://user:password@host:port/database
    const url = new URL(process.env.DATABASE_URL);
    const config = {
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    };

    connection = await createConnection(config);
    console.log("[DB Init] ✓ Database connection established");
    
    // Define table creation statements - MUST match drizzle/schema.ts exactly
    const tableDefinitions = {
      users: `
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
          lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_email (email),
          INDEX idx_openId (openId)
        )
      `,
      pipeline_sessions: `
        CREATE TABLE IF NOT EXISTS pipeline_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          genre VARCHAR(100) NOT NULL,
          subGenre VARCHAR(100),
          targetLufs FLOAT NOT NULL DEFAULT -14,
          targetSampleRate INT NOT NULL DEFAULT 44100,
          targetBitDepth INT NOT NULL DEFAULT 24,
          status ENUM('uploading','analysing','processing','mastering','complete','error') NOT NULL DEFAULT 'uploading',
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
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_userId (userId)
        )
      `,
      stems: `
        CREATE TABLE IF NOT EXISTS stems (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sessionId INT NOT NULL,
          userId INT NOT NULL,
          originalName VARCHAR(255) NOT NULL,
          fileUrl TEXT NOT NULL,
          fileKey VARCHAR(512) NOT NULL,
          fileSizeBytes INT NOT NULL DEFAULT 0,
          mimeType VARCHAR(100) NOT NULL,
          \`order\` INT NOT NULL DEFAULT 0,
          stemType VARCHAR(100),
          stemCategory VARCHAR(50),
          processingParams JSON,
          processingStatus ENUM('pending','processing','complete','error') NOT NULL DEFAULT 'pending',
          processingError TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_sessionId (sessionId),
          INDEX idx_userId (userId)
        )
      `,
      projects: `
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
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_userId (userId)
        )
      `,
      tracks: `
        CREATE TABLE IF NOT EXISTS tracks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(20) DEFAULT '#6366f1',
          \`order\` INT DEFAULT 0,
          volume FLOAT DEFAULT 1,
          pan FLOAT DEFAULT 0,
          muted BOOLEAN DEFAULT false,
          soloed BOOLEAN DEFAULT false,
          audioFileUrl TEXT,
          audioFileKey VARCHAR(512),
          audioFileName VARCHAR(255),
          audioDuration FLOAT DEFAULT 0,
          waveformData JSON,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_projectId (projectId)
        )
      `,
      track_effects: `
        CREATE TABLE IF NOT EXISTS track_effects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          trackId INT NOT NULL,
          effectType VARCHAR(50) NOT NULL,
          params JSON,
          enabled BOOLEAN DEFAULT true,
          \`order\` INT DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_trackId (trackId)
        )
      `,
      automation_lanes: `
        CREATE TABLE IF NOT EXISTS automation_lanes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          trackId INT NOT NULL,
          parameter VARCHAR(100) NOT NULL,
          points JSON,
          enabled BOOLEAN DEFAULT true,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_trackId (trackId)
        )
      `,
      subscriptions: `
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          stripeCustomerId VARCHAR(255) NOT NULL,
          stripeSubscriptionId VARCHAR(255) NOT NULL UNIQUE,
          planName VARCHAR(100) NOT NULL DEFAULT 'basic',
          status ENUM('active','canceled','past_due','paused','trialing') NOT NULL DEFAULT 'active',
          currentPeriodEnd TIMESTAMP NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_userId (userId),
          INDEX idx_stripeSubscriptionId (stripeSubscriptionId)
        )
      `
    };

    let createdCount = 0;
    let existingCount = 0;

    // Create all tables
    for (const [tableName, createSql] of Object.entries(tableDefinitions)) {
      try {
        await connection.execute(createSql);
        createdCount++;
        console.log(`[DB Init] ✓ ${tableName}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("already exists")) {
          existingCount++;
        } else {
          console.error(`[DB Init] ✗ ${tableName}:`, errorMsg);
        }
      }
    }

    await connection.end();
    console.log(`[DB Init] ✓ Complete: ${createdCount} created, ${existingCount} already exist`);
    return {
      success: true,
      created: createdCount,
      existing: existingCount
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DB Init] ✗ Failed:", message);
    if (connection) {
      await connection.end().catch(() => {});
    }
    return {
      success: false,
      error: message
    };
  }
}
