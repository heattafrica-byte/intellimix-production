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
    
    // Define table creation statements
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
      projects: `
        CREATE TABLE IF NOT EXISTS projects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          openId VARCHAR(64) NOT NULL,
          projectName VARCHAR(255),
          description TEXT,
          isPublished BOOLEAN DEFAULT false NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_openId (openId)
        )
      `,
      pipeline_sessions: `
        CREATE TABLE IF NOT EXISTS pipeline_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT,
          projectId INT,
          sessionName VARCHAR(255),
          status VARCHAR(50),
          masterBusChain TEXT,
          conversionFormat VARCHAR(50),
          quality VARCHAR(50),
          targetLufs DECIMAL(5,2),
          analysisNotes TEXT,
          batchSize INT,
          processedStemsCount INT,
          failedStemsCount INT,
          totalProcessingTime INT,
          averageProcessingTimePerStem DECIMAL(8,2),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_userId (userId),
          INDEX idx_projectId (projectId)
        )
      `,
      stems: `
        CREATE TABLE IF NOT EXISTS stems (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sessionId INT,
          stemName VARCHAR(255),
          originalFileName VARCHAR(255),
          originalFileSize INT,
          stemType VARCHAR(50),
          stemIndex INT,
          bpm DECIMAL(8,2),
          keySignature VARCHAR(20),
          duration INT,
          analysisStatus VARCHAR(50),
          processingStatus VARCHAR(50),
          generatedFileName VARCHAR(255),
          s3Url TEXT,
          lufs DECIMAL(5,2),
          analysisNotes TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_sessionId (sessionId)
        )
      `,
      tracks: `
        CREATE TABLE IF NOT EXISTS tracks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sessionId INT,
          trackName VARCHAR(255),
          trackType VARCHAR(100),
          trackIndex INT,
          bassContent DECIMAL(3,1),
          midContent DECIMAL(3,1),
          trebleContent DECIMAL(3,1),
          dynamicRange DECIMAL(4,1),
          clarity DECIMAL(3,1),
          transientDensity DECIMAL(4,1),
          percussiveLevel DECIMAL(3,1),
          analysisNotes TEXT,
          eqRecommendations TEXT,
          compressionRecommendations TEXT,
          reverbRecommendations TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_sessionId (sessionId)
        )
      `,
      track_effects: `
        CREATE TABLE IF NOT EXISTS track_effects (
          id INT AUTO_INCREMENT PRIMARY KEY,
          trackId INT,
          effectType VARCHAR(100),
          effectName VARCHAR(255),
          parameters TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_trackId (trackId)
        )
      `,
      automation_lanes: `
        CREATE TABLE IF NOT EXISTS automation_lanes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          trackId INT,
          laneType VARCHAR(100),
          laneName VARCHAR(255),
          points TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_trackId (trackId)
        )
      `,
      subscriptions: `
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT,
          planName VARCHAR(100),
          stripeCustomerId VARCHAR(255),
          stripeSubscriptionId VARCHAR(255),
          stripeProductId VARCHAR(255),
          status VARCHAR(50),
          currentPeriodStart BIGINT,
          currentPeriodEnd BIGINT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_userId (userId),
          UNIQUE INDEX idx_stripeSubscriptionId (stripeSubscriptionId)
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
