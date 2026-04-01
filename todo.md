# Intellimix — AI Mixing & Mastering Platform

## Migration & Core Setup
- [x] Migrate drizzle schema (pipeline_sessions, stems)
- [x] Apply DB migration SQL
- [x] Migrate server routers: pipeline, ai
- [x] Migrate client engine: StemAnalyser.ts, ProcessingPipeline.ts
- [x] Migrate Studio.tsx page
- [x] Migrate Home.tsx landing page
- [x] Migrate index.css with dark theme design system
- [x] Add storage.ts helper

## Bug Fixes
- [x] Fix HTTP 413 (Payload Too Large) on uploadOutput — replaced base64-over-tRPC with direct multipart/form-data uploads
- [x] Fix saveOutputs mapping: masterAiffUrl was incorrectly set to WAV URL (now correctly maps to AIFF upload result)
- [x] Fix saveOutputs mapping: masterFlacUrl was incorrectly set to WAV URL (now correctly maps to FLAC upload result)
- [x] Fix downloadUrls state: masterFlac44k/48k and masterAiff44k/48k are now populated

## New Features (Phase 1)
- [x] Add pipeline.getUploadCredentials tRPC mutation (returns upload URL + auth token for direct S3 upload)
- [x] Add pipeline.confirmUpload tRPC mutation (records confirmed file URL in DB after direct upload)
- [x] Refactor Studio.tsx to use direct S3 uploads via XHR with multipart/form-data (no proxy body limit)
- [x] Implement FLAC export: master_44k_32bit.flac and master_48k_32bit.flac (32-bit lossless WAV fallback)
- [x] Implement AIFF export: master_44k_24bit.aiff (audioBufferToAiff) and master_48k_32bit.aiff (audioBufferToAiff32)
- [x] Add per-file upload progress feedback with XHR onprogress events and log messages
- [x] Add retry logic for upload failures (3 attempts with 1.5s/3s backoff)
- [x] Add user-facing toast notifications for pipeline errors

## New Features (Phase 2 — Enhancement)

### True FLAC Encoding
- [x] Install libflacjs WASM library via npm (`pnpm add libflacjs`)
- [x] Add `audioBufferToFlacAsync` function using libflac.js WASM encoder (24-bit, compression level 5)
- [x] `audioBufferToFlac` (sync) already produces valid FLAC bitstream (fLaC magic bytes, STREAMINFO, verbatim frames)
- [x] `audioBufferToFlacAsync` uses WASM for better compression; falls back to sync encoder if WASM unavailable
- [x] Update master_flac_44k and master_flac_48k exports to use `audioBufferToFlacAsync`
- [x] FLAC download buttons show `.flac` extension and correct labels in UI

### Stem Upload Progress UI
- [x] Add `StemUploadProgress` component with per-stem progress bar (colour-coded by stem category)
- [x] Add `uploadProgress: number` and `uploaded: boolean` fields to `StemFile` interface
- [x] Implement `uploadStemDirect` helper that updates progress state at 10% / 30% / 60% / 100% milestones
- [x] Per-stem progress bars visible in the stem list during the "uploading" step
- [x] Uploaded stems show a green "Uploaded" badge with checkmark icon

### Session Resume
- [x] Add `pipeline.getSessionStatus` tRPC query — returns per-output-type status, missing list, and stem URLs
- [x] Add `pipeline.resumeSession` tRPC mutation — re-confirms missing outputs, marks session complete when all confirmed
- [x] Add "Resume" button in Session History for partial sessions (yellow warning banner)
- [x] Show per-output confirmation badges (✓ Mixdown / ✗ WAV / ✓ FLAC / ✗ AIFF) in the partial session card
- [x] `handleResumeSession` re-runs the pipeline on stored stem URLs and re-uploads only missing outputs
- [x] Resume state tracked in `resumeSessionId` and `isResuming` — button shows spinner during resume

## Tests
- [x] Existing tests migrated (auth.logout + intellimix suite = 12 tests)
- [x] New tests for getUploadCredentials (4 tests) and confirmUpload (2 tests)
- [x] New tests for getSessionStatus (3 tests) — partial/complete detection, missing output list, auth
- [x] New tests for resumeSession (4 tests) — complete on all confirmed, partial, stats update, auth
- [x] New tests for FLAC encoding (3 tests) — fLaC magic bytes, STREAMINFO header, async fallback
- [x] **All 28 tests passing** ✅

## Architecture Notes

### Direct Upload Flow (bypasses 413 proxy limit)
```
Client                          Server                    Storage API
  |                               |                           |
  |-- getUploadCredentials ------>|                           |
  |<-- { uploadUrl, authToken } --|                           |
  |                               |                           |
  |-- XHR POST (multipart) ---------------------------------->|
  |<-- { url } ------------------------------------------------|
  |                               |                           |
  |-- confirmUpload(fileUrl) ---->|                           |
  |<-- { url, fileKey } ----------|                           |
```

### Session Resume Flow
```
History Panel                   Server                    Storage API
  |                               |                           |
  |-- getSessionStatus ---------->|                           |
  |<-- { missingOutputTypes } ----|                           |
  |                               |                           |
  | [re-run pipeline on stem URLs]|                           |
  | [encode missing formats]      |                           |
  |                               |                           |
  |-- uploadOutputDirect (XHR) -------------------------------->|
  |<-- { url } --------------------------------------------------|
  |                               |                           |
  |-- resumeSession(uploads) ---->|                           |
  |<-- { isComplete, count } -----|                           |
```
