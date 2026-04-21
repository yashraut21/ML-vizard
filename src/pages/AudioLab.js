import { gsap } from 'gsap';
import { decodeAudioFile, getMonoSignal, computeFFT, computeSpectrogram, signalToMatrix, toDb } from '../core/audioOps.js';
import { drawHeatmap } from '../utils/colorMaps.js';
import katex from 'katex';

const AUDIO_OPS = [
  { id: 'waveform',    label: 'Waveform Matrix',    symbol: 'x[n]' },
  { id: 'fft',         label: 'FFT Spectrum',        symbol: 'X[k]' },
  { id: 'spectrogram', label: 'Spectrogram (STFT)',  symbol: 'S[t,f]' },
  { id: 'windowed',    label: 'Windowed Signal',     symbol: 'w[n]x[n]' },
];

const FORMULAS = {
  waveform:    { tex: 'x[n] \\in \\mathbb{R}^N', desc: 'The raw time-domain signal. Each row of the matrix is a time window of samples.' },
  fft:         { tex: 'X[k] = \\sum_{n=0}^{N-1} x[n]\\, e^{-2\\pi i kn/N}', desc: 'The Discrete Fourier Transform maps the time domain to frequency. Each X[k] is a complex number whose magnitude tells you how much frequency k is present.' },
  spectrogram: { tex: 'S[t,f] = \\left|\\text{STFT}(x)\\right|^2', desc: 'Short-Time Fourier Transform: split signal into overlapping frames, compute FFT on each. The 2D result is a time-frequency heatmap — the spectrogram.' },
  windowed:    { tex: 'y[n] = w[n] \\cdot x[n], \\quad w[n]=\\tfrac{1}{2}\\left(1-\\cos\\tfrac{2\\pi n}{N-1}\\right)', desc: 'The Hann window smoothly tapers the signal to zero at its edges, reducing spectral leakage in the FFT.' },
};

const DEMO_TONES = [
  { label: '440 Hz (A4)', freq: [440] },
  { label: '3 Harmonics', freq: [440, 880, 1320] },
  { label: 'Major Chord', freq: [261, 329, 392] },
  { label: 'Noise',       freq: null },
];

