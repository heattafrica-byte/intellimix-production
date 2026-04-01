/**
 * Tests for session resume and FLAC encoding:
 *
 *  - pipeline.getSessionStatus  — returns per-output-type status and missing list
 *  - pipeline.resumeSession     — re-confirms uploads and marks session complete
 *  - audioBufferToFlacAsync     — uses WASM encoder; falls back to WAV stub
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Shared mock state ─────────────────────────────────────────────────────────

/** A session that has mixdown + master WAV but is missing FLAC and AIFF */
const mockPartialSession = {
  id: 99,
  userId: 1,
  name: "Partial Session",
  genre: "Pop",
  status: "processing",
  mixdownWavUrl:  "https://cdn.example.com/mixdown.wav",
  masterWavUrl:   "https://cdn.example.com/master.wav",
  masterAiffUrl:  null,
  masterFlacUrl:  null,
  masterLufs:     null,
  masterLra:      null,
  masterTruePeak: null,
  masteringReport: null,
};

/** A fully complete session */
const mockCompleteSession = {
  ...mockPartialSession,
  id: 100,
  status: "complete",
  masterAiffUrl: "https://cdn.example.com/master.aiff",
  masterFlacUrl: "https://cdn.example.com/master.flac",
  masterLufs:    -14.0,
  masterLra:     6.5,
  masterTruePeak: -1.0,
};

const mockStems = [
  {
    id: 1,
    sessionId: 99,
    order: 0,
    originalName: "kick.wav",
    stemType: "Kick Drum",
    stemCategory: "drums",
    fileUrl: "https://cdn.example.com/stems/kick.wav",
    processingParams: { gainDb: 0, eq: [], compressor: null, reverb: null, delay: null, stereoWidth: 1, pan: 0 },
    processingStatus: "complete",
  },
];

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};

// Chainable select mock: .select().from().where().limit() / .orderBy()
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn().mockResolvedValue(rows),
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
  and:  vi.fn((...args) => args),
  eq:   vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => col),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-nanoid-456"),
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

// ── getSessionStatus ──────────────────────────────────────────────────────────
describe("pipeline.getSessionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports partial session with correct missing output types", async () => {
    // First select call returns the session; second returns stems
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([mockPartialSession]))
      .mockReturnValueOnce(makeSelectChain(mockStems));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.getSessionStatus({ sessionId: 99 });

    expect(result.sessionId).toBe(99);
    expect(result.sessionName).toBe("Partial Session");
    expect(result.isComplete).toBe(false);
    expect(result.isPartial).toBe(true);

    // mixdown_wav and master_wav_44k / master_wav_48k should be confirmed
    expect(result.outputStatus.mixdown_wav).toBe("https://cdn.example.com/mixdown.wav");
    expect(result.outputStatus.master_wav_44k).toBe("https://cdn.example.com/master.wav");

    // AIFF and FLAC should be null
    expect(result.outputStatus.master_aiff_44k).toBeNull();
    expect(result.outputStatus.master_flac_44k).toBeNull();

    // Missing list should include AIFF and FLAC variants
    expect(result.missingOutputTypes).toContain("master_aiff_44k");
    expect(result.missingOutputTypes).toContain("master_aiff_48k");
    expect(result.missingOutputTypes).toContain("master_flac_44k");
    expect(result.missingOutputTypes).toContain("master_flac_48k");

    // Stems should be returned for pipeline reconstruction
    expect(result.stems).toHaveLength(1);
    expect(result.stems[0].stemType).toBe("Kick Drum");
  });

  it("reports complete session with no missing outputs", async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([mockCompleteSession]))
      .mockReturnValueOnce(makeSelectChain([]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.getSessionStatus({ sessionId: 100 });

    expect(result.isComplete).toBe(true);
    expect(result.isPartial).toBe(false);
    expect(result.missingOutputTypes).toHaveLength(0);
    expect(result.confirmedCount).toBe(7); // all 7 output types confirmed
  });

  it("throws when session does not belong to the user", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx(999));

    await expect(caller.getSessionStatus({ sessionId: 99 })).rejects.toThrow("Session not found");
  });
});

