import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  History,
  Loader2,
  LogOut,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { analyseStem, type StemAudioFeatures } from "../engine/StemAnalyser";
import {
  runProcessingPipeline,
  audioBufferToWav,
  audioBufferToFlac,
  audioBufferToFlacAsync,
  audioBufferToAiff,
  audioBufferToAiff32,
  arrayBufferToBase64,
  resampleBuffer,
  type StemInput,
} from "../engine/ProcessingPipeline";
import type { StemProcessingParams, MasterBusParams } from "../../../drizzle/schema";

// ── Types ─────────────────────────────────────────────────────────────────────
type PipelineStep = "setup" | "uploading" | "analysing" | "processing" | "complete" | "history";

interface StemFile {
  file: File;
  id: string;
  name: string;
  stemType: string;
  stemCategory: string;
  uploadProgress: number;
  uploaded: boolean;
  serverId?: number;
  serverUrl?: string;
  processingParams?: StemProcessingParams;
  audioFeatures?: StemAudioFeatures;
  isAnalysing?: boolean;
  isPlaying?: boolean;
}

interface ProcessingLog {
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "ai";
}

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

const CATEGORY_COLORS: Record<string, string> = {
  drums: "#ef4444",
  bass: "#f97316",
  vocal: "#8b5cf6",
  melodic: "#06b6d4",
  fx: "#22c55e",
};

const CATEGORY_ICONS: Record<string, string> = {
  drums: "🥁",
  bass: "🎸",
  vocal: "🎤",
  melodic: "🎹",
  fx: "✨",
};

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

// ── Mini waveform ─────────────────────────────────────────────────────────────
function MiniWaveform({ color, animated = false }: { color: string; animated?: boolean }) {
  const bars = Array.from({ length: 18 }, (_, i) => {
    const h = 25 + Math.sin(i * 0.9) * 18 + ((i * 7) % 20);
    return Math.max(8, Math.min(100, h));
  });
  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full transition-all ${animated ? "waveform-bar" : ""}`}
          style={{
            height: `${h}%`,
            backgroundColor: color,
            opacity: animated ? 0.9 : 0.6,
            animationDelay: animated ? `${i * 0.06}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ── Loudness badge ────────────────────────────────────────────────────────────
function LoudnessBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-border/20 bg-card/50">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value !== null ? value.toFixed(1) : "—"}
      </span>
      <span className="text-[10px] text-muted-foreground">{unit}</span>
    </div>
  );
}

