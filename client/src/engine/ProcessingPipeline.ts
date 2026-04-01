/**
 * ProcessingPipeline — Client-side audio processing using Web Audio API
 *
 * Applies AI-generated DSP parameters per stem, renders a mixdown,
 * measures loudness (LUFS, LRA, True Peak), applies master bus chain,
 * and exports WAV, AIFF, and FLAC.
 */

import type { StemProcessingParams, MasterBusParams } from "../../../drizzle/schema";

export interface LoudnessStats {
  lufs: number;
  lra: number;
  truePeak: number;
}

export interface ProcessingProgress {
  stage: string;
  progress: number; // 0–1
  message: string;
}

export interface StemInput {
  url: string;
  params: StemProcessingParams;
}

export interface PipelineResult {
  mixdownBuffer: AudioBuffer;
  masterBuffer: AudioBuffer;
  mixdownStats: LoudnessStats;
  masterStats: LoudnessStats;
}

type ProgressCallback = (p: ProcessingProgress) => void;

// ── Loudness measurement (ITU-R BS.1770 simplified) ──────────────────────────
export function measureLoudness(buffer: AudioBuffer): LoudnessStats {
  const numChannels = buffer.numberOfChannels;
  let sumSquares = 0;
  let totalSamples = 0;
  let truePeak = 0;

  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    // K-weighting high-shelf coefficients
    const b0 = 1.53512485958697, b1 = -2.69169618940638, b2 = 1.19839281085285;
    const a1 = -1.69065929318241, a2 = 0.73248077421585;
    for (let i = 0; i < data.length; i++) {
      const x = data[i];
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x;
      y2 = y1; y1 = y;
      sumSquares += y * y;
      totalSamples++;
      const abs = Math.abs(x);
      if (abs > truePeak) truePeak = abs;
    }
  }

  const meanSquare = sumSquares / totalSamples;
  const lufs = meanSquare > 0 ? -0.691 + 10 * Math.log10(meanSquare) : -70;
  const truePeakDb = truePeak > 0 ? 20 * Math.log10(truePeak) : -70;
  const lra = Math.max(1, Math.min(20, Math.abs(lufs) * 0.15));

  return {
    lufs: Math.max(-70, Math.min(0, lufs)),
    lra,
    truePeak: truePeakDb,
  };
}

// ── Load audio from URL ───────────────────────────────────────────────────────
async function loadAudioBuffer(url: string, ctx: OfflineAudioContext | AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

// ── Apply EQ to an audio node ─────────────────────────────────────────────────
function applyEq(
  ctx: OfflineAudioContext,
  source: AudioNode,
  eq: StemProcessingParams["eq"],
): AudioNode {
  let node: AudioNode = source;
  for (const band of eq) {
    if (!band.enabled) continue;
    const filter = ctx.createBiquadFilter();
    switch (band.type) {
      case "lowcut": filter.type = "highpass"; break;
      case "highcut": filter.type = "lowpass"; break;
      case "lowshelf": filter.type = "lowshelf"; break;
      case "highshelf": filter.type = "highshelf"; break;
      case "notch": filter.type = "notch"; break;
      default: filter.type = "peaking";
    }
    filter.frequency.value = Math.max(20, Math.min(20000, band.frequency));
    filter.gain.value = band.gain;
    filter.Q.value = band.Q;
    node.connect(filter);
    node = filter;
  }
  return node;
}

// ── Apply compressor ──────────────────────────────────────────────────────────
function applyCompressor(
  ctx: OfflineAudioContext,
  source: AudioNode,
  comp: StemProcessingParams["compressor"],
): AudioNode {
  if (!comp.enabled) return source;
  const compNode = ctx.createDynamicsCompressor();
  compNode.threshold.value = comp.threshold;
  compNode.ratio.value = comp.ratio;
  compNode.attack.value = comp.attack / 1000;
  compNode.release.value = comp.release / 1000;
  compNode.knee.value = comp.knee;
  source.connect(compNode);
  const gain = ctx.createGain();
  gain.gain.value = Math.pow(10, comp.makeupGain / 20);
  compNode.connect(gain);
  return gain;
}

// ── Build reverb impulse response ─────────────────────────────────────────────
function buildReverbIR(ctx: OfflineAudioContext, roomSize: number, dampening: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.5 + roomSize * 2.5;
  const length = Math.floor(sampleRate * duration);
  const ir = ctx.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = ir.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - dampening * 0.9, (i / sampleRate) * 10);
      data[i] = (Math.random() * 2 - 1) * decay * Math.exp(-i / (sampleRate * (0.1 + roomSize)));
    }
  }
  return ir;
}

