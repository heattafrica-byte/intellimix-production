import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    console.log("[DB Init] Connecting to database...");
    console.log("[DB Init] Host:", connectionString.match(/@([^:]+)/)?.[1] || "unknown");
    
    const db = drizzle(connectionString);
    
    console.log("[DB Init] Running migrations...");
    const migrationsFolder = path.join(__dirname, "../drizzle");
    
    await migrate(db, { migrationsFolder });
    
    console.log("[DB Init] ✅ Database initialization complete");
    console.log("[DB Init] Schema is ready for use");
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DB Init] ❌ Failed to initialize database:", message);
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
