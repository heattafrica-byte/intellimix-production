import { systemRouter } from "../_core/systemRouter";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const debugRouter = router({
  // Test database connectivity
  testDbConnection: publicProcedure.query(async () => {
    try {
      console.log("[Debug] Testing database connection...");
      const db = await getDb();
      
      if (!db) {
        console.error("[Debug] ✗ Database not initialized");
        return { status: "error", message: "Database not initialized" };
      }
      
      console.log("[Debug] ✓ Database initialized");
      
      // Try a simple query
      console.log("[Debug] Executing test query...");
      const result = await db
        .select()
        .from(users)
        .limit(1);
      
      console.log("[Debug] ✓ Query succeeded, returned:", result.length, "rows");
      return { 
        status: "success", 
        message: "Database connection working",
        rowsReturned: result.length
      };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Debug] ✗ Test failed:", message);
      return { 
        status: "error", 
        message: message,
        errorCode: (error as any)?.code || "UNKNOWN",
        errno: (error as any)?.errno || null
      };
    }
  }),
});