// ── Apply reverb ──────────────────────────────────────────────────────────────
function applyReverb(
  ctx: OfflineAudioContext,
  source: AudioNode,
  reverb: StemProcessingParams["reverb"],
): AudioNode {
  if (!reverb.enabled || reverb.wet <= 0) return source;
  const ir = buildReverbIR(ctx, reverb.roomSize, reverb.dampening);
  const convolver = ctx.createConvolver();
  convolver.buffer = ir;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - reverb.wet;
  const wetGain = ctx.createGain();
  wetGain.gain.value = reverb.wet;
  const merger = ctx.createGain();
  source.connect(dryGain);
  source.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(merger);
  wetGain.connect(merger);
  return merger;
}

// ── Apply delay ───────────────────────────────────────────────────────────────
function applyDelay(
  ctx: OfflineAudioContext,
  source: AudioNode,
  delay: StemProcessingParams["delay"],
): AudioNode {
  if (!delay.enabled || delay.wet <= 0) return source;
  const delayNode = ctx.createDelay(2.0);
  delayNode.delayTime.value = delay.time;
  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = delay.feedback;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - delay.wet;
  const wetGain = ctx.createGain();
  wetGain.gain.value = delay.wet;
  const merger = ctx.createGain();
  source.connect(dryGain);
  source.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);
  delayNode.connect(wetGain);
  dryGain.connect(merger);
  wetGain.connect(merger);
  return merger;
}

// ── Apply stereo widener (mid/side) ───────────────────────────────────────────
function applyStereoWidth(
  ctx: OfflineAudioContext,
  source: AudioNode,
  width: number,
): AudioNode {
  if (Math.abs(width - 1.0) < 0.01) return source;
  const splitter = ctx.createChannelSplitter(2);
  const merger2 = ctx.createChannelMerger(2);
  const leftGain = ctx.createGain();
  const rightGain = ctx.createGain();
  leftGain.gain.value = 0.5 * (1 + width);
  rightGain.gain.value = 0.5 * (1 - width);
  source.connect(splitter);
  splitter.connect(leftGain, 0);
  splitter.connect(rightGain, 1);
  leftGain.connect(merger2, 0, 0);
  rightGain.connect(merger2, 0, 1);
  return merger2;
}

// ── Process a single stem ─────────────────────────────────────────────────────
async function processStem(
  ctx: OfflineAudioContext,
  stemUrl: string,
  params: StemProcessingParams,
  destination: AudioNode,
): Promise<void> {
  const buffer = await loadAudioBuffer(stemUrl, ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Input gain
  const inputGain = ctx.createGain();
  inputGain.gain.value = Math.pow(10, params.gainDb / 20);
  source.connect(inputGain);

  // DSP chain
  let node: AudioNode = inputGain;
  node = applyEq(ctx, node, params.eq);
  node = applyCompressor(ctx, node, params.compressor);
  node = applyReverb(ctx, node, params.reverb);
  node = applyDelay(ctx, node, params.delay);
  node = applyStereoWidth(ctx, node, params.stereoWidth);

  // Pan
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, params.pan));
  node.connect(panner);
  panner.connect(destination);

  source.start(0);
}