// ── Stem upload progress bar ──────────────────────────────────────────────────
function StemUploadProgress({
  stem,
  color,
}: {
  stem: StemFile;
  color: string;
}) {
  if (!stem.uploaded && stem.uploadProgress === 0) return null;
  if (stem.uploaded) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-green-400">
        <CheckCircle2 size={10} />
        <span>Uploaded</span>
      </div>
    );
  }
  return (
    <div className="w-full space-y-0.5">
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Uploading…</span>
        <span>{stem.uploadProgress}%</span>
      </div>
      <div className="h-0.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${stem.uploadProgress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Main Studio component ─────────────────────────────────────────────────────
export default function Studio() {
  const { user, isAuthenticated, logout } = useAuth();
  const [step, setStep] = useState<PipelineStep>("setup");

  // Setup state
  const [sessionName, setSessionName] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [targetLufs, setTargetLufs] = useState(-14);
  const [stemFiles, setStemFiles] = useState<StemFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionAnalysis, setSessionAnalysis] = useState("");
  const [processingLog, setProcessingLog] = useState<ProcessingLog[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // Results state
  const [mixdownLufs, setMixdownLufs] = useState<number | null>(null);
  const [mixdownLra, setMixdownLra] = useState<number | null>(null);
  const [mixdownTruePeak, setMixdownTruePeak] = useState<number | null>(null);
  const [masterLufs, setMasterLufs] = useState<number | null>(null);
  const [masterLra, setMasterLra] = useState<number | null>(null);
  const [masterTruePeak, setMasterTruePeak] = useState<number | null>(null);
  const [masteringReport, setMasteringReport] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<{
    mixdownWav?: string;
    masterWav44k?: string;
    masterWav48k?: string;
    masterFlac44k?: string;
    masterFlac48k?: string;
    masterAiff44k?: string;
    masterAiff48k?: string;
  }>({});

  // Resume state — tracks which outputs are already confirmed for a partial session
  const [resumeSessionId, setResumeSessionId] = useState<number | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // Preview player
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stemAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // tRPC mutations
  const createSession = trpc.pipeline.createSession.useMutation();
  const uploadStem = trpc.pipeline.uploadStem.useMutation();
  const analyseStems = trpc.pipeline.analyseStems.useMutation();
  const generateMasterParams = trpc.pipeline.generateMasterParams.useMutation();
  const saveOutputs = trpc.pipeline.saveOutputs.useMutation();
  const getUploadCredentials = trpc.pipeline.getUploadCredentials.useMutation();
  const confirmUpload = trpc.pipeline.confirmUpload.useMutation();
  const resumeSessionMutation = trpc.pipeline.resumeSession.useMutation();
  const listSessions = trpc.pipeline.listSessions.useQuery(undefined, {
    enabled: isAuthenticated && step === "history",
  });
  const deleteSession = trpc.pipeline.deleteSession.useMutation({
    onSuccess: () => listSessions.refetch(),
  });
  const generateReport = trpc.ai.generateMasteringReport.useMutation();

  // getSessionStatus query — only active when we have a resumeSessionId
  const sessionStatus = trpc.pipeline.getSessionStatus.useQuery(
    { sessionId: resumeSessionId ?? 0 },
    { enabled: !!resumeSessionId && isAuthenticated },
  );

  // ── Logging ─────────────────────────────────────────────────────────────────
  const addLog = useCallback((message: string, type: ProcessingLog["type"] = "info") => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setProcessingLog((prev) => [...prev, { time, message, type }]);
  }, []);

  // ── Direct S3 upload helper (bypasses proxy body-size limit) ─────────────────
  const uploadOutputDirect = useCallback(
    async (
      sessionId: number,
      outputType:
        | "mixdown_wav"
        | "master_wav_44k"
        | "master_wav_48k"
        | "master_aiff_44k"
        | "master_aiff_48k"
        | "master_flac_44k"
        | "master_flac_48k",
      data: ArrayBuffer,
      filename: string,
      mimeType: string,
      onProgress?: (pct: number) => void,
    ): Promise<{ url: string; fileKey: string }> => {
      const MAX_RETRIES = 3;
      let lastError: Error = new Error("Upload failed");

      // Errors that are not worth retrying (client-side or auth issues)
      const isNonRetriable = (err: Error) =>
        err.message.includes("Session not found") ||
        err.message.includes("(401)") ||
        err.message.includes("(403)") ||
        err.message.includes("(400)");

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // 1. Get upload credentials from server (verifies session ownership)
          const creds = await getUploadCredentials.mutateAsync({
            sessionId,
            outputType,
            filename,
            mimeType,
          });

          // 2. Upload directly to storage API via multipart/form-data
          const blob = new Blob([data], { type: mimeType });
          const formData = new FormData();
          formData.append("file", blob, filename);

          const url = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", creds.uploadUrl, true);
            xhr.setRequestHeader("Authorization", `Bearer ${creds.authToken}`);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const json = JSON.parse(xhr.responseText);
                  resolve(json.url as string);
                } catch {
                  reject(new Error(`Invalid JSON from storage: ${xhr.responseText.slice(0, 200)}`));
                }
              } else {
                reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
              }
            };

            xhr.onerror = () => reject(new Error("Network error during upload"));
            xhr.ontimeout = () => reject(new Error("Upload timed out"));
            xhr.timeout = 10 * 60 * 1000; // 10 min
            xhr.send(formData);
          });

          // 3. Confirm upload to update DB
          await confirmUpload.mutateAsync({
            sessionId,
            outputType,
            fileKey: creds.fileKey,
            fileUrl: url,
          });

          return { url, fileKey: creds.fileKey };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // Don't retry non-retriable errors (auth, bad request, etc.)
          if (isNonRetriable(lastError)) break;

          if (attempt < MAX_RETRIES) {
            // Exponential backoff with jitter: base * 2^(attempt-1) + random(0-500ms)
            const base = 1500 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 500;
            const delay = Math.round(base + jitter);
            addLog(`Upload attempt ${attempt} failed (${lastError.message.slice(0, 60)}), retrying in ${(delay / 1000).toFixed(1)}s…`, "warning");
            toast.warning(`Upload retry ${attempt}/${MAX_RETRIES - 1}`, {
              description: `${filename} — ${lastError.message.slice(0, 80)}`,
            });
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      // Surface the final failure as a toast so the user knows which file failed
      toast.error(`Failed to upload ${filename}`, {
        description: lastError.message.slice(0, 120),
      });
      throw lastError;
    },
    [getUploadCredentials, confirmUpload, addLog],
  );

  // ── Direct stem upload via XHR (with per-stem progress tracking) ─────────────
  const uploadStemDirect = useCallback(
    async (
      stemId: string,
      sessionId: number,
      file: File,
      order: number,
    ): Promise<{ id: number; fileUrl: string; stemType: string; stemCategory: string }> => {
      // Use the existing tRPC uploadStem mutation which handles storage internally.
      // We track progress by updating the stem's uploadProgress field during the
      // base64 conversion (CPU-bound) and then after the server call completes.
      //
      // For true XHR progress on stem uploads we'd need a separate direct-upload
      // flow; for now we simulate progress during the encoding phase and then
      // jump to 100% on completion — this gives clear visual feedback.
      setStemFiles((prev) =>
        prev.map((s) => (s.id === stemId ? { ...s, uploadProgress: 10 } : s)),
      );

      const arrayBuffer = await file.arrayBuffer();
      setStemFiles((prev) =>
        prev.map((s) => (s.id === stemId ? { ...s, uploadProgress: 30 } : s)),
      );

      const base64 = arrayBufferToBase64(arrayBuffer);
      setStemFiles((prev) =>
        prev.map((s) => (s.id === stemId ? { ...s, uploadProgress: 60 } : s)),
      );

      const result = await uploadStem.mutateAsync({
        sessionId,
        originalName: file.name,
        mimeType: file.type || "audio/wav",
        fileSizeBytes: file.size,
        base64Data: base64,
        order,
      });

      setStemFiles((prev) =>
        prev.map((s) =>
          s.id === stemId
            ? { ...s, uploadProgress: 100, uploaded: true, serverId: result.id, serverUrl: result.fileUrl }
            : s,
        ),
      );

      return result;
    },
    [uploadStem],
  );

  // ── File handling ────────────────────────────────────────────────────────────
  const ACCEPTED_TYPES = [
    "audio/wav", "audio/mpeg", "audio/mp3", "audio/aiff",
    "audio/x-aiff", "audio/flac", "audio/ogg", "audio/x-wav", "audio/wave",
  ];
  const ACCEPTED_EXTS = [".wav", ".mp3", ".aiff", ".aif", ".flac", ".ogg"];

  const isAudioFile = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTS.includes(ext);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      const audioFiles = Array.from(files).filter((file) => {
        if (!isAudioFile(file)) return false;
        if (file.size > MAX_FILE_SIZE) {
          addLog(`File "${file.name}" exceeds 100MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`, "warning");
          return false;
        }
        return true;
      });
      const newStems: StemFile[] = audioFiles.map((file) => {
        const { type, category } = inferStemType(file.name);
        return {
          file,
          id: Math.random().toString(36).slice(2),
          name: file.name,
          stemType: type,
          stemCategory: category,
          uploadProgress: 0,
          uploaded: false,
        };
      });
      setStemFiles((prev) => [...prev, ...newStems]);

      // Auto-analyse each stem
      newStems.forEach(async (stem) => {
        setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isAnalysing: true } : s)));
        try {
          const features = await analyseStem(stem.file);
          setStemFiles((prev) =>
            prev.map((s) => (s.id === stem.id ? { ...s, audioFeatures: features, isAnalysing: false } : s)),
          );
        } catch {
          setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isAnalysing: false } : s)));
        }
      });
    },
    [addLog],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeStem = (id: string) => {
    setStemFiles((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Stem preview ─────────────────────────────────────────────────────────────
  const toggleStemPreview = (stem: StemFile) => {
    const existing = stemAudioRefs.current.get(stem.id);
    if (existing) {
      if (stem.isPlaying) {
        existing.pause();
        setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isPlaying: false } : s)));
      } else {
        stemAudioRefs.current.forEach((audio, id) => {
          audio.pause();
          setStemFiles((prev) => prev.map((s) => (s.id === id ? { ...s, isPlaying: false } : s)));
        });
        existing.play();
        setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isPlaying: true } : s)));
      }
      return;
    }
    const url = URL.createObjectURL(stem.file);
    const audio = new Audio(url);
    stemAudioRefs.current.set(stem.id, audio);
    stemAudioRefs.current.forEach((a, id) => {
      if (id !== stem.id) {
        a.pause();
        setStemFiles((prev) => prev.map((s) => (s.id === id ? { ...s, isPlaying: false } : s)));
      }
    });
    audio.play();
    setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isPlaying: true } : s)));
    audio.onended = () =>
      setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? { ...s, isPlaying: false } : s)));
  };

  // ── Master preview ────────────────────────────────────────────────────────────
  const togglePreview = () => {
    if (!audioRef.current) return;
    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  useEffect(() => {
    if (previewUrl && audioRef.current) {
      audioRef.current.src = previewUrl;
    }
  }, [previewUrl]);

  // ── Download helper ───────────────────────────────────────────────────────────
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // ── Reset pipeline ────────────────────────────────────────────────────────────
  const resetPipeline = () => {
    setStemFiles([]);
    setSessionId(null);
    setSessionName("");
    setSessionAnalysis("");
    setProcessingLog([]);
    setOverallProgress(0);
    setMixdownLufs(null);
    setMixdownLra(null);
    setMixdownTruePeak(null);
    setMasterLufs(null);
    setMasterLra(null);
    setMasterTruePeak(null);
    setMasteringReport("");
    setDownloadUrls({});
    setPreviewUrl(null);
    setIsPreviewPlaying(false);
    setResumeSessionId(null);
    setIsResuming(false);
    setStep("setup");
    stemAudioRefs.current.forEach((audio) => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    });
    stemAudioRefs.current.clear();
  };

  // ── Main pipeline ─────────────────────────────────────────────────────────────
  const startPipeline = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (stemFiles.length === 0) return;
    const name = sessionName.trim() || `Session ${new Date().toLocaleDateString()}`;

    try {
      setStep("uploading");
      setProcessingLog([]);
      addLog("Creating session…", "info");

      // 1. Create session
      const { id: sid } = await createSession.mutateAsync({
        name,
        genre,
        targetLufs,
        targetSampleRate: 44100,
        targetBitDepth: 24,
      });
      setSessionId(sid);
      addLog(`Session created (ID: ${sid})`, "success");

      // 2. Upload stems with per-stem progress tracking
      const uploadedStems: StemFile[] = [];
      for (let i = 0; i < stemFiles.length; i++) {
        const stem = stemFiles[i];
        addLog(`Uploading "${stem.name}"…`, "info");

        const result = await uploadStemDirect(stem.id, sid, stem.file, i);

        const updated = {
          ...stem,
          uploaded: true,
          uploadProgress: 100,
          serverId: result.id,
          serverUrl: result.fileUrl,
          stemType: result.stemType,
          stemCategory: result.stemCategory,
        };
        uploadedStems.push(updated);
        setStemFiles((prev) => prev.map((s) => (s.id === stem.id ? updated : s)));
        setOverallProgress(((i + 1) / stemFiles.length) * 30);
        addLog(`Uploaded "${stem.name}" → ${result.stemType}`, "success");
      }

      // 3. Analyse with AI
      setStep("analysing");
      addLog("Sending stems to AI for analysis…", "ai");
      const audioFeatures = uploadedStems
        .map((s, i) => (s.audioFeatures ? { stemIndex: i, ...s.audioFeatures } : null))
        .filter((f): f is NonNullable<typeof f> => f !== null);

      const { sessionAnalysis: analysis, processingPlans } = await analyseStems.mutateAsync({
        sessionId: sid,
        audioFeatures: audioFeatures.length > 0 ? audioFeatures : undefined,
      });
      setSessionAnalysis(analysis);
      setOverallProgress(50);
      addLog("AI analysis complete", "ai");
      addLog(analysis.slice(0, 120) + "…", "ai");

      // Map processing plans back to stems
      const stemsWithParams = uploadedStems.map((s, i) => {
        const plan = processingPlans.find((p: { stemIndex: number }) => p.stemIndex === i);
        return plan ? { ...s, processingParams: plan as unknown as StemProcessingParams } : s;
      });

      // 4. Client-side DSP processing
      setStep("processing");
      addLog("Starting client-side DSP processing…", "info");
      const stemInputs: StemInput[] = stemsWithParams
        .filter((s) => s.serverUrl && s.processingParams)
        .map((s) => ({ url: s.serverUrl!, params: s.processingParams! }));

      if (stemInputs.length === 0) throw new Error("No stems with processing parameters");

      // Get master params first (with placeholder loudness)
      addLog("Generating master bus parameters…", "ai");
      const { masterParams } = await generateMasterParams.mutateAsync({
        sessionId: sid,
        mixdownLufs: -18,
        mixdownLra: 8,
        mixdownTruePeak: -3,
      });

      // Run the full pipeline at 44.1kHz/32-bit for quality + compatibility
      const result = await runProcessingPipeline(
        stemInputs,
        masterParams as unknown as MasterBusParams,
        44100,
        (progress) => {
          addLog(progress.message, "info");
          setOverallProgress(50 + progress.progress * 30);
        },
      );

      setMixdownLufs(result.mixdownStats.lufs);
      setMixdownLra(result.mixdownStats.lra);
      setMixdownTruePeak(result.mixdownStats.truePeak);
      addLog(
        `Mixdown: ${result.mixdownStats.lufs.toFixed(1)} LUFS, ${result.mixdownStats.truePeak.toFixed(1)} dBTP`,
        "success",
      );

      // 5. Re-generate master params with real loudness
      addLog("Refining master bus with measured loudness…", "ai");
      const { masterParams: refinedMasterParams } = await generateMasterParams.mutateAsync({
        sessionId: sid,
        mixdownLufs: result.mixdownStats.lufs,
        mixdownLra: result.mixdownStats.lra,
        mixdownTruePeak: result.mixdownStats.truePeak,
      });

      // Re-render with refined master
      const finalResult = await runProcessingPipeline(
        stemInputs,
        refinedMasterParams as unknown as MasterBusParams,
        44100,
        (progress) => {
          addLog(progress.message, "info");
          setOverallProgress(80 + progress.progress * 10);
        },
      );

      setMasterLufs(finalResult.masterStats.lufs);
      setMasterLra(finalResult.masterStats.lra);
      setMasterTruePeak(finalResult.masterStats.truePeak);
      addLog(
        `Master: ${finalResult.masterStats.lufs.toFixed(1)} LUFS, ${finalResult.masterStats.truePeak.toFixed(1)} dBTP`,
        "success",
      );

      // 6. Encode and upload outputs via direct multipart/form-data (no proxy size limit)
      addLog("Encoding outputs…", "info");
      setOverallProgress(90);

      // Resample master for different formats
      addLog("Resampling to 44.1kHz and 48kHz…", "info");
      const master44k = await resampleBuffer(finalResult.masterBuffer, 44100);
      const master48k = await resampleBuffer(finalResult.masterBuffer, 48000);

      // Encode all formats — FLAC uses true WASM encoder with WAV fallback
      addLog("Encoding WAV, FLAC (libflac WASM), and AIFF formats…", "info");
      const mixdownWavData    = audioBufferToWav(finalResult.mixdownBuffer, 24);  // 24-bit mixdown
      const master44kWavData  = audioBufferToWav(master44k, 16);                  // 44.1kHz/16-bit (streaming)
      const master48kWavData  = audioBufferToWav(master48k, 24);                  // 48kHz/24-bit (professional)
      const master44kFlacData = await audioBufferToFlacAsync(master44k);          // 44.1kHz/24-bit true FLAC
      const master48kFlacData = await audioBufferToFlacAsync(master48k);          // 48kHz/24-bit true FLAC
      const master44kAiffData = audioBufferToAiff(master44k);                     // 44.1kHz/24-bit AIFF
      const master48kAiffData = audioBufferToAiff32(master48k);                   // 48kHz/32-bit AIFF
      addLog("All formats encoded", "success");

      addLog("Uploading outputs directly to cloud storage…", "info");

      // Upload sequentially to avoid memory pressure; each uses XHR with progress
      const mixdownWavResult = await uploadOutputDirect(
        sid, "mixdown_wav", mixdownWavData, "mixdown_24bit.wav", "audio/wav",
        (pct) => { if (pct % 20 === 0) addLog(`Mixdown upload: ${pct}%`, "info"); },
      );
      addLog("Mixdown WAV uploaded", "success");
      setOverallProgress(91);

      const master44kWavResult = await uploadOutputDirect(
        sid, "master_wav_44k", master44kWavData, "master_44k_16bit.wav", "audio/wav",
        (pct) => { if (pct % 20 === 0) addLog(`Master 44k WAV: ${pct}%`, "info"); },
      );
      addLog("Master 44.1kHz WAV uploaded", "success");
      setOverallProgress(92);

      const master48kWavResult = await uploadOutputDirect(
        sid, "master_wav_48k", master48kWavData, "master_48k_24bit.wav", "audio/wav",
        (pct) => { if (pct % 20 === 0) addLog(`Master 48k WAV: ${pct}%`, "info"); },
      );
      addLog("Master 48kHz WAV uploaded", "success");
      setOverallProgress(93);

      const master44kFlacResult = await uploadOutputDirect(
        sid, "master_flac_44k", master44kFlacData, "master_44k_24bit.flac", "audio/x-flac",
        (pct) => { if (pct % 20 === 0) addLog(`Master 44k FLAC: ${pct}%`, "info"); },
      );
      addLog("Master 44.1kHz FLAC uploaded", "success");
      setOverallProgress(94);

      const master48kFlacResult = await uploadOutputDirect(
        sid, "master_flac_48k", master48kFlacData, "master_48k_24bit.flac", "audio/x-flac",
        (pct) => { if (pct % 20 === 0) addLog(`Master 48k FLAC: ${pct}%`, "info"); },
      );
      addLog("Master 48kHz FLAC uploaded", "success");
      setOverallProgress(95);

      const master44kAiffResult = await uploadOutputDirect(
        sid, "master_aiff_44k", master44kAiffData, "master_44k_24bit.aiff", "audio/aiff",
        (pct) => { if (pct % 20 === 0) addLog(`Master 44k AIFF: ${pct}%`, "info"); },
      );
      addLog("Master 44.1kHz AIFF uploaded", "success");
      setOverallProgress(96);

      const master48kAiffResult = await uploadOutputDirect(
        sid, "master_aiff_48k", master48kAiffData, "master_48k_32bit.aiff", "audio/aiff",
        (pct) => { if (pct % 20 === 0) addLog(`Master 48k AIFF: ${pct}%`, "info"); },
      );
      addLog("All outputs uploaded to cloud", "success");
      setOverallProgress(97);

      // 7. Generate mastering report
      addLog("Generating AI mastering report…", "ai");
      const reportResult = await generateReport.mutateAsync({
        genre,
        targetLufs,
        masterLufs: finalResult.masterStats.lufs,
        masterLra: finalResult.masterStats.lra,
        masterTruePeak: finalResult.masterStats.truePeak,
        stemCount: stemFiles.length,
        masterParams: refinedMasterParams,
      });
      const reportText = typeof reportResult.report === "string" ? reportResult.report : "";
      setMasteringReport(reportText);

      // 8. Save session outputs — correctly mapped to their actual formats
      await saveOutputs.mutateAsync({
        sessionId: sid,
        mixdownWavUrl:  mixdownWavResult.url,
        masterWavUrl:   master48kWavResult.url,   // 48kHz/24-bit WAV is the primary master WAV
        masterAiffUrl:  master44kAiffResult.url,  // 44.1kHz/24-bit AIFF (correctly mapped)
        masterFlacUrl:  master44kFlacResult.url,  // 44.1kHz/24-bit FLAC (correctly mapped)
        masterLufs:     finalResult.masterStats.lufs,
        masterLra:      finalResult.masterStats.lra,
        masterTruePeak: finalResult.masterStats.truePeak,
        masteringReport: reportText,
      });

      // Populate all download URLs including FLAC and AIFF variants
      setDownloadUrls({
        mixdownWav:    mixdownWavResult.url,
        masterWav44k:  master44kWavResult.url,
        masterWav48k:  master48kWavResult.url,
        masterFlac44k: master44kFlacResult.url,
        masterFlac48k: master48kFlacResult.url,
        masterAiff44k: master44kAiffResult.url,
        masterAiff48k: master48kAiffResult.url,
      });

      // Set preview to 48kHz master
      setPreviewUrl(master48kWavResult.url);
      setOverallProgress(100);
      addLog("Pipeline complete! 🎉", "success");
      setStep("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${message}`, "warning");
      toast.error("Processing failed", { description: message });
      setStep("setup");
    }
  };

  // ── Session resume handler ────────────────────────────────────────────────────
  /**
   * Called when the user clicks "Resume" on a partial session from history.
   * We re-encode the missing outputs (using the already-uploaded stem URLs from
   * the server) and upload them, then call resumeSession to mark the session complete.
   */
  const handleResumeSession = async (sessionIdToResume: number) => {
    if (!isAuthenticated) return;
    setIsResuming(true);
    setResumeSessionId(sessionIdToResume);

    try {
      // Fetch current status to know which outputs are missing
      const status = await trpc.pipeline.getSessionStatus.query
        ? undefined // will use the query hook below
        : undefined;

      // Use the tRPC client directly for the resume flow
      const statusData = sessionStatus.data;
      if (!statusData) {
        toast.error("Could not load session status");
        setIsResuming(false);
        return;
      }

      if (statusData.isComplete) {
        toast.info("Session is already complete");
        setIsResuming(false);
        return;
      }

      const missing = statusData.missingOutputTypes;
      if (missing.length === 0) {
        toast.info("All outputs are already confirmed");
        setIsResuming(false);
        return;
      }

      toast.info(`Resuming session — re-uploading ${missing.length} missing output(s)…`);

      // We need the audio buffers to re-encode.  The stems are available via
      // statusData.stems[].fileUrl.  We re-run the pipeline on those URLs.
      const sessionStems = statusData.stems;
      if (sessionStems.length === 0) {
        toast.error("No stems found for this session");
        setIsResuming(false);
        return;
      }

      // Build stem inputs from server-stored processing params
      const stemInputs: StemInput[] = sessionStems
        .filter((s) => s.fileUrl && s.processingParams)
        .map((s) => ({
          url: s.fileUrl,
          params: s.processingParams as unknown as StemProcessingParams,
        }));

      if (stemInputs.length === 0) {
        toast.error("No stems with processing parameters found");
        setIsResuming(false);
        return;
      }

      // We need master params — use defaults since we don't have them stored
      // (a future enhancement could store them in the session)
      const defaultMasterParams: MasterBusParams = {
        inputGainDb: 0,
        outputGainDb: -0.3,
        eq: [
          { type: "lowcut", frequency: 20, gain: 0, Q: 0.7, enabled: true },
          { type: "highshelf", frequency: 12000, gain: 1, Q: 0.7, enabled: true },
        ],
        compressor: { enabled: true, threshold: -18, ratio: 2.5, attack: 30, release: 150, knee: 6, makeupGain: 2 },
        limiter: { enabled: true, threshold: -1.0, release: 50 },
        stereoWidth: 1.0,
      };

      // Re-run pipeline to get the audio buffers
      setProcessingLog([]);
      addLog(`Resuming session ${statusData.sessionName}…`, "info");
      addLog(`Missing outputs: ${missing.join(", ")}`, "info");

      const pipelineResult = await runProcessingPipeline(
        stemInputs,
        defaultMasterParams,
        44100,
        (progress) => addLog(progress.message, "info"),
      );

      const master44k = await resampleBuffer(pipelineResult.masterBuffer, 44100);
      const master48k = await resampleBuffer(pipelineResult.masterBuffer, 48000);

      // Encode only the missing formats
      const encodedOutputs: Record<string, ArrayBuffer> = {};
      if (missing.includes("mixdown_wav"))     encodedOutputs["mixdown_wav"]     = audioBufferToWav(pipelineResult.mixdownBuffer, 24);
      if (missing.includes("master_wav_44k"))  encodedOutputs["master_wav_44k"]  = audioBufferToWav(master44k, 16);
      if (missing.includes("master_wav_48k"))  encodedOutputs["master_wav_48k"]  = audioBufferToWav(master48k, 24);
      if (missing.includes("master_flac_44k")) encodedOutputs["master_flac_44k"] = await audioBufferToFlacAsync(master44k);
      if (missing.includes("master_flac_48k")) encodedOutputs["master_flac_48k"] = await audioBufferToFlacAsync(master48k);
      if (missing.includes("master_aiff_44k")) encodedOutputs["master_aiff_44k"] = audioBufferToAiff(master44k);
      if (missing.includes("master_aiff_48k")) encodedOutputs["master_aiff_48k"] = audioBufferToAiff32(master48k);

      // Upload each missing output
      const uploadedOutputs: Array<{ outputType: string; fileKey: string; fileUrl: string }> = [];
      const outputFilenames: Record<string, [string, string]> = {
        mixdown_wav:     ["mixdown_24bit.wav",    "audio/wav"],
        master_wav_44k:  ["master_44k_16bit.wav", "audio/wav"],
        master_wav_48k:  ["master_48k_24bit.wav", "audio/wav"],
        master_flac_44k: ["master_44k_24bit.flac","audio/x-flac"],
        master_flac_48k: ["master_48k_24bit.flac","audio/x-flac"],
        master_aiff_44k: ["master_44k_24bit.aiff","audio/aiff"],
        master_aiff_48k: ["master_48k_32bit.aiff","audio/aiff"],
      };

      for (const outputType of missing) {
        const data = encodedOutputs[outputType];
        if (!data) continue;
        const [filename, mimeType] = outputFilenames[outputType] ?? [`${outputType}.wav`, "audio/wav"];
        addLog(`Re-uploading ${outputType}…`, "info");
        const uploadResult = await uploadOutputDirect(
          sessionIdToResume,
          outputType as any,
          data,
          filename,
          mimeType,
          (pct) => { if (pct % 25 === 0) addLog(`${outputType}: ${pct}%`, "info"); },
        );
        uploadedOutputs.push({ outputType, fileKey: uploadResult.fileKey, fileUrl: uploadResult.url });
        addLog(`${outputType} uploaded`, "success");
      }

      // Call resumeSession to update DB and potentially mark session complete
      const resumeResult = await resumeSessionMutation.mutateAsync({
        sessionId: sessionIdToResume,
        uploads: uploadedOutputs as any,
      });

      if (resumeResult.isComplete) {
        toast.success("Session resumed and completed successfully!");
        addLog("Session resume complete! All outputs confirmed.", "success");
      } else {
        toast.info(`Resumed ${resumeResult.resumedCount} output(s). Some may still be missing.`);
      }

      // Refresh history
      listSessions.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Resume failed", { description: message });
      addLog(`Resume error: ${message}`, "warning");
    } finally {
      setIsResuming(false);
      setResumeSessionId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hidden audio element for master preview */}
      <audio ref={audioRef} onEnded={() => setIsPreviewPlaying(false)} />

      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Music2 size={16} className="text-primary" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight gradient-text">Intellimix</span>
              <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">
                Automated AI Mixing & Mastering
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setStep(step === "history" ? "setup" : "history")}
              >
                <History size={14} />
                <span className="hidden sm:inline">History</span>
              </Button>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">{user?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => logout()}
                  title="Sign out"
                >
                  <LogOut size={13} />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="text-xs"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-6">
        <AnimatePresence mode="wait">
          {/* ── History panel ──────────────────────────────────────────────── */}
          {step === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Session History</h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setStep("setup")}>
                  <ChevronRight size={14} className="rotate-180" />
                  Back
                </Button>
              </div>
              {listSessions.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : listSessions.data?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listSessions.data?.map((session) => {
                    // Determine if this session is partial (has some but not all outputs)
                    const hasAnyOutput = !!(session.mixdownWavUrl || session.masterWavUrl || session.masterAiffUrl || session.masterFlacUrl);
                    const hasAllOutputs = !!(session.mixdownWavUrl && session.masterWavUrl && session.masterAiffUrl && session.masterFlacUrl);
                    const isPartialSession = hasAnyOutput && !hasAllOutputs && session.status !== "complete";
                    const isThisResuming = isResuming && resumeSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        className="bg-card border border-border/20 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{session.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {session.genre} · {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                session.status === "complete"
                                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                                  : session.status === "error"
                                    ? "border-red-500/30 text-red-400 bg-red-500/10"
                                    : isPartialSession
                                      ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                                      : "border-primary/30 text-primary bg-primary/10"
                              }`}
                            >
                              {isPartialSession ? "partial" : session.status}
                            </span>
                            <button
                              onClick={() => deleteSession.mutate({ sessionId: session.id })}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Partial session resume banner */}
                        {isPartialSession && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                            <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-yellow-300 font-medium">Partial outputs detected</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Some output files are missing. Resume to re-upload them.
                              </p>
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {[
                                  { key: "mixdownWavUrl", label: "Mixdown" },
                                  { key: "masterWavUrl", label: "WAV" },
                                  { key: "masterFlacUrl", label: "FLAC" },
                                  { key: "masterAiffUrl", label: "AIFF" },
                                ].map(({ key, label }) => {
                                  const confirmed = !!(session as any)[key];
                                  return (
                                    <span
                                      key={key}
                                      className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                        confirmed
                                          ? "border-green-500/30 text-green-400 bg-green-500/5"
                                          : "border-red-500/30 text-red-400 bg-red-500/5"
                                      }`}
                                    >
                                      {confirmed ? "✓" : "✗"} {label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex-shrink-0 gap-1"
                              disabled={isThisResuming}
                              onClick={() => {
                                setResumeSessionId(session.id);
                                // Trigger the query then call the handler
                                setTimeout(() => handleResumeSession(session.id), 100);
                              }}
                            >
                              {isThisResuming ? (
                                <>
                                  <Loader2 size={11} className="animate-spin" />
                                  Resuming…
                                </>
                              ) : (
                                <>
                                  <RefreshCw size={11} />
                                  Resume
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {session.status === "complete" && (
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                            {session.masterLufs !== null && (
                              <span>
                                Master: <span className="text-green-400">{session.masterLufs?.toFixed(1)} LUFS</span>
                              </span>
                            )}
                            {session.masterTruePeak !== null && (
                              <span>
                                TP:{" "}
                                <span className="text-cyan-400">{session.masterTruePeak?.toFixed(1)} dBTP</span>
                              </span>
                            )}
                          </div>
                        )}
                        {session.status === "complete" && (session.masterWavUrl || session.masterAiffUrl) && (
                          <div className="flex gap-2 flex-wrap">
                            {session.masterAiffUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-[11px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                                onClick={() =>
                                  downloadFile(
                                    session.masterAiffUrl!,
                                    `${session.name}_master_44k.aiff`,
                                  )
                                }
                              >
                                <Download size={11} />
                                44.1kHz AIFF
                              </Button>
                            )}
                            {session.masterWavUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-[11px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                                onClick={() =>
                                  downloadFile(
                                    session.masterWavUrl!,
                                    `${session.name}_master_48k.wav`,
                                  )
                                }
                              >
                                <Download size={11} />
                                48kHz WAV
                              </Button>
                            )}
                            {session.masterFlacUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-[11px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                onClick={() =>
                                  downloadFile(
                                    session.masterFlacUrl!,
                                    `${session.name}_master_44k.flac`,
                                  )
                                }
                              >
                                <Download size={11} />
                                FLAC
                              </Button>
                            )}
                            {session.mixdownWavUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-[11px] border-accent/30 text-accent hover:bg-accent/10"
                                onClick={() =>
                                  downloadFile(session.mixdownWavUrl!, `${session.name}_mixdown.wav`)
                                }
                              >
                                <Download size={11} />
                                Mixdown
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Setup / uploading / analysing / processing ──────────────────── */}
          {(step === "setup" || step === "uploading" || step === "analysing" || step === "processing") && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              {/* Page title */}
              <div className="text-center space-y-1 pt-2">
                <h1 className="text-2xl font-bold gradient-text">AI Mixing & Mastering</h1>
                <p className="text-sm text-muted-foreground">
                  Upload your stems, choose a genre and loudness target, then let Intellimix do the work.
                </p>
              </div>

              {/* Session name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Session Name
                </label>
                <Input
                  placeholder="My Track (optional)"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="bg-card border-border/30"
                  disabled={step !== "setup"}
                />
              </div>

              {/* Genre selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Genre
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.slice(0, 10).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      disabled={step !== "setup"}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        genre === g
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                  <select
                    value={GENRES.slice(10).includes(genre) ? genre : ""}
                    onChange={(e) => e.target.value && setGenre(e.target.value)}
                    disabled={step !== "setup"}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border/30 bg-card text-muted-foreground hover:border-border/60 cursor-pointer"
                  >
                    <option value="">More genres…</option>
                    {GENRES.slice(10).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LUFS target */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Loudness Target
                  </label>
                  <span className="text-sm font-bold text-primary tabular-nums">{targetLufs} LUFS</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {LUFS_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setTargetLufs(preset.value)}
                      disabled={step !== "setup"}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        targetLufs === preset.value
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
                <Slider
                  min={-30}
                  max={-6}
                  step={0.5}
                  value={[targetLufs]}
                  onValueChange={([v]) => setTargetLufs(v)}
                  disabled={step !== "setup"}
                  className="w-full"
                />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => step === "setup" && document.getElementById("file-input")?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/30 hover:border-border/60 hover:bg-card/50"
                } ${step !== "setup" ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".wav,.mp3,.aiff,.aif,.flac,.ogg"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Upload size={28} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop audio stems here</p>
                <p className="text-xs text-muted-foreground mt-1">WAV, MP3, AIFF, FLAC, OGG · Max 100MB each</p>
              </div>

              {/* Stem list */}
              {stemFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stemFiles.length} Stem{stemFiles.length !== 1 ? "s" : ""}
                    </span>
                    {step === "setup" && (
                      <button
                        onClick={() => setStemFiles([])}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {stemFiles.map((stem) => {
                      const color = CATEGORY_COLORS[stem.stemCategory] ?? "#6366f1";
                      const icon = CATEGORY_ICONS[stem.stemCategory] ?? "🎵";
                      return (
                        <div
                          key={stem.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/20 group"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStemPreview(stem);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
                            style={{ backgroundColor: color + "20", border: `1px solid ${color}40` }}
                          >
                            {stem.isPlaying ? (
                              <Pause size={12} style={{ color }} />
                            ) : (
                              <Play size={12} style={{ color }} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate">{stem.name}</span>
                              {stem.audioFeatures?.hasClipping && (
                                <span className="text-[10px] text-red-400 flex-shrink-0">⚠ Clip</span>
                              )}
                              {stem.audioFeatures?.isSilent && (
                                <span className="text-[10px] text-yellow-400 flex-shrink-0">⚠ Silent</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px]">{icon}</span>
                              <span className="text-[10px] text-muted-foreground">{stem.stemType}</span>
                              {stem.audioFeatures && (
                                <>
                                  <span className="text-[10px] text-border/50">·</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {stem.audioFeatures.rmsDb.toFixed(1)} dBFS
                                  </span>
                                  <span className="text-[10px] text-border/50">·</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {stem.audioFeatures.durationSeconds.toFixed(1)}s
                                  </span>
                                </>
                              )}
                              {stem.isAnalysing && (
                                <Loader2 size={10} className="animate-spin text-primary flex-shrink-0" />
                              )}
                            </div>
                            {/* Per-stem upload progress bar */}
                            {step === "uploading" && (
                              <div className="mt-1">
                                <StemUploadProgress stem={stem} color={color} />
                              </div>
                            )}
                          </div>
                          <MiniWaveform color={color} animated={stem.isPlaying} />
                          {step === "setup" && (
                            <button
                              onClick={() => removeStem(stem.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload / processing progress */}
              {(step === "uploading" || step === "analysing" || step === "processing") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {step === "uploading"
                        ? "Uploading stems…"
                        : step === "analysing"
                          ? "AI analysing stems…"
                          : "Processing DSP chain…"}
                    </span>
                    <span className="text-primary">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-1.5" />
                  {processingLog.length > 0 && (
                    <div className="bg-card border border-border/20 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto font-mono text-[10px]">
                      {processingLog.slice(-12).map((log, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 ${
                            log.type === "success"
                              ? "text-green-400"
                              : log.type === "warning"
                                ? "text-yellow-400"
                                : log.type === "ai"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-border/50 flex-shrink-0">{log.time}</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="flex justify-center pt-2">
                {!isAuthenticated ? (
                  <Button
                    size="lg"
                    className="gap-2 px-8"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    <Zap size={16} />
                    Sign In to Start
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="gap-2 px-8 bg-primary hover:bg-primary/90"
                    disabled={
                      stemFiles.length === 0 ||
                      step === "uploading" ||
                      step === "analysing" ||
                      step === "processing"
                    }
                    onClick={startPipeline}
                  >
                    {step === "uploading" || step === "analysing" || step === "processing" ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {step === "uploading"
                          ? "Uploading…"
                          : step === "analysing"
                            ? "Analysing…"
                            : "Processing…"}
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} />
                        Analyse & Mix ({stemFiles.length} stem{stemFiles.length !== 1 ? "s" : ""})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Complete / results ──────────────────────────────────────────── */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              {/* Success header */}
              <div className="text-center space-y-1 pt-2">
                <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={22} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold">Mix Complete</h2>
                <p className="text-sm text-muted-foreground">
                  {sessionName || "Your session"} has been mixed and mastered by Intellimix.
                </p>
              </div>

              {/* Loudness stats */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Mixdown Stats
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <LoudnessBadge label="LUFS" value={mixdownLufs} unit="LUFS" color="#06b6d4" />
                  <LoudnessBadge label="LRA" value={mixdownLra} unit="LU" color="#8b5cf6" />
                  <LoudnessBadge label="True Peak" value={mixdownTruePeak} unit="dBTP" color="#f97316" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4">
                  Master Stats
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <LoudnessBadge label="LUFS" value={masterLufs} unit="LUFS" color="#22c55e" />
                  <LoudnessBadge label="LRA" value={masterLra} unit="LU" color="#8b5cf6" />
                  <LoudnessBadge label="True Peak" value={masterTruePeak} unit="dBTP" color="#f97316" />
                </div>
              </div>

              {/* Master preview */}
              {previewUrl && (
                <div className="bg-card border border-border/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-sm font-medium">Master Preview</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={togglePreview}
                    >
                      {isPreviewPlaying ? <Pause size={12} /> : <Play size={12} />}
                      {isPreviewPlaying ? "Pause" : "Play"}
                    </Button>
                  </div>
                  <MiniWaveform color="#8b5cf6" animated={isPreviewPlaying} />
                </div>
              )}

              {/* Downloads */}
              <div className="bg-card border border-border/20 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/20 flex items-center gap-2">
                  <Download size={14} className="text-primary" />
                  <span className="text-sm font-semibold">Downloads</span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Mixdown */}
                  {downloadUrls.mixdownWav && (
                    <div className="border border-accent/20 rounded-xl p-4 space-y-3 bg-accent/3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                          <Music2 size={14} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mixdown</p>
                          <p className="text-[10px] text-muted-foreground">
                            24-bit · {mixdownLufs?.toFixed(1)} LUFS
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 border-accent/30 text-accent hover:bg-accent/10 text-xs"
                        onClick={() =>
                          downloadFile(
                            downloadUrls.mixdownWav!,
                            `${sessionName || "mix"}_mixdown.wav`,
                          )
                        }
                      >
                        <Download size={11} />
                        WAV 24-bit
                      </Button>
                    </div>
                  )}
                  {/* Master */}
                  {(downloadUrls.masterWav44k || downloadUrls.masterWav48k) && (
                    <div className="border border-green-500/20 rounded-xl p-4 space-y-3 bg-green-500/3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Sparkles size={14} className="text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Master (Choose Format)</p>
                          <p className="text-[10px] text-muted-foreground">
                            AI mastered · {targetLufs} LUFS
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {downloadUrls.masterWav44k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterWav44k!,
                                `${sessionName || "mix"}_master_44k_16bit.wav`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 44.1kHz / 16-bit WAV (Streaming)</span>
                          </Button>
                        )}
                        {downloadUrls.masterWav48k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterWav48k!,
                                `${sessionName || "mix"}_master_48k_24bit.wav`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 48kHz / 24-bit WAV (Professional)</span>
                          </Button>
                        )}
                        {downloadUrls.masterFlac44k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterFlac44k!,
                                `${sessionName || "mix"}_master_44k_24bit.flac`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 44.1kHz / 24-bit FLAC (Lossless)</span>
                          </Button>
                        )}
                        {downloadUrls.masterAiff44k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterAiff44k!,
                                `${sessionName || "mix"}_master_44k_24bit.aiff`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 44.1kHz / 24-bit AIFF</span>
                          </Button>
                        )}
                        {downloadUrls.masterFlac48k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterFlac48k!,
                                `${sessionName || "mix"}_master_48k_24bit.flac`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 48kHz / 24-bit FLAC (Lossless)</span>
                          </Button>
                        )}
                        {downloadUrls.masterAiff48k && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs justify-start"
                            onClick={() =>
                              downloadFile(
                                downloadUrls.masterAiff48k!,
                                `${sessionName || "mix"}_master_48k_32bit.aiff`,
                              )
                            }
                          >
                            <Download size={12} />
                            <span>Master 48kHz / 32-bit AIFF</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Mastering Report */}
              {masteringReport && (
                <div className="bg-card border border-border/20 rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/20 flex items-center gap-2">
                    <Brain size={14} className="text-primary" />
                    <span className="text-sm font-semibold">AI Mastering Report</span>
                  </div>
                  <div className="p-5 prose prose-invert prose-sm max-w-none">
                    <Streamdown>{masteringReport}</Streamdown>
                  </div>
                </div>
              )}

              {/* Processing log */}
              <div className="bg-card border border-border/20 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span className="text-xs font-medium">Processing Log</span>
                </div>
                <div className="p-4 space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {processingLog.map((log, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${
                        log.type === "success"
                          ? "text-green-400"
                          : log.type === "warning"
                            ? "text-yellow-400"
                            : log.type === "ai"
                              ? "text-primary"
                              : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-border/50 flex-shrink-0">{log.time}</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* New session */}
              <div className="flex justify-center pb-8">
                <Button variant="outline" className="gap-2" onClick={resetPipeline}>
                  <RefreshCw size={14} />
                  Start New Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
