import { publicProcedure, router } from "../_core/trpc";
import { initializeDatabase } from "../_core/initDb";

export const initRouter = router({
  health: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }),

  initializeSchema: publicProcedure.mutation(async () => {
    console.log("[Init] User requested database initialization");
    const result = await initializeDatabase();
    return {
      status: result.success ? "success" : "error",
      ...result
    };
  })
});