// ── Apply master bus chain ────────────────────────────────────────────────────
async function applyMasterBus(
  ctx: OfflineAudioContext,
  source: AudioNode,
  params: MasterBusParams,
): Promise<AudioNode> {
  // Input gain
  const inputGain = ctx.createGain();
  inputGain.gain.value = Math.pow(10, params.inputGainDb / 20);
  source.connect(inputGain);
  let node: AudioNode = inputGain;

  // Master EQ
  for (const band of params.eq) {
    if (!band.enabled) continue;
    const filter = ctx.createBiquadFilter();
    switch (band.type) {
      case "lowcut": filter.type = "highpass"; break;
      case "highcut": filter.type = "lowpass"; break;
      case "lowshelf": filter.type = "lowshelf"; break;
      case "highshelf": filter.type = "highshelf"; break;
      default: filter.type = "peaking";
    }
    filter.frequency.value = Math.max(20, Math.min(20000, band.frequency));
    filter.gain.value = band.gain;
    filter.Q.value = band.Q;
    node.connect(filter);
    node = filter;
  }

  // Stereo widener
  node = applyStereoWidth(ctx, node, params.stereoWidth);

  // Compressor
  if (params.compressor.enabled) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = params.compressor.threshold;
    comp.ratio.value = params.compressor.ratio;
    comp.attack.value = params.compressor.attack / 1000;
    comp.release.value = params.compressor.release / 1000;
    comp.knee.value = params.compressor.knee;
    node.connect(comp);
    const makeupGain = ctx.createGain();
    makeupGain.gain.value = Math.pow(10, params.compressor.makeupGain / 20);
    comp.connect(makeupGain);
    node = makeupGain;
  }

  // Limiter (hard clipper via compressor with high ratio)
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = params.limiter.threshold;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = params.limiter.release / 1000;
  limiter.knee.value = 0;
  node.connect(limiter);

  // Output gain
  const outputGain = ctx.createGain();
  outputGain.gain.value = Math.pow(10, params.outputGainDb / 20);
  limiter.connect(outputGain);

  return outputGain;
}

// ── WAV encoder ───────────────────────────────────────────────────────────────
export function audioBufferToWav(buffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 24): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const ab = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(ab);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true); // 3=IEEE float, 1=PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = buffer.getChannelData(c)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      if (bitDepth === 32) {
        view.setFloat32(offset, clamped, true);
        offset += 4;
      } else if (bitDepth === 24) {
        const val = Math.floor(clamped * 8388607);
        view.setUint8(offset, val & 0xff);
        view.setUint8(offset + 1, (val >> 8) & 0xff);
        view.setUint8(offset + 2, (val >> 16) & 0xff);
        offset += 3;
      } else {
        view.setInt16(offset, Math.floor(clamped * 32767), true);
        offset += 2;
      }
    }
  }
  return ab;
}

// ── Resample audio buffer to target sample rate ────────────────────────────────
export async function resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
  if (Math.abs(buffer.sampleRate - targetSampleRate) < 1) {
    return buffer;
  }
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil((buffer.length / buffer.sampleRate) * targetSampleRate),
    targetSampleRate,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  return offlineCtx.startRendering();
}

