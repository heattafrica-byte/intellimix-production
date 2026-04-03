import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import mysql from "mysql2/promise";

export const debugRouter = router({
  // Test database connectivity with native mysql2
  testDbConnection: publicProcedure.query(async () => {
    try {
      console.log("[Debug] Testing database connection...");
      const db = await getDb();
      
      if (!db) {
        console.error("[Debug] ✗ Database not initialized");
        return { status: "error", message: "Database not initialized" };
      }
      
      console.log("[Debug] ✓ Database initialized");
      
      // Get connection URL from environment
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return { status: "error", message: "DATABASE_URL not set" };
      }
      
      // Parse URL
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = parseInt(url.port || "3306");
      const user = url.username;
      const password = decodeURIComponent(url.password);
      const database = url.pathname.slice(1);
      
      console.log("[Debug] Connection params:", { host, port, user, database });
      
      // Try direct mysql2 connection
      console.log("[Debug] Testing direct MySQL2 connection...");
      let connection;
      try {
        connection = await mysql.createConnection({
          host,
          port,
          user,
          password,
          database,
          connectTimeout: 10000,
        });
        console.log("[Debug] ✓ MySQL2 connection successful");
      } catch (connError) {
        const msg = connError instanceof Error ? connError.message : String(connError);
        console.error("[Debug] ✗ MySQL2 connection failed:", msg);
        return { 
          status: "error", 
          message: "MySQL2 connection failed: " + msg,
          errorCode: (connError as any)?.code,
          errno: (connError as any)?.errno
        };
      }
      
      // Try a simple query
      console.log("[Debug] Executing test query...");
      try {
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM users");
        console.log("[Debug] ✓ Query succeeded, count:", (rows as any[])[0].count);
        await connection.end();
        return { 
          status: "success", 
          message: "Database connection working",
          userCount: (rows as any[])[0].count
        };
      } catch (queryError) {
        const msg = queryError instanceof Error ? queryError.message : String(queryError);
        console.error("[Debug] ✗ Query failed:", msg);
        await connection.end();
        return { 
          status: "error", 
          message: "Query failed: " + msg,
          errorCode: (queryError as any)?.code,
          errno: (queryError as any)?.errno
        };
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Debug] ✗ Test failed:", message);
      return { 
        status: "error", 
        message: message,
        errorCode: (error as any)?.code || "UNKNOWN"
      };
    }
  }),
});
