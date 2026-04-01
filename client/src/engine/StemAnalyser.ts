/**
 * StemAnalyser — Real-time per-stem audio feature extraction
 *
 * Runs entirely in the browser using Web Audio API + OfflineAudioContext.
 * Extracts: RMS, peak, crest factor, spectral centroid, spectral rolloff,
 * spectral flatness, dynamic range, stereo width, and clipping/silence flags.
 */

export interface StemAudioFeatures {
  rmsDb: number;
  peakDb: number;
  crestFactorDb: number;
  spectralCentroidHz: number;
  spectralRolloff85Hz: number;
  spectralFlatness: number;
  dynamicRangeDb: number;
  stereoWidth: number;
  hasClipping: boolean;
  isSilent: boolean;
  durationSeconds: number;
  channels: number;
  sampleRate: number;
}

function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

function computeRms(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

function computePeak(data: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

function computeSpectralFeatures(
  data: Float32Array,
  sampleRate: number,
): { centroid: number; rolloff85: number; flatness: number } {
  const fftSize = 512;
  const start = Math.max(0, Math.floor(data.length / 2) - fftSize / 2);
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize && start + i < data.length; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    window[i] = data[start + i] * hann;
  }

  const numBins = fftSize / 2;
  const magnitudes = new Float32Array(numBins);
  for (let k = 0; k < numBins; k++) {
    let re = 0;
    let im = 0;
    const step = Math.max(1, Math.floor(fftSize / 64));
    for (let n = 0; n < fftSize; n += step) {
      const angle = (-2 * Math.PI * k * n) / fftSize;
      re += window[n] * Math.cos(angle);
      im += window[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(re * re + im * im);
  }

  const freqResolution = sampleRate / fftSize;
  let totalEnergy = 0;
  let weightedFreqSum = 0;
  for (let k = 0; k < numBins; k++) {
    const mag = magnitudes[k];
    const freq = k * freqResolution;
    totalEnergy += mag;
    weightedFreqSum += mag * freq;
  }
  const centroid = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 1000;

  let cumEnergy = 0;
  let rolloff85 = sampleRate / 2;
  const threshold85 = totalEnergy * 0.85;
  for (let k = 0; k < numBins; k++) {
    cumEnergy += magnitudes[k];
    if (cumEnergy >= threshold85) {
      rolloff85 = k * freqResolution;
      break;
    }
  }

  let geometricMean = 0;
  let arithmeticMean = 0;
  let nonZeroCount = 0;
  for (let k = 0; k < numBins; k++) {
    const mag = magnitudes[k];
    if (mag > 0) {
      geometricMean += Math.log(mag);
      arithmeticMean += mag;
      nonZeroCount++;
    }
  }
  const flatness =
    nonZeroCount > 0
      ? Math.exp(geometricMean / nonZeroCount) / (arithmeticMean / nonZeroCount)
      : 0;

  return { centroid, rolloff85, flatness: Math.min(1, Math.max(0, flatness)) };
}

function computeDynamicRange(data: Float32Array, sampleRate: number): number {
  const frameSize = Math.floor(sampleRate * 0.1);
  const rmsValues: number[] = [];
  for (let i = 0; i + frameSize < data.length; i += frameSize) {
    const frame = data.slice(i, i + frameSize);
    const rms = computeRms(frame);
    if (rms > 0.0001) rmsValues.push(linearToDb(rms));
  }
  if (rmsValues.length < 2) return 0;
  rmsValues.sort((a, b) => a - b);
  const p10 = rmsValues[Math.floor(rmsValues.length * 0.1)];
  const p90 = rmsValues[Math.floor(rmsValues.length * 0.9)];
  return Math.max(0, (p90 ?? 0) - (p10 ?? 0));
}

function computeStereoWidth(left: Float32Array, right: Float32Array): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let midEnergy = 0;
  let sideEnergy = 0;
  for (let i = 0; i < left.length; i++) {
    const mid = (left[i] + right[i]) * 0.5;
    const side = (left[i] - right[i]) * 0.5;
    midEnergy += mid * mid;
    sideEnergy += side * side;
  }
  const total = midEnergy + sideEnergy;
  return total > 0 ? sideEnergy / total : 0;
}

export async function analyseStem(file: File): Promise<StemAudioFeatures> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  let buffer: AudioBuffer;
  try {
    buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioCtx.close();
  }

  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const durationSeconds = buffer.duration;

  const ch0 = buffer.getChannelData(0);
  const rms = computeRms(ch0);
  const peak = computePeak(ch0);
  const rmsDb = linearToDb(rms);
  const peakDb = linearToDb(peak);
  const crestFactorDb = peakDb - rmsDb;
  const { centroid, rolloff85, flatness } = computeSpectralFeatures(ch0, sampleRate);
  const dynamicRangeDb = computeDynamicRange(ch0, sampleRate);

  let stereoWidth = 0;
  if (channels >= 2) {
    const ch1 = buffer.getChannelData(1);
    stereoWidth = computeStereoWidth(ch0, ch1);
  }

  const hasClipping = peak > 0.99;
  const isSilent = rmsDb < -60;

  return {
    rmsDb: isFinite(rmsDb) ? rmsDb : -70,
    peakDb: isFinite(peakDb) ? peakDb : -70,
    crestFactorDb: isFinite(crestFactorDb) ? crestFactorDb : 0,
    spectralCentroidHz: centroid,
    spectralRolloff85Hz: rolloff85,
    spectralFlatness: flatness,
    dynamicRangeDb,
    stereoWidth,
    hasClipping,
    isSilent,
    durationSeconds,
    channels,
    sampleRate,
  };
}