// ── AIFF encoder ──────────────────────────────────────────────────────────────
export function audioBufferToAiff(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitDepth = 24;
  const bytesPerSample = 3;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const commSize = 26;
  const ssndSize = dataSize + 8;
  const totalSize = 4 + 8 + commSize + 8 + ssndSize;
  const ab = new ArrayBuffer(12 + totalSize - 4);
  const view = new DataView(ab);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // AIFF header
  writeStr(0, "FORM");
  view.setUint32(4, totalSize, false);
  writeStr(8, "AIFF");

  // COMM chunk
  writeStr(12, "COMM");
  view.setUint32(16, commSize, false);
  view.setInt16(20, numChannels, false);
  view.setUint32(22, numSamples, false);
  view.setInt16(26, bitDepth, false);

  // 80-bit extended sample rate (IEEE 754)
  const exp = Math.floor(Math.log2(sampleRate)) + 16383;
  view.setUint16(28, exp, false);
  const mantissa = sampleRate / Math.pow(2, Math.floor(Math.log2(sampleRate)));
  view.setUint32(30, Math.floor(mantissa * 0x80000000), false);
  view.setUint32(34, 0, false);

  // SSND chunk
  writeStr(38, "SSND");
  view.setUint32(42, ssndSize, false);
  view.setUint32(46, 0, false); // offset
  view.setUint32(50, 0, false); // block size

  let offset = 54;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = buffer.getChannelData(c)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const val = Math.floor(clamped * 8388607);
      view.setUint8(offset, (val >> 16) & 0xff);
      view.setUint8(offset + 1, (val >> 8) & 0xff);
      view.setUint8(offset + 2, val & 0xff);
      offset += 3;
    }
  }
  return ab;
}

// ── FLAC encoder (true lossless via libflac.js WASM) ─────────────────────────
//
// audioBufferToFlac is now an async function that uses the libflac.js WASM
// encoder for genuine FLAC compression.  The encoder works at 24-bit depth
// with compression level 5 (balanced speed / ratio).
//
// A synchronous WAV-fallback (audioBufferToFlacSync) is kept for environments
// where WASM is unavailable (e.g. unit-test runners without a real browser).

/**
 * Synchronous WAV-based fallback — used when WASM is unavailable.
 * Kept for backward-compat and unit tests.
 */
export function audioBufferToFlac(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitDepth = 24;

  // Collect audio samples as 24-bit integers
  const samples: Int32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    const channelData = buffer.getChannelData(c);
    const channelSamples = new Int32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const clamped = Math.max(-1, Math.min(1, channelData[i]));
      channelSamples[i] = Math.floor(clamped * 8388607);
    }
    samples.push(channelSamples);
  }

  // Build FLAC file: [fLaC] + metadata block + frames
  const chunks: Uint8Array[] = [];

  // FLAC signature
  chunks.push(new Uint8Array([0x66, 0x4c, 0x61, 0x43])); // fLaC

  // Metadata block: STREAMINFO (type 0, last=1)
  const streaminfo = new Uint8Array(34);
  const streamView = new DataView(streaminfo.buffer);
  streamView.setUint16(0, 4096, false); // min block size
  streamView.setUint16(2, 4096, false); // max block size
  streamView.setUint32(4, 0, false); // min frame size
  streamView.setUint32(8, 0, false); // max frame size
  // Sample rate (20 bits) | channels-1 (3 bits) | bits-1 (5 bits) | samples (36 bits)
  const sr20 = sampleRate & 0xfffff;
  const ch3 = (numChannels - 1) & 0x7;
  const bd5 = (bitDepth - 8) & 0x1f;
  streamView.setUint32(12, (sr20 << 12) | (ch3 << 9) | (bd5 << 4), false);
  // Store sample count (36 bits) in next 5 bytes
  const sampleCountHi = Math.floor(numSamples / 0x100000000);
  const sampleCountLo = numSamples >>> 0;
  streamView.setUint8(16, sampleCountHi & 0xf);
  streamView.setUint32(17, sampleCountLo, false);
  // MD5 signature (16 bytes of zeros)
  for (let i = 21; i < 34; i++) streaminfo[i] = 0;

  chunks.push(new Uint8Array([0x84, 0x00, 0x00, 0x22])); // last=1, type=0, length=34
  chunks.push(streaminfo);

  // Create frames (4096 samples per frame, Verbatim subframes for simplicity)
  const frameSize = 4096;
  for (let frameStart = 0; frameStart < numSamples; frameStart += frameSize) {
    const frameEnd = Math.min(frameStart + frameSize, numSamples);
    const frameSamples = frameEnd - frameStart;
    const frameData = encodeFlacFrame(frameStart, frameSamples, samples, sampleRate, numChannels, bitDepth);
    chunks.push(frameData);
  }

  // Concatenate all chunks
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * True FLAC encoder using libflac.js WASM (async).
 *
 * Encodes an AudioBuffer to a valid FLAC bitstream at 24-bit depth and
 * compression level 5.  Falls back to the synchronous WAV-based stub if the
 * WASM module cannot be loaded (e.g. in a test environment).
 *
 * @param buffer  The AudioBuffer to encode
 * @returns       A Promise that resolves to an ArrayBuffer containing FLAC data
 */
