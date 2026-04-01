/**
 * Tests for the direct-upload pipeline mutations:
 *  - getUploadCredentials: verifies session ownership and returns upload URL + auth token
 *  - confirmUpload: verifies session ownership and returns the confirmed URL
 *
 * These tests use in-memory mocks so no real DB or storage calls are made.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Shared mock state ─────────────────────────────────────────────────────────
const mockSession = {
  id: 42,
  userId: 1,
  name: "Test Session",
  genre: "Pop",
  status: "processing",
};

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};

// Chainable select mock: .select().from().where().limit()
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

// Chainable update mock: .update().set().where()
function makeUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return chain;
}

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  pipelineSessions: {},
  stems: {},
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => args),
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => col),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid-123"),
}));

vi.mock("../server/_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://api.example.com",
    forgeApiKey: "test-api-key-secret",
    ownerOpenId: "",
    isProduction: false,
  },
}));

// ── Helper to create a test context ──────────────────────────────────────────
function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("pipeline.getUploadCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns uploadUrl, fileKey, and authToken for a valid session", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([mockSession]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.getUploadCredentials({
      sessionId: 42,
      outputType: "master_wav_48k",
      filename: "master_48k_24bit.wav",
      mimeType: "audio/wav",
    });

    expect(result.uploadUrl).toContain("/v1/storage/upload");
    // URL encodes the path in the query string
    expect(result.uploadUrl).toContain(encodeURIComponent("outputs/1/42/master_wav_48k_test-nanoid-123.wav"));
    expect(result.fileKey).toBe("outputs/1/42/master_wav_48k_test-nanoid-123.wav");
    expect(result.authToken).toBe("test-api-key-secret");
    expect(result.outputType).toBe("master_wav_48k");
  });

  it("throws when session does not belong to the user", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([])); // no session found

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx(999)); // different user

    await expect(
      caller.getUploadCredentials({
        sessionId: 42,
        outputType: "mixdown_wav",
        filename: "mixdown.wav",
        mimeType: "audio/wav",
      }),
    ).rejects.toThrow("Session not found");
  });

  it("generates unique file keys for FLAC outputs", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([mockSession]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.getUploadCredentials({
      sessionId: 42,
      outputType: "master_flac_44k",
      filename: "master_44k_32bit.flac",
      mimeType: "audio/x-flac",
    });

    expect(result.fileKey).toContain("master_flac_44k_");
    expect(result.fileKey).toMatch(/\.flac$/);
  });

  it("generates correct file key for AIFF outputs", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([mockSession]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.getUploadCredentials({
      sessionId: 42,
      outputType: "master_aiff_44k",
      filename: "master_44k_24bit.aiff",
      mimeType: "audio/aiff",
    });

    expect(result.fileKey).toContain("master_aiff_44k_");
    expect(result.fileKey).toMatch(/\.aiff$/);
  });
});

describe("pipeline.confirmUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the DB and returns the confirmed URL", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([mockSession]));
    mockDb.update.mockReturnValue(makeUpdateChain());

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.confirmUpload({
      sessionId: 42,
      outputType: "master_wav_48k",
      fileKey: "outputs/1/42/master_wav_48k_test.wav",
      fileUrl: "https://cdn.example.com/outputs/1/42/master_wav_48k_test.wav",
    });

    expect(result.url).toBe("https://cdn.example.com/outputs/1/42/master_wav_48k_test.wav");
    expect(result.fileKey).toBe("outputs/1/42/master_wav_48k_test.wav");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("throws when session does not belong to the user", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx(999));

    await expect(
      caller.confirmUpload({
        sessionId: 42,
        outputType: "mixdown_wav",
        fileKey: "outputs/1/42/mixdown.wav",
        fileUrl: "https://cdn.example.com/outputs/1/42/mixdown.wav",
      }),
    ).rejects.toThrow("Session not found");
  });
});
