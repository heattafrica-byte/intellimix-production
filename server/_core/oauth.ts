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
   * Verifies Firebase ID token and creates session
   */
  app.post("/api/oauth/verify", async (req: Request, res: Response) => {
    try {
      const { idToken, plan } = req.body;

      console.log(`[OAuth] ========== Token Verification Request ==========`);
      console.log(`[OAuth] Request body keys: ${Object.keys(req.body).join(', ')}`);
      console.log(`[OAuth] idToken present: ${!!idToken}`);
      console.log(`[OAuth] idToken type: ${typeof idToken}`);
      if (idToken) {
        const token = String(idToken).trim();
        const parts = token.split('.');
        console.log(`[OAuth] Token structure: ${parts.length} parts`);
        console.log(`[OAuth] Part lengths: [${parts.map(p => p.length).join(', ')}]`);
        console.log(`[OAuth] Token starts with: ${token.substring(0, 50)}...`);
      }
      console.log(`[OAuth] Plan: ${plan || 'none'}`);
      console.log(`[OAuth] ====================================================`);

      if (!idToken) {
        console.error("[OAuth] ❌ idToken missing from request body");
        res.status(400).json({ 
          error: "idToken is required",
          details: "No Firebase ID token provided in request body"
        });
        return;
      }

      if (typeof idToken !== 'string') {
        console.error(`[OAuth] ❌ idToken is not a string: ${typeof idToken}`);
        res.status(400).json({
          error: "Invalid idToken format",
          details: `idToken must be a string, received ${typeof idToken}`
        });
        return;
      }

      if (idToken.trim().length === 0) {
        console.error("[OAuth] ❌ idToken is empty string");
        res.status(400).json({
          error: "idToken cannot be empty",
          details: "Firebase ID token is empty"
        });
        return;
      }

      // Verify Firebase ID token
      const decodedToken = await verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email || null;
      const name = decodedToken.name || null;
      const provider = decodedToken.firebase?.sign_in_provider || "unknown";

      console.log(`[OAuth] ✅ Token verified for user: ${uid} (${provider}), email: ${email}`);

      // Create or update user in database
      try {
        await db.upsertUser({
          openId: uid,
          name,
          email,
          loginMethod: provider,
          lastSignedIn: new Date(),
        });
        console.log(`[OAuth] ✅ User upserted successfully: ${uid}`);
      } catch (dbError) {
        console.error("[OAuth] ❌ Database error during user upsert:", dbError);
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

      // Create session token
      const sessionToken = await createSessionToken(uid, {
        name: name || "",
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[OAuth] ✅ Session created for user: ${uid}`);
      res.status(200).json({ 
        success: true, 
        sessionToken, 
        uid, 
        email, 
        name 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] ❌ Token verification/session creation failed:", errorMessage);
      console.error("[OAuth] Full error:", error);
      
      // Return 401 for auth failures, 400 for client errors, 500 for server errors
      let statusCode = 500;
      if (errorMessage.includes("Invalid JWT format") || 
          errorMessage.includes("empty") ||
          errorMessage.includes("type")) {
        statusCode = 400; // Client error
      } else if (errorMessage.includes("Invalid token") || 
                 errorMessage.includes("Token") ||
                 errorMessage.includes("signature") ||
                 errorMessage.includes("Firebase")) {
        statusCode = 401; // Auth error
      }
      
      res.status(statusCode).json({ 
        error: "Authentication failed",
        details: errorMessage || "Unable to verify credentials",
      });
    }
  });

  /**
   * POST endpoint for token refresh
   * Takes a valid Firebase ID token and returns a new session token
   * This is used when the session is expiring but user is still authenticated
   */
  app.post("/api/oauth/refresh", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      console.log(`[OAuth Refresh] Received refresh request`);

      if (!idToken || typeof idToken !== 'string') {
        console.error("[OAuth Refresh] Invalid idToken");
        res.status(400).json({ 
          error: "idToken is required",
          details: "Valid Firebase ID token needed for refresh"
        });
        return;
      }

      // Verify the token is still valid
      const decodedToken = await verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const name = decodedToken.name || "";

      console.log(`[OAuth Refresh] Refreshing session for user: ${uid}`);

      // Create new session token
      const sessionToken = await createSessionToken(uid, { name });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log(`[OAuth Refresh] Session refreshed for user: ${uid}`);
      res.status(200).json({ 
        success: true, 
        sessionToken,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[OAuth Refresh] Failed:", errorMessage);
      
      res.status(401).json({ 
        error: "Token refresh failed",
        details: errorMessage,
      });
    }
  });
}