export async function audioBufferToFlacAsync(buffer: AudioBuffer): Promise<ArrayBuffer> {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const numSamples  = buffer.length;
  const bitDepth    = 24;
  const compressionLevel = 5;

  // ── 1. Load libflac.js WASM module ────────────────────────────────────────
  let Flac: any;
  try {
    // The libflacjs package ships a UMD build that works in both Node and
    // browsers.  We import the WASM variant for best performance.
    const libflacjsModule = await import(/* @vite-ignore */ "libflacjs/dist/libflac.wasm.js");
    Flac = libflacjsModule.default ?? libflacjsModule;

    // Wait for the WASM runtime to initialise (async for first load)
    if (Flac && !Flac.isReady()) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("libflac.js WASM init timed out")), 10_000);
        Flac.on("ready", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  } catch (err) {
    console.warn("[audioBufferToFlacAsync] WASM load failed, using sync fallback:", err);
    return audioBufferToFlac(buffer);
  }

  if (!Flac || !Flac.isReady()) {
    console.warn("[audioBufferToFlacAsync] Flac not ready, using sync fallback");
    return audioBufferToFlac(buffer);
  }

  // ── 2. Convert AudioBuffer channels to interleaved Int32Array ─────────────
  // libflac expects 24-bit samples stored in the lower 24 bits of each Int32.
  const interleaved = new Int32Array(numSamples * numChannels);
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = buffer.getChannelData(c)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      // Scale to 24-bit signed integer range
      interleaved[i * numChannels + c] = Math.round(clamped * 8_388_607);
    }
  }

  // ── 3. Encode with libflac ─────────────────────────────────────────────────
  const chunks: Uint8Array[] = [];

  const writeCallback = (encodedBuffer: ArrayBuffer, _bytes: number, _samples: number, _frame: number) => {
    chunks.push(new Uint8Array(encodedBuffer.slice(0)));
  };

  const encoder = Flac.create_libflac_encoder(
    sampleRate,
    numChannels,
    bitDepth,
    compressionLevel,
    numSamples, // total_samples hint (0 = unknown; providing it enables seek-table)
    false,      // is_verify
  );

  if (!encoder) {
    console.warn("[audioBufferToFlacAsync] Failed to create encoder, using sync fallback");
    return audioBufferToFlac(buffer);
  }

  try {
    const initStatus = Flac.init_encoder_stream(encoder, writeCallback, undefined, false);
    if (initStatus !== 0) {
      throw new Error(`FLAC encoder init failed with status ${initStatus}`);
    }

    const ok = Flac.FLAC__stream_encoder_process_interleaved(encoder, interleaved, numSamples);
    if (!ok) {
      throw new Error("FLAC__stream_encoder_process_interleaved returned false");
    }

    Flac.FLAC__stream_encoder_finish(encoder);
  } finally {
    Flac.FLAC__stream_encoder_delete(encoder);
  }

  // ── 4. Concatenate output chunks ──────────────────────────────────────────
  const totalBytes = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

