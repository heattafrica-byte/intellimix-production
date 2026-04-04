import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { setupStripeWebhooks } from "./stripeWebhooks";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Setup Stripe webhooks BEFORE body parser (needs raw body)
  setupStripeWebhooks(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Diagnostic endpoint to verify Firebase credentials are loaded
  app.get("/api/diagnostic/firebase", (req, res) => {
    try {
      const keyJson = process.env.FIREBASE_ADMIN_KEY;
      if (!keyJson) {
        return res.status(500).json({ 
          error: "FIREBASE_ADMIN_KEY not set",
          status: "CRITICAL"
        });
      }
      
      const creds = JSON.parse(keyJson);
      return res.status(200).json({
        status: "OK",
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        hasPrivateKey: !!creds.private_key,
        privateKeyLength: creds.private_key?.length || 0,
        privateKeyType: creds.private_key?.includes("RSA") ? "RSA" : "PKCS8"
      });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        status: "ERROR"
      });
    }
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
