import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ── Auth helpers ──────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "intellimix-test-user",
    email: "test@intellimix.ai",
    name: "Test Engineer",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── Auth tests ────────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("returns current user for authenticated me query", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.email).toBe("test@intellimix.ai");
    expect(user?.name).toBe("Test Engineer");
  });

  it("returns null for unauthenticated me query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ── Pipeline config tests ─────────────────────────────────────────────────────
describe("pipeline.getConfig", () => {
  it("returns genres and LUFS presets", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.pipeline.getConfig();
    expect(config.genres).toBeInstanceOf(Array);
    expect(config.genres.length).toBeGreaterThan(0);
    expect(config.lufsPresets).toBeInstanceOf(Array);
    expect(config.lufsPresets.length).toBeGreaterThan(0);
  });

  it("contains expected platform presets", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.pipeline.getConfig();
    const spotify = config.lufsPresets.find((p) => p.label === "Spotify");
    expect(spotify).toBeDefined();
    expect(spotify?.value).toBe(-14);
    const club = config.lufsPresets.find((p) => p.label === "Club / DJ");
    expect(club?.value).toBe(-9);
  });

  it("includes Hip-Hop and Electronic genres", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.pipeline.getConfig();
    const hasHipHop = config.genres.some((g) => g.includes("Hip-Hop"));
    const hasElectronic = config.genres.some((g) => g.includes("Electronic"));
    expect(hasHipHop).toBe(true);
    expect(hasElectronic).toBe(true);
  });
});

// ── Pipeline session creation (DB-gated) ──────────────────────────────────────
describe("pipeline.createSession", () => {
  it("throws UNAUTHORIZED for unauthenticated caller", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pipeline.createSession({
        name: "Test Session",
        genre: "Hip-Hop / Trap",
        targetLufs: -14,
      }),
    ).rejects.toThrow();
  });

  it("validates LUFS range — rejects out-of-range values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Too loud
    await expect(
      caller.pipeline.createSession({
        name: "Test",
        genre: "Pop",
        targetLufs: -3, // above max -6
      }),
    ).rejects.toThrow();
    // Too quiet
    await expect(
      caller.pipeline.createSession({
        name: "Test",
        genre: "Pop",
        targetLufs: -35, // below min -30
      }),
    ).rejects.toThrow();
  });
});

// ── Pipeline listSessions (DB-gated) ──────────────────────────────────────────
describe("pipeline.listSessions", () => {
  it("throws UNAUTHORIZED for unauthenticated caller", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.pipeline.listSessions()).rejects.toThrow();
  });
});

// ── AI router tests ───────────────────────────────────────────────────────────
describe("ai.chat", () => {
  it("validates that message is required", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.chat({ message: "" }), // empty string should fail zod min(1)
    ).rejects.toThrow();
  });
});

describe("ai.getGenreRecommendations", () => {
  it("validates that genre is required", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.getGenreRecommendations({ genre: "" }), // empty string fails min(1)
    ).rejects.toThrow();
  });
});
