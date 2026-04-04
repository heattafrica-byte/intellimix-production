import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { verifyIdToken, createSessionToken } from "./firebase";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Firebase OAuth callback handler
 * Expects Firebase ID token in query param or body
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const idToken = getQueryParam(req, "idToken") || getQueryParam(req, "token");

    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    try {
      // Verify Firebase ID token
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
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to home
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Firebase callback failed", error);
      res.status(401).json({ error: "OAuth callback failed" });
    }
  });

  /**
   * POST endpoint for token verification (for SPA/mobile clients)
   */
  app.post("/api/oauth/verify", async (req: Request, res: Response) => {
    const { idToken } = req.body;

    console.log(`[OAuth] Received request body keys: ${Object.keys(req.body).join(', ')}`);
    console.log(`[OAuth] idToken type: ${typeof idToken}, value exists: ${!!idToken}`);

    if (!idToken) {
      console.error("[OAuth] idToken missing from request body");
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    try {
      console.log(`[OAuth] Verifying token (length: ${idToken.length})...`);
      // Verify Firebase ID token
      const decodedToken = await verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email || null;
      const name = decodedToken.name || null;
      const provider = decodedToken.firebase?.sign_in_provider || "unknown";

      console.log(`[OAuth] Token verified for user: ${uid} (${provider})`);

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
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[OAuth] Session created for user: ${uid}`);
      res.json({ success: true, sessionToken, uid, email, name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Token verification failed:", errorMessage);
      console.error("[OAuth] Full error:", error);
      res.status(401).json({ 
        error: "Token verification failed",
        details: errorMessage,
      });
    }
  });
}
