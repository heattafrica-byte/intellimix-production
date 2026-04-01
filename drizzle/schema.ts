import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ── Core user table ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Stripe integration for subscriptions
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Pipeline sessions ─────────────────────────────────────────────────────────
export const pipelineSessions = mysqlTable("pipeline_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  subGenre: varchar("subGenre", { length: 100 }),
  targetLufs: float("targetLufs").notNull().default(-14),
  targetSampleRate: int("targetSampleRate").notNull().default(44100),
  targetBitDepth: int("targetBitDepth").notNull().default(24),
  status: mysqlEnum("status", [
    "uploading",
    "analysing",
    "processing",
    "mastering",
    "complete",
    "error",
  ])
    .notNull()
    .default("uploading"),
  sessionAnalysis: text("sessionAnalysis"),
  mixdownWavUrl: text("mixdownWavUrl"),
  masterWavUrl: text("masterWavUrl"),
  masterAiffUrl: text("masterAiffUrl"),
  masterFlacUrl: text("masterFlacUrl"),
  mixdownLufs: float("mixdownLufs"),
  mixdownLra: float("mixdownLra"),
  mixdownTruePeak: float("mixdownTruePeak"),
  masterLufs: float("masterLufs"),
  masterLra: float("masterLra"),
  masterTruePeak: float("masterTruePeak"),
  masteringReport: text("masteringReport"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineSession = typeof pipelineSessions.$inferSelect;
export type InsertPipelineSession = typeof pipelineSessions.$inferInsert;

// ── Stems ─────────────────────────────────────────────────────────────────────
export const stems = mysqlTable("stems", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileSizeBytes: int("fileSizeBytes").notNull().default(0),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  order: int("order").notNull().default(0),
  stemType: varchar("stemType", { length: 100 }),
  stemCategory: varchar("stemCategory", { length: 50 }),
  processingParams: json("processingParams"),
  processingStatus: mysqlEnum("processingStatus", [
    "pending",
    "processing",
    "complete",
    "error",
  ])
    .notNull()
    .default("pending"),
  processingError: text("processingError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Stem = typeof stems.$inferSelect;
export type InsertStem = typeof stems.$inferInsert;

// ── Stem processing params (used as JSON column type) ─────────────────────────
export type EqBand = {
  type: "lowcut" | "highcut" | "peaking" | "lowshelf" | "highshelf" | "notch";
  frequency: number;
  gain: number;
  Q: number;
  enabled: boolean;
};

export type StemProcessingParams = {
  gainDb: number;
  pan: number;
  eq: EqBand[];
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  };
  reverb: {
    enabled: boolean;
    roomSize: number;
    dampening: number;
    wet: number;
    preDelay: number;
  };
  delay: {
    enabled: boolean;
    time: number;
    feedback: number;
    wet: number;
  };
  stereoWidth: number;
};

export type MasterBusParams = {
  inputGainDb: number;
  outputGainDb: number;
  eq: EqBand[];
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
  };
  limiter: {
    enabled: boolean;
    threshold: number;
    release: number;
  };
  stereoWidth: number;
};

// ── Projects (legacy DAW project structure) ───────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }),
  bpm: int("bpm").default(120),
  masterVolume: float("masterVolume").default(1),
  masterSettings: json("masterSettings"),
  aiInsights: text("aiInsights"),
  duration: float("duration").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  order: int("order").default(0),
  volume: float("volume").default(1),
  pan: float("pan").default(0),
  muted: boolean("muted").default(false),
  soloed: boolean("soloed").default(false),
  audioFileUrl: text("audioFileUrl"),
  audioFileKey: varchar("audioFileKey", { length: 512 }),
  audioFileName: varchar("audioFileName", { length: 255 }),
  audioDuration: float("audioDuration").default(0),
  waveformData: json("waveformData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Track = typeof tracks.$inferSelect;
export type InsertTrack = typeof tracks.$inferInsert;

export const trackEffects = mysqlTable("track_effects", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(),
  effectType: varchar("effectType", { length: 50 }).notNull(),
  params: json("params"),
  enabled: boolean("enabled").default(true),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackEffect = typeof trackEffects.$inferSelect;

export const automationLanes = mysqlTable("automation_lanes", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(),
  parameter: varchar("parameter", { length: 100 }).notNull(),
  points: json("points"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutomationLane = typeof automationLanes.$inferSelect;

// ── Subscriptions & Billing ────────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  planName: varchar("planName", { length: 100 }).notNull().default("basic"),
  status: mysqlEnum("status", [
    "active",
    "canceled",
    "past_due",
    "paused",
    "trialing",
  ])
    .notNull()
    .default("active"),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
