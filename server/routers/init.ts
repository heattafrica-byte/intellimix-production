import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import mysql from "mysql2/promise";

export const initRouter = router({
  initializeSchema: publicProcedure.mutation(async () => {
    if (!process.env.DATABASE_URL) {
      return { 
        status: "error", 
        message: "DATABASE_URL not configured" 
      };
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    try {
      console.log("[Init] ✓ Database connection established");

      // Create each table individually
      const tables = [
        {
          name: "users",
          sql: `CREATE TABLE IF NOT EXISTS users (
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
          )`
        },
        {
          name: "pipeline_sessions",
          sql: `CREATE TABLE IF NOT EXISTS pipeline_sessions (
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
          )`
        },
        {
          name: "projects",
          sql: `CREATE TABLE IF NOT EXISTS projects (
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
          )`
        },
        {
          name: "stems",
          sql: `CREATE TABLE IF NOT EXISTS stems (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sessionId INT NOT NULL,
            userId INT NOT NULL,
            originalName VARCHAR(255) NOT NULL,
            fileUrl TEXT NOT NULL,
            fileKey VARCHAR(512) NOT NULL,
            fileSizeBytes INT DEFAULT 0 NOT NULL,
            mimeType VARCHAR(100) NOT NULL,
            \`order\` INT DEFAULT 0 NOT NULL,
            stemType VARCHAR(100),
            stemCategory VARCHAR(50),
            processingParams JSON,
            processingStatus ENUM('pending','processing','complete','error') DEFAULT 'pending' NOT NULL,
            processingError TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )`
        },
        {
          name: "tracks",
          sql: `CREATE TABLE IF NOT EXISTS tracks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            projectId INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(20) DEFAULT '#6366f1',
            \`order\` INT DEFAULT 0,
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
          )`
        },
        {
          name: "track_effects",
          sql: `CREATE TABLE IF NOT EXISTS track_effects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            trackId INT NOT NULL,
            effectType VARCHAR(50) NOT NULL,
            params JSON,
            enabled BOOLEAN DEFAULT 1,
            \`order\` INT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )`
        },
        {
          name: "automation_lanes",
          sql: `CREATE TABLE IF NOT EXISTS automation_lanes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            trackId INT NOT NULL,
            parameter VARCHAR(100) NOT NULL,
            points JSON,
            enabled BOOLEAN DEFAULT 1,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )`
        },
        {
          name: "subscriptions",
          sql: `CREATE TABLE IF NOT EXISTS subscriptions (
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
          )`
        }
      ];

      for (const table of tables) {
        try {
          console.log(`[Init] Creating table: ${table.name}...`);
          await connection.execute(table.sql);
          console.log(`[Init] ✓ Table ${table.name} created`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes("already exists")) {
            console.log(`[Init] ℹ Table ${table.name} already exists`);
          } else {
            throw error;
          }
        }
      }

      return {
        status: "success",
        message: "Database schema initialized successfully - all 8 tables created"
      };
    } catch (error) {
      console.error("[Init] Error:", error);
      return {
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      await connection.end();
    }
  })
});
