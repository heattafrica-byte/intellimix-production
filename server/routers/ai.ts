import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";

export const aiRouter = router({
  // ── Mix analysis ──────────────────────────────────────────────────────────
  analyzeMix: publicProcedure
    .input(
      z.object({
        genre: z.string(),
        stemCount: z.number(),
        stemTypes: z.array(z.string()),
        targetLufs: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are Intellimix, an expert AI mixing and mastering assistant. Provide concise, professional analysis.",
          },
          {
            role: "user",
            content: `Analyse this mix setup:\nGenre: ${input.genre}\nStems: ${input.stemTypes.join(", ")} (${input.stemCount} total)\nTarget: ${input.targetLufs} LUFS\n\nProvide a brief professional assessment of the mix potential and key considerations.`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content;
      return {
        analysis: typeof content === "string" ? content : "Analysis unavailable",
        timestamp: Date.now(),
      };
    }),

  // ── FX suggestions ────────────────────────────────────────────────────────
  getFxSuggestions: publicProcedure
    .input(
      z.object({
        trackName: z.string(),
        genre: z.string().optional(),
        currentEffects: z
          .object({
            eqBands: z.unknown().optional(),
            compressor: z.unknown().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const trackType = input.trackName.toLowerCase();
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are Intellimix, an expert AI mixing and mastering assistant with deep knowledge of audio engineering.",
          },
          {
            role: "user",
            content: `Provide specific mixing/processing recommendations for this track:\nTrack Name: "${input.trackName}"\nDetected Type: ${trackType}\nGenre Context: ${input.genre || "General"}\nCurrent EQ: ${input.currentEffects?.eqBands ? JSON.stringify(input.currentEffects.eqBands) : "Default (flat)"}\nCurrent Compressor: ${input.currentEffects?.compressor ? JSON.stringify(input.currentEffects.compressor) : "Default"}\n\nProvide:\n1. **EQ Recommendations** — specific frequency cuts/boosts with exact Hz and dB values\n2. **Compression Settings** — threshold, ratio, attack, release\n3. **Reverb/Delay** — whether to add spatial effects and with what settings\n4. **Common Issues** — typical problems with this instrument type\n5. **Pro Tip** — one advanced technique specific to ${trackType} in ${input.genre || "this genre"}`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content;
      return {
        suggestions: typeof content === "string" ? content : "Suggestions unavailable",
        trackType,
        timestamp: Date.now(),
      };
    }),

  // ── Genre recommendations ─────────────────────────────────────────────────
  getGenreRecommendations: publicProcedure
    .input(
      z.object({
        genre: z.string().min(1),
        subGenre: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert music producer and mixing engineer specializing in genre-specific production techniques.",
          },
          {
            role: "user",
            content: `Provide a complete mixing and mastering guide for ${input.genre}${input.subGenre ? ` (${input.subGenre})` : ""} music.\n\nInclude:\n1. **Typical Mix Balance** — relative levels for kick, bass, vocals, instruments\n2. **EQ Signature** — characteristic frequency curve for this genre\n3. **Compression Style** — aggressiveness, attack/release times\n4. **Reverb/Space** — typical room size and reverb types\n5. **Stereo Width** — mono vs stereo approach\n6. **Loudness Target** — LUFS target and dynamic range\n7. **Reference Tracks** — 3 well-known reference tracks to A/B against\n8. **Master Bus Chain** — recommended master bus processing`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content;
      return {
        recommendations: typeof content === "string" ? content : "Recommendations unavailable",
        genre: input.genre,
        timestamp: Date.now(),
      };
    }),

  // ── Quick AI chat ─────────────────────────────────────────────────────────
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1),
        context: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are Intellimix, an expert AI mixing and mastering assistant. You have deep knowledge of audio engineering, music production, signal processing, and DAW workflows. ${input.context ? `Current session context: ${input.context}` : ""} Be concise, technical, and practical in your responses.`,
          },
          { role: "user", content: input.message },
        ],
      });
      const content = response.choices[0]?.message?.content;
      return {
        reply: typeof content === "string" ? content : "I couldn't process that request.",
        timestamp: Date.now(),
      };
    }),

  // ── Mastering report ──────────────────────────────────────────────────────
  generateMasteringReport: publicProcedure
    .input(
      z.object({
        genre: z.string(),
        targetLufs: z.number(),
        masterLufs: z.number().optional(),
        masterLra: z.number().optional(),
        masterTruePeak: z.number().optional(),
        stemCount: z.number(),
        masterParams: z.unknown().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a professional mastering engineer writing a technical mastering report. Use markdown formatting.",
          },
          {
            role: "user",
            content: `Write a professional mastering report for this Intellimix session:\n- Genre: ${input.genre}\n- Target LUFS: ${input.targetLufs}\n- Achieved LUFS: ${input.masterLufs?.toFixed(1) ?? "N/A"}\n- Dynamic Range (LRA): ${input.masterLra?.toFixed(1) ?? "N/A"} LU\n- True Peak: ${input.masterTruePeak?.toFixed(1) ?? "N/A"} dBTP\n- Stems processed: ${input.stemCount}\n\nInclude: spectral balance assessment, dynamic range analysis, loudness compliance, stereo field evaluation, and recommendations for future sessions. Keep it professional and technical, 200-300 words.`,
          },
        ],
      });
      const content = response.choices[0]?.message?.content;
      return {
        report: typeof content === "string" ? content : "Report unavailable",
        timestamp: Date.now(),
      };
    }),
});