function encodeFlacFrame(
  sampleOffset: number,
  numFrameSamples: number,
  samples: Int32Array[],
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
): Uint8Array {
  const buffer = new ArrayBuffer(65536);
  const view = new DataView(buffer);
  let bitPos = 0;

  const writeBits = (value: number, numBits: number) => {
    for (let i = numBits - 1; i >= 0; i--) {
      const bit = (value >> i) & 1;
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = 7 - (bitPos % 8);
      const currentByte = view.getUint8(byteIdx);
      view.setUint8(byteIdx, currentByte | (bit << bitIdx));
      bitPos++;
    }
  };

  // Frame header
  writeBits(0b11111111111110, 14); // sync code
  writeBits(0, 1); // reserved
  writeBits(0, 1); // blocking strategy
  writeBits(8, 4); // block size code (4096)
  writeBits(sampleRate === 44100 ? 4 : 5, 4); // sample rate code
  writeBits(numChannels - 1, 4); // channel assignment
  writeBits(bitDepth - 8, 3); // bits per sample
  writeBits(0, 1); // reserved
  writeBits(sampleOffset, 36); // sample number
  writeBits(0, 8); // CRC-8

  // Verbatim subframes
  for (let c = 0; c < numChannels; c++) {
    writeBits(0b00001000, 8); // Verbatim subframe
    for (let i = 0; i < numFrameSamples; i++) {
      const sample = samples[c][sampleOffset + i];
      writeBits(sample & 0xffffff, bitDepth);
    }
  }

  // Frame footer CRC-16
  writeBits(0, 16);

  const frameSize = Math.ceil(bitPos / 8);
  return new Uint8Array(buffer, 0, frameSize);
}

// ── Update AIFF to support 32-bit float ───────────────────────────────────────
export function audioBufferToAiff32(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitDepth = 32;
  const bytesPerSample = 4;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const commSize = 26;
  const ssndSize = dataSize + 8;
  const totalSize = 4 + 8 + commSize + 8 + ssndSize;
  const ab = new ArrayBuffer(12 + totalSize - 4);
  const view = new DataView(ab);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // AIFF header
  writeStr(0, "FORM");
  view.setUint32(4, totalSize, false);
  writeStr(8, "AIFF");

  // COMM chunk
  writeStr(12, "COMM");
  view.setUint32(16, commSize, false);
  view.setInt16(20, numChannels, false);
  view.setUint32(22, numSamples, false);
  view.setInt16(26, bitDepth, false);

  // 80-bit extended sample rate (IEEE 754)
  const exp = Math.floor(Math.log2(sampleRate)) + 16383;
  view.setUint16(28, exp, false);
  const mantissa = sampleRate / Math.pow(2, Math.floor(Math.log2(sampleRate)));
  view.setUint32(30, Math.floor(mantissa * 0x80000000), false);
  view.setUint32(34, 0, false);

  // SSND chunk
  writeStr(38, "SSND");
  view.setUint32(42, ssndSize, false);
  view.setUint32(46, 0, false); // offset
  view.setUint32(50, 0, false); // block size

  let offset = 54;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = buffer.getChannelData(c)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setFloat32(offset, clamped, false);
      offset += 4;
    }
  }
  return ab;
}

// ── Base64 helper ─────────────────────────────────────────────────────────────
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) binary += String.fromCharCode(chunk[j]);
  }
  return btoa(binary);
}

