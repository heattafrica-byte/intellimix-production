import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "../db";
import { pipelineSessions, stems } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

// ── Output type → DB column mapping ──────────────────────────────────────────
const OUTPUT_TYPE_TO_COLUMN = {
  mixdown_wav:     "mixdownWavUrl",
  master_wav_44k:  "masterWavUrl",
  master_wav_48k:  "masterWavUrl",
  master_aiff_44k: "masterAiffUrl",
  master_aiff_48k: "masterAiffUrl",
  master_flac_44k: "masterFlacUrl",
  master_flac_48k: "masterFlacUrl",
} as const;

export type OutputType = keyof typeof OUTPUT_TYPE_TO_COLUMN;

// All canonical output types the pipeline produces
const ALL_OUTPUT_TYPES: OutputType[] = [
  "mixdown_wav",
  "master_wav_44k",
  "master_wav_48k",
  "master_aiff_44k",
  "master_aiff_48k",
  "master_flac_44k",
  "master_flac_48k",
];

// ── Constants ─────────────────────────────────────────────────────────────────
const GENRES = [
  "Hip-Hop / Trap", "R&B / Soul", "Pop", "Electronic / EDM",
  "House / Deep House", "Techno / Industrial", "Drum & Bass / Jungle",
  "Dubstep / Bass Music", "Ambient / Downtempo", "Rock / Alternative",
  "Metal / Heavy", "Jazz / Blues", "Classical / Orchestral",
  "Country / Folk", "Reggae / Dancehall", "Latin / Afrobeats",
  "Gospel / Worship", "Cinematic / Soundtrack", "Lo-Fi / Chillhop",
  "Experimental / Avant-garde",
];

const LUFS_PRESETS = [
  { label: "Spotify", value: -14, icon: "🎵" },
  { label: "Apple Music", value: -16, icon: "🍎" },
  { label: "YouTube", value: -13, icon: "▶️" },
  { label: "Club / DJ", value: -9, icon: "🎧" },
  { label: "Broadcast", value: -23, icon: "📺" },
  { label: "CD / Download", value: -10, icon: "💿" },
];

// ── Stem type inference ───────────────────────────────────────────────────────
function inferStemType(filename: string): { type: string; category: string } {
  const n = filename.toLowerCase().replace(/[_\-\s\.]/g, " ");
  if (/kick|bd|bass drum|kd/.test(n)) return { type: "Kick Drum", category: "drums" };
  if (/snare|sd|snr/.test(n)) return { type: "Snare", category: "drums" };
  if (/hi.?hat|hh|hat|cymbal/.test(n)) return { type: "Hi-Hat", category: "drums" };
  if (/clap|clp/.test(n)) return { type: "Clap", category: "drums" };
  if (/tom|floor/.test(n)) return { type: "Tom", category: "drums" };
  if (/drum|loop|beat|perc/.test(n)) return { type: "Drum Loop", category: "drums" };
  if (/808|sub bass|subbass/.test(n)) return { type: "808 / Sub Bass", category: "bass" };
  if (/bass/.test(n)) return { type: "Bass", category: "bass" };
  if (/lead voc|main voc|vox lead/.test(n)) return { type: "Lead Vocal", category: "vocal" };
  if (/back voc|bv|bgv|harmony|ad lib/.test(n)) return { type: "Background Vocal", category: "vocal" };
  if (/voc|vocal|voice|vox|sing/.test(n)) return { type: "Vocal", category: "vocal" };
  if (/guitar|gtr/.test(n)) return { type: "Guitar", category: "melodic" };
  if (/piano|keys|keyboard/.test(n)) return { type: "Piano / Keys", category: "melodic" };
  if (/synth|analog|pad|chord|lead/.test(n)) return { type: "Synth / Keys", category: "melodic" };
  if (/string|violin|cello/.test(n)) return { type: "Strings", category: "melodic" };
  if (/brass|horn|trumpet|sax/.test(n)) return { type: "Brass", category: "melodic" };
  if (/fx|effect|sfx|riser|sweep/.test(n)) return { type: "FX", category: "fx" };
  return { type: "Audio Stem", category: "melodic" };
}