export function AudioLab() {
  let signal = null;
  let sampleRate = 44100;
  let currentOp = 'waveform';

  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">🎵 Audio <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">See audio as a matrix. Upload a sound file or generate a demo tone, then visualise the time-domain waveform, frequency spectrum (FFT), and full spectrogram.</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:var(--gap-md)">
      <div class="card-header">
        <span class="card-title">Audio Source</span>
        <label class="btn btn-sm btn-secondary" style="cursor:pointer">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Upload Audio
          <input type="file" id="audio-upload" accept="audio/*" style="display:none">
        </label>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        ${DEMO_TONES.map((t,i) => `<button class="btn btn-sm btn-secondary" id="demo-tone-${i}" data-tone="${i}">${t.label}</button>`).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 260px;gap:var(--gap-md);min-height:60vh">
      <!-- Visualizer column -->
      <div style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <!-- Op tabs -->
        <div class="card" style="padding:var(--gap-sm)">
          <div class="flex gap-sm" id="audio-op-tabs">
            ${AUDIO_OPS.map(op => `
              <button class="btn btn-sm ${op.id==='waveform'?'btn-primary':'btn-secondary'}" id="atab-${op.id}" data-op="${op.id}" style="flex:1">
                ${op.label}
              </button>`).join('')}
          </div>
        </div>

        <!-- Main canvas -->
        <div class="card" style="flex:1">
          <div class="card-header">
            <span class="card-title" id="audio-view-title">Waveform</span>
            <span class="text-muted text-mono" id="audio-info">No signal loaded</span>
          </div>
          <canvas id="audio-main-canvas" style="width:100%;height:280px;border-radius:var(--radius-sm);background:var(--bg-elevated);display:block"></canvas>
        </div>

        <!-- Matrix display -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Signal as Matrix <span style="font-size:0.7em;color:var(--text-muted)">(first 16 windows × 16 values)</span></span>
          </div>
          <canvas id="signal-matrix-canvas" style="width:100%;height:140px;border-radius:var(--radius-sm);image-rendering:pixelated"></canvas>
        </div>

        <!-- Formula -->
        <div class="formula-box" id="audio-formula-box">
          <div class="formula-title">Formula</div>
          <div id="audio-formula-katex"></div>
          <div class="formula-desc" id="audio-formula-desc"></div>
        </div>
      </div>

      <!-- Right panel: matrix numbers -->
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <p class="op-panel-title">Signal Matrix Preview</p>
        <div id="audio-matrix-display" class="matrix-display" style="max-height:400px;flex:1"></div>
        <div>
          <p class="op-panel-title" style="margin-bottom:8px">Stats</p>
          <div id="audio-stats" class="text-muted text-mono" style="font-size:0.72rem;line-height:1.9"></div>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    setupUpload();
    setupDemoTones();
    setupOpTabs();
    loadDemoTone(0);
  });

  function setupUpload() {
    el.querySelector('#audio-upload').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const buf = await decodeAudioFile(file);
        signal = getMonoSignal(buf);
        sampleRate = buf.sampleRate;
        el.querySelector('#audio-info').textContent = `${(signal.length/sampleRate).toFixed(2)}s · ${sampleRate} Hz`;
        render();
      } catch(err) {
        console.error(err);
        alert('Could not decode audio. Try a WAV or MP3 file.');
      }
    });
  }

  function setupDemoTones() {
    DEMO_TONES.forEach((tone, i) => {
      el.querySelector(`#demo-tone-${i}`).addEventListener('click', () => loadDemoTone(i));
    });
  }

  function loadDemoTone(i) {
    const tone = DEMO_TONES[i];
    sampleRate = 44100;
    const len = sampleRate * 2; // 2 seconds
    signal = new Float32Array(len);
    if (tone.freq === null) {
      // White noise
      for (let n = 0; n < len; n++) signal[n] = (Math.random() * 2 - 1) * 0.5;
    } else {
      for (let n = 0; n < len; n++) {
        let v = 0;
        tone.freq.forEach(f => { v += Math.sin(2 * Math.PI * f * n / sampleRate); });
        signal[n] = v / tone.freq.length * 0.8;
      }
    }
    el.querySelector('#audio-info').textContent = `2.0s · ${sampleRate} Hz · ${tone.label}`;
    render();
  }

  function setupOpTabs() {
    AUDIO_OPS.forEach(op => {
      el.querySelector(`#atab-${op.id}`).addEventListener('click', () => {
        el.querySelectorAll('[data-op]').forEach(b => {
          b.classList.replace('btn-primary', 'btn-secondary');
        });
        el.querySelector(`#atab-${op.id}`).classList.replace('btn-secondary', 'btn-primary');
        currentOp = op.id;
        render();
      });
    });
  }

  function render() {
    if (!signal) return;
    renderFormula();
    renderMainCanvas();
    renderMatrixDisplay();
    renderStats();
  }

  function renderMainCanvas() {
    const canvas = el.querySelector('#audio-main-canvas');
    canvas.width  = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 280;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentOp === 'waveform' || currentOp === 'windowed') {
      drawWaveform(ctx, canvas, currentOp === 'windowed');
    } else if (currentOp === 'fft') {
      drawFFT(ctx, canvas);
    } else if (currentOp === 'spectrogram') {
      drawSpectrogram(canvas);
    }

    el.querySelector('#audio-view-title').textContent = AUDIO_OPS.find(o=>o.id===currentOp)?.label || '';
    gsap.fromTo(canvas, { opacity: 0.3 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  }

  function drawWaveform(ctx, canvas, windowed = false) {
    const w = canvas.width, h = canvas.height;
    const slice = signal.slice(0, Math.min(signal.length, sampleRate * 0.5)); // 0.5s
    let display;
    if (windowed) {
      // Apply Hann window
      display = slice.map((v, i) => v * 0.5 * (1 - Math.cos(2*Math.PI*i/(slice.length-1))));
    } else {
      display = slice;
    }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h*i/4); ctx.lineTo(w, h*i/4);
      ctx.stroke();
    }
    // Zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

    // Draw gradient line
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(0.5, '#06b6d4');
    grad.addColorStop(1, '#ec4899');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    display.forEach((v, i) => {
      const x = (i / display.length) * w;
      const y = h/2 - v * (h/2 - 10);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill below
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(124,58,237,0.15)');
    fillGrad.addColorStop(1, 'rgba(6,182,212,0.0)');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.moveTo(0, h/2);
    display.forEach((v, i) => {
      const x = (i / display.length) * w;
      const y = h/2 - v * (h/2 - 10);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h/2); ctx.closePath(); ctx.fill();

    if (windowed) {
      // Draw window envelope
      ctx.strokeStyle = 'rgba(253,231,37,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < w; i++) {
        const t = i / w;
        const env = 0.5 * (1 - Math.cos(2*Math.PI*t));
        ctx.lineTo(i, h/2 - env * (h/2 - 10));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawFFT(ctx, canvas) {
    const w = canvas.width, h = canvas.height;
    const magnitudes = computeFFT(signal, 4096);
    const db = toDb(magnitudes);
    const minDb = Math.max(-80, Math.min(...db));
    const maxDb = Math.max(...db);
    const range = maxDb - minDb || 1;
    const freqPerBin = sampleRate / 4096;
    const maxFreqBin = Math.min(magnitudes.length, Math.ceil(20000 / freqPerBin));

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.05)';
    [0.25,0.5,0.75].forEach(t=>{
      ctx.beginPath(); ctx.moveTo(0,h*t); ctx.lineTo(w,h*t); ctx.stroke();
    });
    // Freq labels
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.font = '10px JetBrains Mono, monospace';
    [1000,2000,4000,8000,16000].forEach(f=>{
      const x = (f/freqPerBin/maxFreqBin)*w;
      if (x < w) {
        ctx.fillStyle='rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,0.35)';
        ctx.fillText(`${f>=1000?f/1000+'k':f}Hz`, x+3, h-8);
      }
    });

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#7c3aed'); grad.addColorStop(0.5, '#06b6d4'); grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    const barW = Math.max(1, w / maxFreqBin);
    db.slice(0, maxFreqBin).forEach((d, i) => {
      const t = (d - minDb) / range;
      const bh = t * (h - 10);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(i*barW, h - bh, Math.max(1, barW-1), bh);
    });
    ctx.globalAlpha = 1;
  }

  function drawSpectrogram(canvas) {
    const frames = computeSpectrogram(signal, 512, 128);
    const matrix2D = frames.map(f => f.slice(0, 128)); // first 128 freq bins
    // Normalise log
    const logMat = matrix2D.map(row => row.map(v => Math.log1p(v * 100)));
    drawHeatmap(canvas, logMat, 'magma');
    // Scale canvas display
    canvas.style.imageRendering = 'auto';
  }

  function renderMatrixDisplay() {
    const container = el.querySelector('#audio-matrix-display');
    const mat = signalToMatrix(signal, 16, 64).slice(0, 12);
    let html = '';
    mat.forEach((row, r) => {
      html += `<div class="m-row" style="margin-bottom:2px">`;
      row.forEach(v => {
        const t = (v + 1) / 2;
        html += `<span class="m-cell" style="min-width:36px;color:hsl(${Math.round(t*200+140)},70%,65%)">${v.toFixed(2)}</span>`;
      });
      html += `</div>`;
    });
    container.innerHTML = html;

    // Matrix on spectrogram canvas
    const mc = el.querySelector('#signal-matrix-canvas');
    if (mat.length > 0) {
      drawHeatmap(mc, mat, 'plasma');
      mc.style.imageRendering = 'pixelated';
    }
  }

  function renderStats() {
    const n = signal.length;
    const rms = Math.sqrt(signal.reduce((s,v)=>s+v*v,0)/n);
    const max = signal.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
    const el2 = el.querySelector('#audio-stats');
    el2.innerHTML = `
      Length: ${n.toLocaleString()} samples<br>
      Duration: ${(n/sampleRate).toFixed(3)} s<br>
      Sample rate: ${sampleRate} Hz<br>
      RMS amplitude: ${rms.toFixed(4)}<br>
      Peak amplitude: ${max.toFixed(4)}<br>
      Matrix dims: 12 × 16 (shown)
    `;
  }

  function renderFormula() {
    const f = FORMULAS[currentOp];
    if (!f) return;
    try { katex.render(f.tex, el.querySelector('#audio-formula-katex'), { throwOnError:false, displayMode:true }); }
    catch {}
    el.querySelector('#audio-formula-desc').textContent = f.desc;
  }

  return el;
}
