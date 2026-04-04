import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pipelineRouter } from "./routers/pipeline";
import { aiRouter } from "./routers/ai";
import { paymentRouter } from "./routers/payment";
import { debugRouter } from "./routers/debug";
import { initRouter } from "./routers/init";
import * as db from "./db";
import { createSessionToken, verifyIdToken } from "./_core/firebase";

export const appRouter = router({
  system: systemRouter,
  debug: debugRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    login: publicProcedure
      .input(z.object({
        idToken: z.string(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { idToken, plan } = input;
        
        try {
          const decodedToken = await verifyIdToken(idToken);
          const uid = decodedToken.uid;
          const email = decodedToken.email || null;
          const name = decodedToken.name || null;
          const provider = decodedToken.firebase?.sign_in_provider || "unknown";

          // Create or update user in database
          await db.upsertUser({
            openId: uid,
            name,
            email,
            loginMethod: provider,
            lastSignedIn: new Date(),
          });

          // Create session token
          const sessionToken = await createSessionToken(uid, {
            name: name || "",
          });

          // Set session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 });

          return { success: true, uid, email, name };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[Auth] Login failed:", message);
          throw new Error(`Login failed: ${message}`);
        }
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
  init: initRouter,
});

export type AppRouter = typeof appRouter;