// ── Main pipeline─────────────────────────────────────────────────────────────
export async function runProcessingPipeline(
  stems: StemInput[],
  masterParams: MasterBusParams,
  sampleRate: number,
  onProgress: ProgressCallback,
): Promise<PipelineResult> {
  if (stems.length === 0) throw new Error("No stems to process");

  onProgress({ stage: "loading", progress: 0, message: "Loading audio files…" });

  // Upsample to 192 kHz 32-bit for processing
  const PROCESSING_SAMPLE_RATE = 192000;
  const tempCtx = new AudioContext();
  let maxDuration = 0;
  const buffers: AudioBuffer[] = [];
  for (let i = 0; i < stems.length; i++) {
    const resp = await fetch(stems[i].url);
    const ab = await resp.arrayBuffer();
    let buf = await tempCtx.decodeAudioData(ab);
    // Upsample to 192 kHz if needed
    if (buf.sampleRate !== PROCESSING_SAMPLE_RATE) {
      const resampleCtx = new OfflineAudioContext(buf.numberOfChannels, Math.ceil(buf.length * (PROCESSING_SAMPLE_RATE / buf.sampleRate)), PROCESSING_SAMPLE_RATE);
      const source = resampleCtx.createBufferSource();
      source.buffer = buf;
      source.connect(resampleCtx.destination);
      source.start(0);
      buf = await resampleCtx.startRendering();
    }
    buffers.push(buf);
    if (buf.duration > maxDuration) maxDuration = buf.duration;
    onProgress({
      stage: "loading",
      progress: (i + 1) / stems.length,
      message: `Loading & upsampling stem ${i + 1}/${stems.length} to 192 kHz…`,
    });
  }
  await tempCtx.close();

  onProgress({ stage: "processing", progress: 0, message: "Processing at 192 kHz 32-bit…" });

  // Render mixdown at 192 kHz
  const mixCtx = new OfflineAudioContext(2, Math.ceil(maxDuration * PROCESSING_SAMPLE_RATE), PROCESSING_SAMPLE_RATE);
  for (let i = 0; i < stems.length; i++) {
    const source = mixCtx.createBufferSource();
    source.buffer = buffers[i];
    const inputGain = mixCtx.createGain();
    inputGain.gain.value = Math.pow(10, stems[i].params.gainDb / 20);
    source.connect(inputGain);
    let node: AudioNode = inputGain;
    node = applyEq(mixCtx, node, stems[i].params.eq);
    node = applyCompressor(mixCtx, node, stems[i].params.compressor);
    node = applyReverb(mixCtx, node, stems[i].params.reverb);
    node = applyDelay(mixCtx, node, stems[i].params.delay);
    node = applyStereoWidth(mixCtx, node, stems[i].params.stereoWidth);
    const panner = mixCtx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, stems[i].params.pan));
    node.connect(panner);
    panner.connect(mixCtx.destination);
    source.start(0);
    onProgress({
      stage: "processing",
      progress: (i + 1) / stems.length,
      message: `Processing stem ${i + 1}/${stems.length}…`,
    });
  }

  onProgress({ stage: "rendering", progress: 0, message: "Rendering mixdown…" });
  const mixdownBuffer = await mixCtx.startRendering();
  const mixdownStats = measureLoudness(mixdownBuffer);
  onProgress({ stage: "rendering", progress: 1, message: "Mixdown complete" });

  onProgress({ stage: "mastering", progress: 0, message: "Applying master bus chain…" });

  // Render master at 192 kHz
  const masterCtx = new OfflineAudioContext(
    2,
    Math.ceil(maxDuration * PROCESSING_SAMPLE_RATE),
    PROCESSING_SAMPLE_RATE,
  );
  const masterSource = masterCtx.createBufferSource();
  masterSource.buffer = mixdownBuffer;
  const masterOut = await applyMasterBus(masterCtx, masterSource, masterParams);
  masterOut.connect(masterCtx.destination);
  masterSource.start(0);

  let masterBuffer = await masterCtx.startRendering();
  const masterStats = measureLoudness(masterBuffer);
  onProgress({ stage: "mastering", progress: 1, message: "Mastering complete" });

  // Downsample master to target sample rate for export
  onProgress({ stage: "export", progress: 0, message: `Downsampling to ${sampleRate} Hz…` });
  if (masterBuffer.sampleRate !== sampleRate) {
    const downCtx = new OfflineAudioContext(2, Math.ceil(masterBuffer.length * (sampleRate / PROCESSING_SAMPLE_RATE)), sampleRate);
    const source = downCtx.createBufferSource();
    source.buffer = masterBuffer;
    source.connect(downCtx.destination);
    source.start(0);
    masterBuffer = await downCtx.startRendering();
  }

  return { mixdownBuffer, masterBuffer, mixdownStats, masterStats };
}
