/**
 * Audio operations — FFT, spectrogram, waveform matrix
 */

/**
 * Decode an audio file into an AudioBuffer
 */
export async function decodeAudioFile(file) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

/**
 * Extract mono Float32Array from AudioBuffer
 */
export function getMonoSignal(audioBuffer) {
  const ch0 = audioBuffer.getChannelData(0);
  if (audioBuffer.numberOfChannels === 1) return ch0;
  const ch1 = audioBuffer.getChannelData(1);
  return ch0.map((v, i) => (v + ch1[i]) / 2);
}

/**
 * Compute DFT magnitude spectrum (uses Cooley-Tukey FFT)
 */
export function computeFFT(signal, n = 2048) {
  const size = Math.min(n, nextPow2(n));
  const slice = new Float32Array(size);
  for (let i = 0; i < size; i++) slice[i] = signal[i] ?? 0;
  const { re, im } = fft(slice);
  const half = size / 2;
  return Array.from({ length: half }, (_, i) => Math.sqrt(re[i]*re[i] + im[i]*im[i]));
}

/**
 * Convert signal magnitude array to dB
 */
export function toDb(magnitudes, ref = 1) {
  return magnitudes.map(m => 20 * Math.log10(Math.max(m / ref, 1e-10)));
}

/**
 * Generate STFT spectrogram data
 * Returns 2D array [frames][freqBins]
 */
export function computeSpectrogram(signal, fftSize = 512, hopSize = 256) {
  const window = hannWindow(fftSize);
  const frames = [];
  for (let start = 0; start + fftSize <= signal.length; start += hopSize) {
    const frame = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) frame[i] = signal[start + i] * window[i];
    const { re, im } = fft(frame);
    frames.push(Array.from({ length: fftSize / 2 }, (_, i) =>
      Math.sqrt(re[i]*re[i] + im[i]*im[i])
    ));
  }
  return frames;
}

/**
 * Convert signal to matrix representation (rows of time windows)
 */
export function signalToMatrix(signal, windowSize = 64, stride = 64) {
  const rows = [];
  for (let start = 0; start + windowSize <= signal.length; start += stride) {
    rows.push(Array.from(signal.slice(start, start + windowSize)));
    if (rows.length >= 16) break;
  }
  return rows;
}

/**
 * Apply convolution in time domain (FIR filter / echo)
 */
export function convolveSignal(signal, ir) {
  const out = new Float32Array(signal.length + ir.length - 1);
  for (let i = 0; i < signal.length; i++) {
    for (let j = 0; j < ir.length; j++) {
      out[i + j] += signal[i] * ir[j];
    }
  }
  return out;
}

/**
 * Apply frequency-domain EQ via FFT multiply
 */
export function applyFrequencyGain(signal, gainFn) {
  const n = nextPow2(signal.length);
  const padded = new Float32Array(n);
  padded.set(signal);
  const { re, im } = fft(padded);
  for (let i = 0; i < re.length; i++) {
    const g = gainFn(i / n);
    re[i] *= g; im[i] *= g;
  }
  return ifft(re, im);
}

// ---- Windowing ----
export function hannWindow(n) {
  return Float32Array.from({ length: n }, (_, i) =>
    0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  );
}

// ---- Simple Cooley-Tukey FFT ----
function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function fft(signal) {
  const n = signal.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = signal[i];
  fftInPlace(re, im, n);
  return { re, im };
}

function ifft(re, im) {
  const n = re.length;
  const imCopy = new Float64Array(im.map(v => -v));
  const reCopy = new Float64Array(re);
  fftInPlace(reCopy, imCopy, n);
  return Float32Array.from(reCopy.map(v => v / n));
}

function fftInPlace(re, im, n) {
  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i+k], uIm = im[i+k];
        const vRe = re[i+k+len/2]*curRe - im[i+k+len/2]*curIm;
        const vIm = re[i+k+len/2]*curIm + im[i+k+len/2]*curRe;
        re[i+k]         = uRe + vRe; im[i+k]         = uIm + vIm;
        re[i+k+len/2]   = uRe - vRe; im[i+k+len/2]   = uIm - vIm;
        const newCurRe = curRe*wRe - curIm*wIm;
        curIm = curRe*wIm + curIm*wRe;
        curRe = newCurRe;
      }
    }
  }
}
