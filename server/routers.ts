import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { pipelineRouter } from "./routers/pipeline";
import { aiRouter } from "./routers/ai";
import { paymentRouter } from "./routers/payment";
import { z } from "zod";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    signup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        
        // Check if user exists
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (existing.length > 0) {
          throw new Error("User already exists");
        }
        
        // Create new user
        const openId = nanoid();
        const result = await db.insert(users).values({
          openId,
          email: input.email,
          name: input.name,
          loginMethod: "email",
          role: "user",
        });
        
        const userId = typeof (result as any)?.insertId === "bigint" 
          ? Number((result as any).insertId) 
          : Number((result as any)?.insertId ?? 0);
        
        // Create session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, openId, { ...cookieOptions, httpOnly: true });
        
        return { id: userId, email: input.email, name: input.name };
      }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        
        // Find user by email
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        
        if (existing.length === 0) {
          throw new Error("User not found");
        }
        
        const user = existing[0];
        
        // Create session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.openId, { ...cookieOptions, httpOnly: true });
        
        return { id: user.id, email: user.email, name: user.name };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  pipeline: pipelineRouter,
  ai: aiRouter,
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