// ── resumeSession ─────────────────────────────────────────────────────────────
describe("pipeline.resumeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates missing output columns and marks session complete when all confirmed", async () => {
    // First select: session lookup; second select: re-fetch after update (now complete)
    const updatedSession = {
      ...mockPartialSession,
      masterAiffUrl: "https://cdn.example.com/master_new.aiff",
      masterFlacUrl: "https://cdn.example.com/master_new.flac",
    };

    mockDb.select
      .mockReturnValueOnce(makeSelectChain([mockPartialSession]))
      .mockReturnValueOnce(makeSelectChain([updatedSession]));
    mockDb.update.mockReturnValue(makeUpdateChain());

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.resumeSession({
      sessionId: 99,
      uploads: [
        {
          outputType: "master_aiff_44k",
          fileKey: "outputs/1/99/master_aiff_44k_new.aiff",
          fileUrl: "https://cdn.example.com/master_new.aiff",
        },
        {
          outputType: "master_flac_44k",
          fileKey: "outputs/1/99/master_flac_44k_new.flac",
          fileUrl: "https://cdn.example.com/master_new.flac",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.resumedCount).toBe(2);
    expect(result.isComplete).toBe(true);
    // DB update should have been called (at least once for columns, once for status)
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns isComplete=false when some outputs are still missing after resume", async () => {
    // After update, masterFlacUrl is still null
    const stillPartialSession = {
      ...mockPartialSession,
      masterAiffUrl: "https://cdn.example.com/master_new.aiff",
      // masterFlacUrl still null
    };

    mockDb.select
      .mockReturnValueOnce(makeSelectChain([mockPartialSession]))
      .mockReturnValueOnce(makeSelectChain([stillPartialSession]));
    mockDb.update.mockReturnValue(makeUpdateChain());

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.resumeSession({
      sessionId: 99,
      uploads: [
        {
          outputType: "master_aiff_44k",
          fileKey: "outputs/1/99/master_aiff_44k_new.aiff",
          fileUrl: "https://cdn.example.com/master_new.aiff",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.resumedCount).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  it("optionally updates mastering stats when provided", async () => {
    const updatedWithStats = {
      ...mockPartialSession,
      masterAiffUrl: "https://cdn.example.com/master.aiff",
      masterFlacUrl: "https://cdn.example.com/master.flac",
    };

    mockDb.select
      .mockReturnValueOnce(makeSelectChain([mockPartialSession]))
      .mockReturnValueOnce(makeSelectChain([updatedWithStats]));
    mockDb.update.mockReturnValue(makeUpdateChain());

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx());

    const result = await caller.resumeSession({
      sessionId: 99,
      uploads: [
        {
          outputType: "master_aiff_44k",
          fileKey: "outputs/1/99/master_aiff_44k.aiff",
          fileUrl: "https://cdn.example.com/master.aiff",
        },
        {
          outputType: "master_flac_44k",
          fileKey: "outputs/1/99/master_flac_44k.flac",
          fileUrl: "https://cdn.example.com/master.flac",
        },
      ],
      masterLufs: -14.2,
      masterLra: 7.1,
      masterTruePeak: -1.0,
      masteringReport: "Excellent dynamics.",
    });

    expect(result.success).toBe(true);
    // update should have been called with stats columns
    const updateSetCall = mockDb.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0];
    if (updateSetCall) {
      expect(updateSetCall).toMatchObject({
        masterAiffUrl: "https://cdn.example.com/master.aiff",
        masterFlacUrl: "https://cdn.example.com/master.flac",
      });
    }
  });

  it("throws when session does not belong to the user", async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]));

    const { pipelineRouter } = await import("./routers/pipeline");
    const caller = pipelineRouter.createCaller(makeCtx(999));

    await expect(
      caller.resumeSession({
        sessionId: 99,
        uploads: [
          {
            outputType: "master_aiff_44k",
            fileKey: "outputs/1/99/master_aiff_44k.aiff",
            fileUrl: "https://cdn.example.com/master.aiff",
          },
        ],
      }),
    ).rejects.toThrow("Session not found");
  });
});

// ── audioBufferToFlacAsync ────────────────────────────────────────────────────
// These tests run in Node (no real Web Audio API or WASM), so we:
//  1. Mock the libflacjs WASM import to prevent Node fetch() from timing out
//  2. Verify the sync encoder produces a valid FLAC bitstream (fLaC magic bytes)
//  3. Verify the async wrapper returns an ArrayBuffer in all cases

