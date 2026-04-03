import { publicProcedure, router } from "../_core/trpc";

export const initRouter = router({
  health: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }),

  initializeSchema: publicProcedure.mutation(async () => {
    return {
      status: "success",
      message: "Init endpoint ready - use direct SQL client to create tables"
    };
  })
});