// ── Audio features schema ─────────────────────────────────────────────────────
const audioFeaturesSchema = z.object({
  stemIndex: z.number(),
  rmsDb: z.number(),
  peakDb: z.number(),
  crestFactorDb: z.number(),
  spectralCentroidHz: z.number(),
  spectralRolloff85Hz: z.number(),
  spectralFlatness: z.number(),
  dynamicRangeDb: z.number(),
  stereoWidth: z.number(),
  hasClipping: z.boolean(),
  isSilent: z.boolean(),
  durationSeconds: z.number(),
  channels: z.number(),
  sampleRate: z.number(),
});

// ── Router ────────────────────────────────────────────────────────────────────
export const pipelineRouter = router({
  // ── Create session ──────────────────────────────────────────────────────────
  createSession: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        genre: z.string(),
        subGenre: z.string().optional(),
        targetLufs: z.number().min(-30).max(-6),
        targetSampleRate: z.number().default(44100),
        targetBitDepth: z.number().default(24),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const result = await db.insert(pipelineSessions).values({
        userId: ctx.user?.id || 0, // Allow guest users with userId 0
        name: input.name,
        genre: input.genre,
        subGenre: input.subGenre,
        targetLufs: input.targetLufs,
        targetSampleRate: input.targetSampleRate,
        targetBitDepth: input.targetBitDepth,
        status: "uploading",
      });
      let insertId: unknown = (result as any)?.insertId;
      if (!insertId && Array.isArray(result)) {
        insertId = (result[0] as any)?.insertId;
      }
      const idNum = typeof insertId === "bigint" ? Number(insertId) : Number(insertId);
      if (!Number.isFinite(idNum)) throw new Error("Failed to create session: missing or invalid insertId");
      return { id: idNum };
    }),

  // ── Upload stem ─────────────────────────────────────────────────────────────
  uploadStem: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        originalName: z.string(),
        mimeType: z.string(),
        fileSizeBytes: z.number().max(100 * 1024 * 1024, "File must be under 100MB"),
        base64Data: z.string().max(200 * 1024 * 1024, "Encoded data exceeds size limit"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const userId = ctx.user?.id || 0;
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, userId),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");
      const ext = input.originalName.split(".").pop() ?? "wav";
      const fileKey = `stems/${userId}/${input.sessionId}/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const { type: stemType, category: stemCategory } = inferStemType(input.originalName);
      const insertResult = await db.insert(stems).values({
        sessionId: input.sessionId,
        userId: userId,
        originalName: input.originalName,
        fileUrl: url,
        fileKey,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        order: input.order,
        stemType,
        stemCategory,
        processingStatus: "pending",
      });
      const stemId =
        typeof (insertResult as any)?.insertId === "bigint"
          ? Number((insertResult as any).insertId)
          : Number((insertResult as any)?.insertId ?? 0);
      return { id: stemId, fileUrl: url, stemType, stemCategory };
    }),

  // ── Get upload credentials for direct S3 upload (bypasses proxy size limit) ─
  getUploadCredentials: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        outputType: z.enum([
          "mixdown_wav",
          "master_wav_44k",
          "master_wav_48k",
          "master_aiff_44k",
          "master_aiff_48k",
          "master_flac_44k",
          "master_flac_48k",
        ]),
        filename: z.string(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");

      const ext = input.filename.split(".").pop() ?? "wav";
      const fileKey = `outputs/${(ctx.user?.id || 0)}/${input.sessionId}/${input.outputType}_${nanoid()}.${ext}`;

      return {
        uploadUrl: `${ENV.forgeApiUrl.replace(/\/+$/, "")}/v1/storage/upload?path=${encodeURIComponent(fileKey)}`,
        fileKey,
        authToken: ENV.forgeApiKey,
        outputType: input.outputType,
      };
    }),

  // ── Confirm direct upload and update DB ────────────────────────────────────
  confirmUpload: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        outputType: z.enum([
          "mixdown_wav",
          "master_wav_44k",
          "master_wav_48k",
          "master_aiff_44k",
          "master_aiff_48k",
          "master_flac_44k",
          "master_flac_48k",
        ]),
        fileKey: z.string(),
        fileUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");

      const columnName = OUTPUT_TYPE_TO_COLUMN[input.outputType];
      await db
        .update(pipelineSessions)
        .set({ [columnName]: input.fileUrl })
        .where(eq(pipelineSessions.id, input.sessionId));

      return { url: input.fileUrl, fileKey: input.fileKey };
    }),

  // ── Get session output status (for resume detection) ───────────────────────
  /**
   * Returns the current confirmed-output status for a session.
   * Each output type is mapped to its DB column; a null value means the upload
   * never completed (or was never attempted) and needs to be retried.
   *
   * The client uses this to decide whether to show a "Resume" button and which
   * specific output types still need to be re-uploaded.
   */
  getSessionStatus: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");

      // Build a per-output-type status map.
      // Because multiple output types share a single DB column (e.g. both
      // master_wav_44k and master_wav_48k map to masterWavUrl), we report the
      // column's URL for both — the client interprets null as "missing".
      const outputStatus: Record<OutputType, string | null> = {
        mixdown_wav:     session.mixdownWavUrl ?? null,
        master_wav_44k:  session.masterWavUrl  ?? null,
        master_wav_48k:  session.masterWavUrl  ?? null,
        master_aiff_44k: session.masterAiffUrl ?? null,
        master_aiff_48k: session.masterAiffUrl ?? null,
        master_flac_44k: session.masterFlacUrl ?? null,
        master_flac_48k: session.masterFlacUrl ?? null,
      };

      const confirmedCount = Object.values(outputStatus).filter(Boolean).length;
      const totalCount = ALL_OUTPUT_TYPES.length;
      const missingOutputTypes = ALL_OUTPUT_TYPES.filter((t) => !outputStatus[t]);
      const isPartial = confirmedCount > 0 && confirmedCount < totalCount;
      const isComplete = session.status === "complete";

      return {
        sessionId: input.sessionId,
        sessionName: session.name,
        sessionStatus: session.status,
        outputStatus,
        confirmedCount,
        totalCount,
        missingOutputTypes,
        isPartial,
        isComplete,
        // Include stem URLs so client can reconstruct the pipeline inputs
        stems: await db
          .select()
          .from(stems)
          .where(eq(stems.sessionId, input.sessionId))
          .orderBy(stems.order),
      };
    }),

  // ── Resume session: re-confirm uploads for missing outputs ─────────────────
  /**
   * Called by the client after it has successfully re-uploaded one or more
   * missing output files.  For each (outputType, fileUrl) pair provided, the
   * corresponding DB column is updated exactly as confirmUpload does.
   *
   * If all outputs are now present the session status is set to "complete".
   */
  resumeSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        // Each entry is one successfully re-uploaded output
        uploads: z.array(
          z.object({
            outputType: z.enum([
              "mixdown_wav",
              "master_wav_44k",
              "master_wav_48k",
              "master_aiff_44k",
              "master_aiff_48k",
              "master_flac_44k",
              "master_flac_48k",
            ]),
            fileKey: z.string(),
            fileUrl: z.string(),
          }),
        ),
        // Optional: final mastering stats if available during resume
        masterLufs: z.number().optional(),
        masterLra: z.number().optional(),
        masterTruePeak: z.number().optional(),
        masteringReport: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");

      // Apply each confirmed upload to its DB column
      const columnUpdates: Record<string, string> = {};
      for (const upload of input.uploads) {
        const col = OUTPUT_TYPE_TO_COLUMN[upload.outputType];
        columnUpdates[col] = upload.fileUrl;
      }

      // Optionally update mastering stats if provided
      if (input.masterLufs !== undefined) columnUpdates["masterLufs"] = String(input.masterLufs);
      if (input.masterLra !== undefined) columnUpdates["masterLra"] = String(input.masterLra);
      if (input.masterTruePeak !== undefined) columnUpdates["masterTruePeak"] = String(input.masterTruePeak);
      if (input.masteringReport !== undefined) columnUpdates["masteringReport"] = input.masteringReport;

      await db
        .update(pipelineSessions)
        .set(columnUpdates)
        .where(eq(pipelineSessions.id, input.sessionId));

      // Re-fetch to check if all outputs are now confirmed
      const [updated] = await db
        .select()
        .from(pipelineSessions)
        .where(eq(pipelineSessions.id, input.sessionId))
        .limit(1);

      const allConfirmed =
        !!updated?.mixdownWavUrl &&
        !!updated?.masterWavUrl &&
        !!updated?.masterAiffUrl &&
        !!updated?.masterFlacUrl;

      if (allConfirmed) {
        await db
          .update(pipelineSessions)
          .set({ status: "complete" })
          .where(eq(pipelineSessions.id, input.sessionId));
        await db
          .update(stems)
          .set({ processingStatus: "complete" })
          .where(eq(stems.sessionId, input.sessionId));
      }

      return {
        success: true,
        isComplete: allConfirmed,
        resumedCount: input.uploads.length,
      };
    }),

  // ── Analyse stems with AI ───────────────────────────────────────────────────
  analyseStems: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        audioFeatures: z.array(audioFeaturesSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");
      await db
        .update(pipelineSessions)
        .set({ status: "analysing" })
        .where(eq(pipelineSessions.id, input.sessionId));
      const sessionStems = await db
        .select()
        .from(stems)
        .where(eq(stems.sessionId, input.sessionId))
        .orderBy(stems.order);
      if (sessionStems.length === 0) throw new Error("No stems found for session");

      const stemList = sessionStems
        .map((s, i) => {
          const f = input.audioFeatures?.find((af) => af.stemIndex === i);
          const base = `STEM ${i + 1}: "${s.originalName}" [${s.stemType ?? "Unknown"}]`;
          if (!f) return base;
          const dynamics =
            f.crestFactorDb > 20 ? "very dynamic" : f.crestFactorDb > 12 ? "dynamic" : "compressed";
          const brightness =
            f.spectralCentroidHz > 4000 ? "bright" : f.spectralCentroidHz > 1500 ? "mid" : "dark";
          const width =
            f.stereoWidth > 0.7 ? "wide stereo" : f.stereoWidth > 0.3 ? "moderate stereo" : "mono/narrow";
          const warnings = [
            f.hasClipping ? "⚠ CLIPPING DETECTED" : "",
            f.isSilent ? "⚠ SILENT/VERY QUIET" : "",
          ]
            .filter(Boolean)
            .join(" | ");
          return [
            base,
            `   MEASURED: RMS ${f.rmsDb.toFixed(1)} dBFS | Peak ${f.peakDb.toFixed(1)} dBFS | Crest ${f.crestFactorDb.toFixed(1)} dB (${dynamics})`,
            `   SPECTRAL: centroid ${f.spectralCentroidHz.toFixed(0)} Hz (${brightness}) | rolloff85 ${f.spectralRolloff85Hz.toFixed(0)} Hz | flatness ${f.spectralFlatness.toFixed(3)}`,
            `   DYNAMICS: range ${f.dynamicRangeDb.toFixed(1)} dB | stereo ${width} (${f.stereoWidth.toFixed(2)}) | ${f.durationSeconds.toFixed(1)}s`,
            warnings ? `   ${warnings}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      const hasFeatures = (input.audioFeatures?.length ?? 0) > 0;
      const analysisPrompt = `You are a world-class mixing and mastering engineer with 30+ years of experience producing chart-topping records in ${session.genre}.
You are given ${sessionStems.length} audio stems to mix and master for a ${session.genre} track.${hasFeatures ? " Each stem includes MEASURED AUDIO FEATURES from real-time analysis — use these precise measurements to make data-driven DSP decisions." : ""}
Target output: ${session.targetLufs} LUFS, ${session.targetSampleRate}Hz, ${session.targetBitDepth}-bit.
STEMS:
${stemList}
For EACH stem, provide a complete, precise set of processing parameters as a JSON array. Each element must have this exact structure:
{
  "stemIndex": 0,
  "stemType": "...",
  "gainDb": 0.0,
  "pan": 0.0,
  "eq": [
    { "type": "lowcut", "frequency": 80, "gain": 0, "Q": 0.7, "enabled": true },
    { "type": "peaking", "frequency": 400, "gain": -3.0, "Q": 1.5, "enabled": true },
    { "type": "highshelf", "frequency": 10000, "gain": 1.5, "Q": 0.7, "enabled": true }
  ],
  "compressor": { "enabled": true, "threshold": -18.0, "ratio": 4.0, "attack": 10.0, "release": 80.0, "knee": 6.0, "makeupGain": 3.0 },
  "reverb": { "enabled": false, "roomSize": 0.3, "dampening": 0.6, "wet": 0.15, "preDelay": 20 },
  "delay": { "enabled": false, "time": 0.25, "feedback": 0.2, "wet": 0.1 },
  "stereoWidth": 1.0,
  "reasoning": "Brief explanation of why these settings were chosen"
}
CRITICAL RULES for ${session.genre}:
- Apply genre-authentic panning (kick/bass/lead vocal always center for most genres)
- Use surgical EQ cuts to remove frequency masking between stems
- Apply appropriate compression for the genre's dynamic feel
- Add reverb/delay only where it enhances the genre aesthetic
- Ensure the mix will translate well to ${session.targetLufs} LUFS mastering target
- Be extremely specific with all numeric values
Respond with ONLY a valid JSON array, no markdown, no explanation outside the JSON.`;

      const aiResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert mixing engineer. Respond with ONLY valid JSON arrays. No markdown code blocks, no explanations outside JSON.",
          },
          { role: "user", content: analysisPrompt },
        ],
        response_format: { type: "json_object" } as never,
      });

      let processingPlans: Array<Record<string, unknown> & { stemIndex: number; stemType: string }> = [];
      try {
        const raw = String(aiResponse.choices[0]?.message?.content ?? "{}");
        const parsed = JSON.parse(raw);
        processingPlans = Array.isArray(parsed) ? parsed : (parsed.stems ?? parsed.data ?? []);
      } catch {
        processingPlans = sessionStems.map((s, i) => ({
          stemIndex: i,
          stemType: s.stemType ?? "Audio Stem",
          gainDb: 0,
          pan: 0,
          eq: [
            { type: "lowcut", frequency: 80, gain: 0, Q: 0.7, enabled: true },
            { type: "peaking", frequency: 200, gain: -1, Q: 1.0, enabled: true },
            { type: "peaking", frequency: 3000, gain: 1, Q: 1.0, enabled: true },
            { type: "highshelf", frequency: 10000, gain: 1, Q: 0.7, enabled: true },
          ],
          compressor: { enabled: true, threshold: -18, ratio: 3, attack: 10, release: 80, knee: 6, makeupGain: 2 },
          reverb: { enabled: false, roomSize: 0.3, dampening: 0.6, wet: 0.15, preDelay: 20 },
          delay: { enabled: false, time: 0.25, feedback: 0.2, wet: 0.1 },
          stereoWidth: 1.0,
          reasoning: "Default processing applied",
        }));
      }

      for (const plan of processingPlans) {
        const stem = sessionStems[plan.stemIndex];
        if (!stem) continue;
        await db
          .update(stems)
          .set({
            processingParams: plan as unknown as Record<string, unknown>,
            processingStatus: "processing",
            stemType: plan.stemType || stem.stemType,
          })
          .where(eq(stems.id, stem.id));
      }

      const summaryResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert mixing engineer. Provide a concise professional analysis." },
          {
            role: "user",
            content: `Summarise the mixing approach for this ${session.genre} session in 2-3 sentences. Stems: ${sessionStems.map((s) => s.stemType ?? s.originalName).join(", ")}. Target: ${session.targetLufs} LUFS.`,
          },
        ],
      });

      const rawContent = summaryResponse.choices[0]?.message?.content;
      const sessionAnalysis = typeof rawContent === "string" ? rawContent : "Analysis complete.";
      await db
        .update(pipelineSessions)
        .set({ status: "processing", sessionAnalysis })
        .where(eq(pipelineSessions.id, input.sessionId));

      return { sessionAnalysis, processingPlans };
    }),

  // ── Generate master bus parameters ─────────────────────────────────────────
  generateMasterParams: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        mixdownLufs: z.number(),
        mixdownLra: z.number(),
        mixdownTruePeak: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) throw new Error("Session not found");

      const lufsGap = session.targetLufs - input.mixdownLufs;
      const needsLimiting = input.mixdownTruePeak > -1;
      const isDynamic = input.mixdownLra > 12;

      const masterPrompt = `You are a professional mastering engineer. Design a master bus chain for this session.
Genre: ${session.genre}
Mixdown measured: ${input.mixdownLufs.toFixed(1)} LUFS, LRA ${input.mixdownLra.toFixed(1)} LU, True Peak ${input.mixdownTruePeak.toFixed(1)} dBTP
Target: ${session.targetLufs} LUFS, True Peak ≤ -1 dBTP
LUFS gap to close: ${lufsGap.toFixed(1)} dB (${lufsGap > 0 ? "need to increase loudness" : "need to reduce loudness"})
${needsLimiting ? "⚠ True peak exceeds -1 dBTP — aggressive limiting required" : ""}
${isDynamic ? "High dynamic range — preserve dynamics with gentle compression" : "Compressed source — use light touch"}

Respond with ONLY this JSON structure (no markdown):
{
  "inputGainDb": 0.0,
  "outputGainDb": -0.3,
  "eq": [
    { "type": "lowcut", "frequency": 20, "gain": 0, "Q": 0.7, "enabled": true },
    { "type": "peaking", "frequency": 200, "gain": -1.0, "Q": 1.5, "enabled": true },
    { "type": "highshelf", "frequency": 12000, "gain": 1.0, "Q": 0.7, "enabled": true }
  ],
  "compressor": { "enabled": true, "threshold": -18.0, "ratio": 2.5, "attack": 30.0, "release": 150.0, "knee": 6.0, "makeupGain": 2.0 },
  "limiter": { "enabled": true, "threshold": -1.0, "release": 50.0 },
  "stereoWidth": 1.05
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a mastering engineer. Respond with ONLY valid JSON." },
          { role: "user", content: masterPrompt },
        ],
        response_format: { type: "json_object" } as never,
      });

      let masterParams: Record<string, unknown>;
      try {
        masterParams = JSON.parse(String(response.choices[0]?.message?.content ?? "{}"));
      } catch {
        masterParams = {
          inputGainDb: Math.max(-6, Math.min(6, lufsGap * 0.5)),
          outputGainDb: -0.3,
          eq: [
            { type: "lowcut", frequency: 20, gain: 0, Q: 0.7, enabled: true },
            { type: "peaking", frequency: 200, gain: -1, Q: 1.5, enabled: true },
            { type: "highshelf", frequency: 12000, gain: 1, Q: 0.7, enabled: true },
          ],
          compressor: { enabled: true, threshold: -18, ratio: 2.5, attack: 30, release: 150, knee: 6, makeupGain: Math.max(0, lufsGap * 0.5) },
          limiter: { enabled: true, threshold: -1.0, release: 50 },
          stereoWidth: 1.0,
        };
      }

      await db
        .update(pipelineSessions)
        .set({ status: "mastering" })
        .where(eq(pipelineSessions.id, input.sessionId));

      return { masterParams };
    }),

  // ── Save session outputs ────────────────────────────────────────────────────
  saveOutputs: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        mixdownWavUrl: z.string().optional(),
        masterWavUrl: z.string().optional(),
        masterAiffUrl: z.string().optional(),
        masterFlacUrl: z.string().optional(),
        mixdownLufs: z.number().optional(),
        mixdownLra: z.number().optional(),
        mixdownTruePeak: z.number().optional(),
        masterLufs: z.number().optional(),
        masterLra: z.number().optional(),
        masterTruePeak: z.number().optional(),
        masteringReport: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const { sessionId, ...rest } = input;
      await db
        .update(pipelineSessions)
        .set({ ...rest, status: "complete" })
        .where(
          and(
            eq(pipelineSessions.id, sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        );
      await db
        .update(stems)
        .set({ processingStatus: "complete" })
        .where(eq(stems.sessionId, sessionId));
      return { success: true };
    }),

  // ── Get session with stems ──────────────────────────────────────────────────
  getSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [session] = await db
        .select()
        .from(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        )
        .limit(1);
      if (!session) return null;
      const sessionStems = await db
        .select()
        .from(stems)
        .where(eq(stems.sessionId, input.sessionId))
        .orderBy(stems.order);
      return { session, stems: sessionStems };
    }),

  // ── List sessions ───────────────────────────────────────────────────────────
  listSessions: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(pipelineSessions)
      .where(eq(pipelineSessions.userId, (ctx.user?.id || 0)))
      .orderBy(desc(pipelineSessions.updatedAt))
      .limit(20);
  }),

  // ── Delete session ──────────────────────────────────────────────────────────
  deleteSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.delete(stems).where(eq(stems.sessionId, input.sessionId));
      await db
        .delete(pipelineSessions)
        .where(
          and(
            eq(pipelineSessions.id, input.sessionId),
            eq(pipelineSessions.userId, (ctx.user?.id || 0)),
          ),
        );
      return { success: true };
    }),

  // ── Public config ───────────────────────────────────────────────────────────
  getConfig: publicProcedure.query(() => ({
    genres: GENRES,
    lufsPresets: LUFS_PRESETS,
  })),
});