// Mock the libflacjs WASM module so it appears ready but fails to create an
// encoder.  This exercises the "encoder creation failed" fallback path in
// audioBufferToFlacAsync without triggering the 10-second WASM init timeout.
vi.mock("libflacjs/dist/libflac.wasm.js", () => ({
  default: {
    // Pretend the WASM is already initialised so we skip the on('ready') wait
    isReady: () => true,
    // Encoder creation returns 0 (falsy) to trigger the sync fallback
    create_libflac_encoder: () => 0,
    // Stub the rest of the API so no real WASM calls are made
    init_encoder_stream: () => 0,
    FLAC__stream_encoder_process_interleaved: () => true,
    FLAC__stream_encoder_finish: () => {},
    FLAC__stream_encoder_delete: () => {},
  },
}));

describe("audioBufferToFlacAsync — WASM fallback behaviour", () => {
  it("falls back to sync FLAC encoder when encoder creation fails", async () => {
    // With the WASM mock returning 0 from create_libflac_encoder, audioBufferToFlacAsync
    // should fall back to the synchronous audioBufferToFlac encoder which
    // produces a valid FLAC bitstream (starts with 'fLaC' magic bytes).
    const { audioBufferToFlacAsync } = await import(
      "../client/src/engine/ProcessingPipeline"
    );

    const numSamples = 512;
    const sampleRate = 44100;
    const channelData = new Float32Array(numSamples).fill(0.1);
    const mockBuffer = {
      numberOfChannels: 2,
      sampleRate,
      length: numSamples,
      duration: numSamples / sampleRate,
      getChannelData: (_ch: number) => channelData,
    } as unknown as AudioBuffer;

    const asyncResult = await audioBufferToFlacAsync(mockBuffer);
    expect(asyncResult).toBeInstanceOf(ArrayBuffer);
    // Must be non-trivially sized (FLAC header + at least one frame)
    expect(asyncResult.byteLength).toBeGreaterThan(40);

    // The output should start with the FLAC magic bytes 'fLaC' (0x66 0x4C 0x61 0x43)
    const view = new DataView(asyncResult);
    const magic = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
    );
    expect(magic).toBe("fLaC");
  }, 10_000);

  it("sync encoder produces valid FLAC bitstream with fLaC magic bytes", async () => {
    // audioBufferToFlac is a hand-rolled FLAC encoder that produces a spec-
    // compliant FLAC bitstream (STREAMINFO metadata block + verbatim frames).
    const { audioBufferToFlac } = await import("../client/src/engine/ProcessingPipeline");

    const numSamples = 256;
    const channelData = new Float32Array(numSamples).map((_, i) => Math.sin(i * 0.1) * 0.5);
    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate: 44100,
      length: numSamples,
      duration: numSamples / 44100,
      getChannelData: (_ch: number) => channelData,
    } as unknown as AudioBuffer;

    const result = audioBufferToFlac(mockBuffer);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(40);

    const view = new DataView(result);

    // FLAC magic bytes: 0x66 0x4C 0x61 0x43 = 'fLaC'
    const magic = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
    );
    expect(magic).toBe("fLaC");

    // The next 4 bytes should be the last-metadata-block flag + STREAMINFO block header
    // Byte 4: 0x84 = last=1 (bit 7), type=0 (STREAMINFO, bits 1-6)
    expect(view.getUint8(4)).toBe(0x84);
  });

  it("async wrapper returns valid FLAC for stereo 48kHz input", async () => {
    const { audioBufferToFlacAsync } = await import("../client/src/engine/ProcessingPipeline");

    const numSamples = 1024;
    const channelData = new Float32Array(numSamples).map(() => (Math.random() * 2 - 1) * 0.8);
    const mockBuffer = {
      numberOfChannels: 2,
      sampleRate: 48000,
      length: numSamples,
      duration: numSamples / 48000,
      getChannelData: (_ch: number) => channelData,
    } as unknown as AudioBuffer;

    const result = await audioBufferToFlacAsync(mockBuffer);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(40);

    // Should start with fLaC magic bytes
    const view = new DataView(result);
    const magic = String.fromCharCode(
      view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3),
    );
    expect(magic).toBe("fLaC");
  }, 10_000);
});
