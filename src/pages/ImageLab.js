import { gsap } from 'gsap';
import {
  loadImageToCanvas, getImageData, putImageData, imageToMatrix,
  transposeImage, applyConvolution, applyColorMatrix, scalarMultiplyImage,
  inverseImage, extractChannel, toGrayscale, applyAffineTransform, svdCompressImage,
} from '../core/imageOps.js';
import { KERNELS, rotationMatrix2D, shearMatrix } from '../core/matrixOps.js';
import { SAMPLE_IMAGES, loadSampleToCanvas } from '../utils/demoAssets.js';
import { COLOR_MAP_NAMES } from '../utils/colorMaps.js';
import katex from 'katex';

const PATCH_SIZE = 8;

/** All available operations with their default param state */
const OP_DEFS = {
  none:      { label: 'Original',           symbol: 'A',                tag: 'View',    params: {} },
  transpose: { label: 'Transpose',          symbol: 'A^T',              tag: 'Linear',  params: {} },
  grayscale: { label: 'Grayscale',          symbol: '\\bar{A}',         tag: 'Color',   params: {} },
  inverse:   { label: 'Colour Inverse',     symbol: '255-A',            tag: 'Pixel',   params: {} },
  scalar:    { label: 'Scalar Multiply',    symbol: '\\lambda A',       tag: 'Scale',   params: { lambda: 1.5 } },
  colormat:  { label: 'Color Matrix (3×3)', symbol: 'MA',               tag: 'Linear',  params: { matrix: [[1,0,0],[0,1,0],[0,0,1]] } },
  conv:      { label: 'Convolution',        symbol: 'A * K',            tag: 'Signal',  params: { kernel: 'blur', custom: null } },
  channel:   { label: 'Channel Decompose',  symbol: '[R/G/B]',          tag: 'Color',   params: { channel: 'r' } },
  svd:       { label: 'SVD Compression',    symbol: 'U\\Sigma V^T',     tag: 'Advanced',params: { rank: 20 } },
  rotate:    { label: 'Rotation Matrix',    symbol: 'R(\\theta)',        tag: 'Affine',  params: { angle: 45 } },
  shear:     { label: 'Shear Transform',    symbol: 'S_{xy}',           tag: 'Affine',  params: { sx: 0.3, sy: 0 } },
};

const FORMULAS = {
  none:      { tex: 'B = A', desc: 'The image is displayed as-is. Each pixel is an element of the matrix A.' },
  transpose: { tex: 'B = A^T, \\quad B_{ij} = A_{ji}', desc: 'Rows become columns. For a colour image each channel is transposed independently.' },
  grayscale: { tex: 'g = 0.299R + 0.587G + 0.114B', desc: 'Weighted sum of RGB channels. The weights match human luminance perception.' },
  inverse:   { tex: 'B_{ij} = 255 - A_{ij}', desc: 'Subtract each pixel from the max value — the pixel-space analogue of negation.' },
  scalar:    { tex: 'B = \\lambda A, \\quad \\lambda \\in \\mathbb{R}', desc: 'Multiply every element by λ. Values above 255 are clamped to 255.' },
  colormat:  { tex: '\\begin{bmatrix}R\'\\\\G\'\\\\B\'\\end{bmatrix} = M\\begin{bmatrix}R\\\\G\\\\B\\end{bmatrix}', desc: 'Apply a 3×3 linear map to the colour vector of every pixel.' },
  conv:      { tex: '(A*K)[i,j]=\\sum_m\\sum_n A[i-m,j-n]K[m,n]', desc: 'Slide a kernel over the image. Each output pixel is a weighted sum of its neighbours.' },
  channel:   { tex: 'A = A_R + A_G + A_B', desc: 'Decompose the colour image into three single-channel matrices.' },
  svd:       { tex: 'A_k = \\sum_{i=1}^{k} \\sigma_i u_i v_i^T', desc: 'Keep only the top-k singular values. Lower rank = more compression and information loss.' },
  rotate:    { tex: 'R(\\theta)=\\begin{bmatrix}\\cos\\theta&-\\sin\\theta\\\\\\sin\\theta&\\cos\\theta\\end{bmatrix}', desc: 'Multiply pixel coordinates by a 2D rotation matrix centred on the image.' },
  shear:     { tex: 'S=\\begin{bmatrix}1&s_x\\\\s_y&1\\end{bmatrix}', desc: 'Shear maps pixel positions proportionally along x or y.' },
};

const COLOR_MAT_PRESETS = {
  identity: [[1,0,0],[0,1,0],[0,0,1]],
  sepia:    [[0.393,0.769,0.189],[0.349,0.686,0.168],[0.272,0.534,0.131]],
  'swap r↔g': [[0,1,0],[1,0,0],[0,0,1]],
  cool:     [[0.8,0.1,0.2],[0.1,0.9,0.1],[0.2,0.0,1.0]],
  warm:     [[1.1,0.05,0],[0.05,0.95,0],[0,0.05,0.8]],
  invert:   [[-1,0,0],[0,-1,0],[0,0,-1]],
};

let stepIdCounter = 0;

export function ImageLab() {
  let originalImageData = null;
  // Pipeline: ordered array of { id, opId, params, intermediateData }
  let pipeline = [];
  let selectedStepId = null;
  let cmapSelect = 'viridis';

  const el = document.createElement('div');
  el.className = 'page lab-page';

  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">🖼 Image <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">Build an operation <em>pipeline</em> — chain any combination of transforms with custom parameters and see every intermediate result.</p>
      </div>
    </div>

    <!-- Source selector -->
    <div class="card" style="margin-bottom:var(--gap-md)">
      <div class="card-header">
        <span class="card-title">
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Image Source
        </span>
        <div class="flex gap-sm items-center">
          <select id="cmap-select" style="background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:var(--radius-sm);padding:4px 10px;font-size:0.75rem">
            ${COLOR_MAP_NAMES.map(n=>`<option value="${n}">${n}</option>`).join('')}
          </select>
          <label class="btn btn-sm btn-secondary" style="cursor:pointer">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Upload
            <input type="file" id="img-upload" accept="image/*" style="display:none">
          </label>
        </div>
      </div>
      <div class="sample-grid" id="sample-grid"></div>
    </div>

    <!-- Main layout: input | pipeline | output -->
    <div style="display:grid;grid-template-columns:320px 1fr 320px;gap:var(--gap-md);align-items:start">

      <!-- LEFT: Input image + matrix -->
      <div style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Input A</span>
            <span class="text-muted text-mono" id="img-dims">—</span>
          </div>
          <div class="canvas-wrap" style="aspect-ratio:1">
            <canvas id="input-canvas"></canvas>
            <span class="canvas-label">Original</span>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Pixel Patch <span style="font-size:0.7em;color:var(--text-muted)">(8×8)</span></span>
          </div>
          <div id="input-matrix-display" class="matrix-display"></div>
        </div>
      </div>

      <!-- CENTER: Pipeline builder -->
      <div style="display:flex;flex-direction:column;gap:var(--gap-md)">

        <!-- Pipeline steps -->
        <div class="card" style="min-height:340px">
          <div class="card-header">
            <span class="card-title">⛓ Operation Pipeline</span>
            <div class="flex gap-sm">
              <button class="btn btn-sm btn-secondary" id="reset-pipeline" data-tip="Clear all steps">Reset</button>
              <button class="btn btn-sm btn-primary" id="add-step-btn">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                Add Step
              </button>
            </div>
          </div>
          <div id="pipeline-list" style="display:flex;flex-direction:column;gap:8px;min-height:100px"></div>
          <div id="pipeline-empty" style="text-align:center;padding:var(--gap-xl) var(--gap-md);color:var(--text-muted);font-size:0.85rem">
            Click <strong style="color:var(--accent-cyan)">Add Step</strong> to start building your pipeline
          </div>
        </div>

        <!-- Add-step picker (hidden until Add Step clicked) -->
        <div class="card" id="op-picker" style="display:none">
          <div class="card-header">
            <span class="card-title">Choose Operation to Add</span>
            <button class="btn-icon" id="close-picker">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            ${Object.entries(OP_DEFS).filter(([k])=>k!=='none').map(([id, def])=>`
              <button class="op-button" id="pick-${id}" data-opid="${id}">
                <span>${def.label}</span>
                <span class="op-badge">${def.tag}</span>
              </button>`).join('')}
          </div>
        </div>

        <!-- Selected step params -->
        <div class="card" id="step-params-card" style="display:none">
          <div class="card-header">
            <span class="card-title" id="step-params-title">Step Parameters</span>
          </div>
          <div id="step-params-area"></div>
        </div>

        <!-- Intermediate strip -->
        <div class="card" id="intermediates-card" style="display:none">
          <div class="card-header">
            <span class="card-title">Intermediate Results</span>
          </div>
          <div id="intermediates-strip" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px"></div>
        </div>

        <!-- Formula -->
        <div class="formula-box" id="formula-box" style="display:none">
          <div class="formula-title">Last Step Formula</div>
          <div id="formula-katex"></div>
          <div class="formula-desc" id="formula-desc"></div>
        </div>
      </div>

      <!-- RIGHT: Output image + matrix -->
      <div style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Output B</span>
            <button class="btn btn-sm btn-secondary" id="download-btn">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Save
            </button>
          </div>
          <div class="canvas-wrap" style="aspect-ratio:1">
            <canvas id="output-canvas"></canvas>
            <span class="canvas-label" id="output-label">Output</span>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Transformed Patch B</span>
          </div>
          <div id="output-matrix-display" class="matrix-display"></div>
        </div>
        <!-- Stats card -->
        <div class="card">
          <div class="card-header"><span class="card-title">Pipeline Summary</span></div>
          <div id="pipeline-summary" class="text-muted text-mono" style="font-size:0.72rem;line-height:1.9">
            No operations applied.
          </div>
        </div>
      </div>
    </div>
  `;

  // ---- Bootstrap ----
  requestAnimationFrame(() => {
    setupSampleGrid();
    setupUpload();
    setupAddStep();
    setupDownload();
    setupCmapSelect();
    document.getElementById('reset-pipeline')?.addEventListener('click', () => {
      pipeline = [];
      selectedStepId = null;
      renderPipeline();
      runPipeline();
    });
    loadSample('gradient');
  });

  // ============================================================
  // Sample grid
  // ============================================================
  function setupSampleGrid() {
    const grid = el.querySelector('#sample-grid');
    SAMPLE_IMAGES.forEach(s => {
      const div = document.createElement('div');
      div.className = 'sample-thumb';
      div.id = `sample-${s.id}`;
      const c = document.createElement('canvas');
      s.draw(c, 64);
      div.appendChild(c);
      div.addEventListener('click', () => loadSample(s.id));
      grid.appendChild(div);
    });
  }

  function setupUpload() {
    el.querySelector('#img-upload').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const canvas = el.querySelector('#input-canvas');
      await loadImageToCanvas(file, canvas, 400);
      originalImageData = getImageData(canvas);
      el.querySelector('#img-dims').textContent = `${canvas.width}×${canvas.height}`;
      runPipeline();
    });
  }

  function loadSample(id) {
    el.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('active'));
    el.querySelector(`#sample-${id}`)?.classList.add('active');
    const canvas = el.querySelector('#input-canvas');
    loadSampleToCanvas(id, canvas, 300);
    originalImageData = getImageData(canvas);
    el.querySelector('#img-dims').textContent = `${canvas.width}×${canvas.height}`;
    runPipeline();
  }

  function setupCmapSelect() {
    el.querySelector('#cmap-select').addEventListener('change', e => {
      cmapSelect = e.target.value;
      runPipeline();
    });
  }

  // ============================================================
  // Add-step picker
  // ============================================================
  function setupAddStep() {
    el.querySelector('#add-step-btn').addEventListener('click', () => {
      const picker = el.querySelector('#op-picker');
      picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    });
    el.querySelector('#close-picker').addEventListener('click', () => {
      el.querySelector('#op-picker').style.display = 'none';
    });
    Object.keys(OP_DEFS).filter(k=>k!=='none').forEach(opId => {
      el.querySelector(`#pick-${opId}`)?.addEventListener('click', () => {
        addStep(opId);
        el.querySelector('#op-picker').style.display = 'none';
      });
    });
  }

  // ============================================================
  // Pipeline management
  // ============================================================
  function addStep(opId) {
    const def = OP_DEFS[opId];
    const params = JSON.parse(JSON.stringify(def.params)); // deep clone defaults
    // For colormat, ensure matrix is a fresh copy
    if (opId === 'colormat') params.matrix = [[1,0,0],[0,1,0],[0,0,1]];
    if (opId === 'conv') params.custom = null; // use preset name initially

    const step = { id: stepIdCounter++, opId, params, intermediateData: null };
    pipeline.push(step);
    selectedStepId = step.id;
    renderPipeline();
    renderStepParams(step);
    runPipeline();

    // Animate in
    const el2 = document.getElementById(`step-card-${step.id}`);
    if (el2) gsap.fromTo(el2, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: 'back.out(1.5)' });
  }

  function removeStep(id) {
    const card = document.getElementById(`step-card-${id}`);
    if (card) {
      gsap.to(card, {
        opacity: 0, x: 20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0,
        duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          pipeline = pipeline.filter(s => s.id !== id);
          if (selectedStepId === id) selectedStepId = pipeline.length ? pipeline[pipeline.length-1].id : null;
          renderPipeline();
          if (selectedStepId !== null) {
            const s = pipeline.find(x => x.id === selectedStepId);
            if (s) renderStepParams(s);
          } else {
            el.querySelector('#step-params-card').style.display = 'none';
          }
          runPipeline();
        }
      });
    }
  }

  function duplicateStep(id) {
    const src = pipeline.find(s => s.id === id);
    if (!src) return;
    const params = JSON.parse(JSON.stringify(src.params));
    const step = { id: stepIdCounter++, opId: src.opId, params, intermediateData: null };
    const idx = pipeline.indexOf(src);
    pipeline.splice(idx + 1, 0, step);
    selectedStepId = step.id;
    renderPipeline();
    renderStepParams(step);
    runPipeline();
  }

  function moveStep(id, dir) {
    const idx = pipeline.findIndex(s => s.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= pipeline.length) return;
    [pipeline[idx], pipeline[newIdx]] = [pipeline[newIdx], pipeline[idx]];
    renderPipeline();
    runPipeline();
  }

  // ============================================================
  // Render pipeline list
  // ============================================================
  function renderPipeline() {
    const list = el.querySelector('#pipeline-list');
    const empty = el.querySelector('#pipeline-empty');
    list.innerHTML = '';
    empty.style.display = pipeline.length === 0 ? 'block' : 'none';

    pipeline.forEach((step, idx) => {
      const def = OP_DEFS[step.opId];
      const isSelected = step.id === selectedStepId;
      const card = document.createElement('div');
      card.id = `step-card-${step.id}`;
      card.style.cssText = `
        display:flex;align-items:center;gap:8px;
        padding:10px 12px;border-radius:var(--radius-md);
        border:1px solid ${isSelected ? 'var(--accent-violet)' : 'var(--border)'};
        background:${isSelected ? 'hsla(265,85%,65%,0.08)' : 'var(--bg-elevated)'};
        cursor:pointer;transition:all 0.15s;
      `;

      card.innerHTML = `
        <span style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);min-width:18px;text-align:center">${idx+1}</span>
        <span style="font-size:0.78rem;font-weight:600;color:${isSelected?'var(--accent-violet)':'var(--text-primary)'};flex:1">${def.label}</span>
        <span style="font-size:0.65rem;padding:2px 7px;border-radius:var(--radius-full);background:hsla(265,85%,65%,0.12);color:var(--accent-violet)">${def.tag}</span>
        <div class="flex gap-sm" style="gap:4px">
          <button title="Move up"   class="step-move-up   btn-icon" data-id="${step.id}" style="width:26px;height:26px">↑</button>
          <button title="Move down" class="step-move-down btn-icon" data-id="${step.id}" style="width:26px;height:26px">↓</button>
          <button title="Duplicate" class="step-dup       btn-icon" data-id="${step.id}" style="width:26px;height:26px;font-size:0.7rem">⧉</button>
          <button title="Remove"    class="step-remove    btn-icon" data-id="${step.id}" style="width:26px;height:26px;color:hsl(0,70%,65%)">✕</button>
        </div>
      `;

      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        selectedStepId = step.id;
        renderPipeline();
        renderStepParams(step);
      });
      card.querySelector('.step-move-up').addEventListener('click',   e => { e.stopPropagation(); moveStep(step.id, -1); });
      card.querySelector('.step-move-down').addEventListener('click', e => { e.stopPropagation(); moveStep(step.id, +1); });
      card.querySelector('.step-dup').addEventListener('click',       e => { e.stopPropagation(); duplicateStep(step.id); });
      card.querySelector('.step-remove').addEventListener('click',    e => { e.stopPropagation(); removeStep(step.id); });

      list.appendChild(card);
    });

    // Thumbnail strip
    const strip = el.querySelector('#intermediates-strip');
    const card2 = el.querySelector('#intermediates-card');
    strip.innerHTML = '';
    if (pipeline.length > 0) {
      card2.style.display = 'block';
      pipeline.forEach((step, idx) => {
        const thumb = document.createElement('div');
        thumb.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;cursor:pointer';
        const tc = document.createElement('canvas');
        tc.width = 80; tc.height = 80;
        tc.style.cssText = `border-radius:6px;border:2px solid ${step.id===selectedStepId?'var(--accent-violet)':'var(--border)'};`;
        if (step.intermediateData) {
          tc.width  = step.intermediateData.width;
          tc.height = step.intermediateData.height;
          putImageData(tc, step.intermediateData);
          tc.style.width = '72px'; tc.style.height = '72px';
        }
        const lbl = document.createElement('span');
        lbl.textContent = `${idx+1}. ${OP_DEFS[step.opId].label}`;
        lbl.style.cssText = 'font-size:0.62rem;color:var(--text-muted);font-family:var(--font-mono);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center';
        thumb.appendChild(tc);
        thumb.appendChild(lbl);
        thumb.addEventListener('click', () => {
          selectedStepId = step.id;
          renderPipeline();
          renderStepParams(step);
          // Show this intermediate in output
          if (step.intermediateData) {
            const oc = el.querySelector('#output-canvas');
            oc.width = step.intermediateData.width;
            oc.height = step.intermediateData.height;
            putImageData(oc, step.intermediateData);
            updateMatrixDisplay('#output-matrix-display', step.intermediateData);
          }
        });
        strip.appendChild(thumb);
      });
    } else {
      card2.style.display = 'none';
    }

    // Summary
    const sumEl = el.querySelector('#pipeline-summary');
    if (pipeline.length === 0) {
      sumEl.textContent = 'No operations applied.';
    } else {
      sumEl.innerHTML = pipeline.map((s, i) =>
        `Step ${i+1}: <span style="color:var(--accent-cyan)">${OP_DEFS[s.opId].label}</span>${describeParams(s)}`
      ).join('<br>');
    }
  }

  function describeParams(step) {
    const p = step.params;
    switch (step.opId) {
      case 'scalar':  return ` (λ = ${p.lambda.toFixed(2)})`;
      case 'svd':     return ` (rank = ${p.rank})`;
      case 'rotate':  return ` (θ = ${p.angle}°)`;
      case 'shear':   return ` (sx=${p.sx.toFixed(2)}, sy=${p.sy.toFixed(2)})`;
      case 'conv':    return ` (${p.custom ? 'custom' : p.kernel})`;
      case 'channel': return ` (${p.channel.toUpperCase()})`;
      default: return '';
    }
  }

  // ============================================================
  // Render parameters for selected step
  // ============================================================
  function renderStepParams(step) {
    const card = el.querySelector('#step-params-card');
    const area = el.querySelector('#step-params-area');
    const title = el.querySelector('#step-params-title');
    card.style.display = 'block';
    title.textContent = `Step Parameters — ${OP_DEFS[step.opId].label}`;
    area.innerHTML = '';

    const update = () => { runPipeline(); renderPipeline(); };

    switch (step.opId) {
      case 'none':
      case 'transpose':
      case 'grayscale':
      case 'inverse':
        area.innerHTML = '<p class="text-muted" style="font-size:0.82rem">No parameters for this operation.</p>';
        break;

      case 'scalar': buildSliderParam(area, 'λ (multiplier)', 0, 4, 0.01, step.params, 'lambda', update); break;

      case 'svd': {
        buildSliderParam(area, 'Rank k', 1, 120, 1, step.params, 'rank', update);
        const note = document.createElement('p');
        note.className = 'text-muted';
        note.style.fontSize = '0.8rem';
        note.style.marginTop = '8px';
        note.textContent = 'Lower rank = more compression. Try rank 1, 5, 10, 50 to see the progression.';
        area.appendChild(note);
        break;
      }

      case 'rotate': buildSliderParam(area, 'Angle θ (degrees)', -180, 180, 1, step.params, 'angle', update, v => `${v}°`); break;

      case 'shear': {
        buildSliderParam(area, 'Shear X (sx)', -1.5, 1.5, 0.01, step.params, 'sx', update);
        buildSliderParam(area, 'Shear Y (sy)', -1.5, 1.5, 0.01, step.params, 'sy', update);
        break;
      }

      case 'channel': {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex gap-sm';
        ['r','g','b','gray'].forEach(ch => {
          const btn = document.createElement('button');
          btn.className = `btn btn-sm ${step.params.channel===ch?'btn-primary':'btn-secondary'}`;
          btn.textContent = ch === 'gray' ? 'Gray' : ch.toUpperCase();
          btn.style.flex = '1';
          btn.addEventListener('click', () => {
            step.params.channel = ch;
            renderStepParams(step);
            update();
          });
          wrapper.appendChild(btn);
        });
        area.appendChild(wrapper);
        break;
      }

      case 'conv': buildConvParams(area, step, update); break;
      case 'colormat': buildColorMatParams(area, step, update); break;
    }

    // Show formula for this step
    renderFormula(step.opId);
  }

  function buildSliderParam(container, label, min, max, step2, paramsObj, key, onChange, fmtFn = null) {
    const val = paramsObj[key];
    const fmt = fmtFn ? fmtFn(val) : (Number.isInteger(val) ? val : parseFloat(val).toFixed(2));
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrap';
    wrapper.style.marginBottom = '10px';
    wrapper.innerHTML = `
      <div class="slider-label">${label} <span id="sv-${key}">${fmt}</span></div>
      <input type="range" min="${min}" max="${max}" step="${step2}" value="${val}" id="sl-${key}">
    `;
    const slider = wrapper.querySelector(`#sl-${key}`);
    const valEl  = wrapper.querySelector(`#sv-${key}`);
    updateSliderTrack(slider, min, max);
    slider.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      paramsObj[key] = v;
      valEl.textContent = fmtFn ? fmtFn(v) : (Number.isInteger(step2) ? v : v.toFixed(2));
      updateSliderTrack(slider, min, max);
      onChange();
    });
    container.appendChild(wrapper);
  }

  function buildConvParams(container, step, update) {
    // Preset buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'flex gap-sm';
    presetRow.style.flexWrap = 'wrap';
    presetRow.style.marginBottom = '10px';
    Object.keys(KERNELS).forEach(k => {
      const btn = document.createElement('button');
      btn.className = `btn btn-sm ${(!step.params.custom && step.params.kernel===k) ? 'btn-primary' : 'btn-secondary'}`;
      btn.textContent = k;
      btn.addEventListener('click', () => {
        step.params.kernel = k;
        step.params.custom = null;
        buildConvParams(container, step, update);
        update();
      });
      presetRow.appendChild(btn);
    });
    container.appendChild(presetRow);

    // Custom kernel grid
    const lbl = document.createElement('p');
    lbl.className = 'text-muted';
    lbl.style.cssText = 'font-size:0.78rem;margin-bottom:6px';
    lbl.textContent = 'Edit kernel values:';
    container.appendChild(lbl);

    const kernel = step.params.custom || KERNELS[step.params.kernel];
    const grid = document.createElement('div');
    grid.className = 'kernel-grid';
    grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    kernel.forEach((row, y) => {
      row.forEach((val, x) => {
        const inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.value = val.toFixed(4);
        inp.addEventListener('input', e => {
          if (!step.params.custom) step.params.custom = KERNELS[step.params.kernel].map(r=>[...r]);
          step.params.custom[y][x] = parseFloat(e.target.value) || 0;
          update();
        });
        grid.appendChild(inp);
      });
    });
    container.appendChild(grid);

    // Kernel sum info
    const kk = step.params.custom || KERNELS[step.params.kernel];
    const sum = kk.flat().reduce((s,v)=>s+v,0);
    const info = document.createElement('p');
    info.className = 'text-muted';
    info.style.cssText = 'font-size:0.72rem;margin-top:8px';
    info.textContent = `Kernel sum: ${sum.toFixed(3)} ${Math.abs(sum) < 0.01 ? '(edge detect / high-pass)' : sum > 0.99 && sum < 1.01 ? '(preserves brightness)' : '(changes brightness)'}`;
    container.appendChild(info);
  }

  function buildColorMatParams(container, step, update) {
    // Preset buttons
    const presetRow = document.createElement('div');
    presetRow.className = 'flex gap-sm';
    presetRow.style.cssText = 'flex-wrap:wrap;margin-bottom:10px';
    Object.entries(COLOR_MAT_PRESETS).forEach(([name, m]) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-secondary';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        step.params.matrix = m.map(r=>[...r]);
        buildColorMatParams(container, step, update);
        update();
      });
      presetRow.appendChild(btn);
    });
    container.appendChild(presetRow);

    // 3×3 grid
    const lbl = document.createElement('p');
    lbl.className = 'text-muted';
    lbl.style.cssText = 'font-size:0.78rem;margin-bottom:6px';
    lbl.textContent = 'Edit 3×3 colour transform M:';
    container.appendChild(lbl);

    const grid = document.createElement('div');
    grid.className = 'kernel-grid';
    grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    step.params.matrix.forEach((row, y) => {
      row.forEach((val, x) => {
        const inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.value = val.toFixed(3);
        inp.addEventListener('input', e => {
          step.params.matrix[y][x] = parseFloat(e.target.value) || 0;
          update();
        });
        grid.appendChild(inp);
      });
    });
    container.appendChild(grid);

    // Row labels
    const rowLbls = document.createElement('div');
    rowLbls.style.cssText = 'display:flex;justify-content:space-around;margin-top:4px';
    rowLbls.innerHTML = ['R\'','G\'','B\''].map(l=>`<span style="font-size:0.68rem;color:var(--text-muted)">${l}</span>`).join('');
    container.appendChild(rowLbls);
  }

  // ============================================================
  // Run the full pipeline
  // ============================================================
  function runPipeline() {
    if (!originalImageData) return;

    let current = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width, originalImageData.height
    );

    pipeline.forEach(step => {
      try {
        current = applyStep(step, current);
        step.intermediateData = copyImageData(current);
      } catch (err) {
        console.warn(`Step ${step.opId} error:`, err);
        step.intermediateData = copyImageData(current);
      }
    });

    // Draw final output
    const oc = el.querySelector('#output-canvas');
    oc.width  = current.width;
    oc.height = current.height;
    putImageData(oc, current);
    gsap.fromTo(oc.parentElement,
      { opacity: 0.4, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
    );

    // Matrix patches
    updateMatrixDisplay('#input-matrix-display', originalImageData);
    updateMatrixDisplay('#output-matrix-display', current);

    // Output label
    if (pipeline.length === 0) {
      el.querySelector('#output-label').textContent = 'B = A (no ops)';
      el.querySelector('#formula-box').style.display = 'none';
    } else {
      const last = pipeline[pipeline.length - 1];
      el.querySelector('#output-label').textContent = `B = ${OP_DEFS[last.opId].label}(…)`;
      el.querySelector('#formula-box').style.display = 'block';
      renderFormula(last.opId);
    }

    renderPipeline(); // refresh thumbnails
  }

  function applyStep(step, imageData) {
    const p = step.params;
    switch (step.opId) {
      case 'none':      return copyImageData(imageData);
      case 'transpose': return transposeImage(imageData);
      case 'grayscale': return toGrayscale(imageData);
      case 'inverse':   return inverseImage(imageData);
      case 'scalar':    return scalarMultiplyImage(imageData, p.lambda);
      case 'colormat':  return applyColorMatrix(imageData, p.matrix);
      case 'conv':      return applyConvolution(imageData, p.custom || KERNELS[p.kernel]);
      case 'channel':
        if (p.channel === 'gray') return toGrayscale(imageData);
        return extractChannel(imageData, p.channel);
      case 'svd':       return svdCompressImage(imageData, Math.max(1, Math.round(p.rank)));
      case 'rotate':    return applyAffineTransform(imageData, rotationMatrix2D(p.angle));
      case 'shear':     return applyAffineTransform(imageData, shearMatrix(p.sx, p.sy));
      default:          return copyImageData(imageData);
    }
  }

  function copyImageData(id) {
    return new ImageData(new Uint8ClampedArray(id.data), id.width, id.height);
  }

  // ============================================================
  // Matrix display
  // ============================================================
  function updateMatrixDisplay(selector, imageData) {
    const container = el.querySelector(selector);
    if (!container) return;
    const patch = imageToMatrix(imageData, 0, 0, PATCH_SIZE, PATCH_SIZE);
    const vals = patch.flat();
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    let html = '<div class="matrix-inner"><span class="matrix-bracket">⎡</span><div>';
    patch.forEach(row => {
      html += '<div class="m-row">';
      row.forEach(val => {
        const t = (val - min) / range;
        const [r,g,b] = cmapSample(cmapSelect, t);
        html += `<span class="m-cell" style="background:rgba(${r},${g},${b},0.18);color:hsl(${Math.round(t*220+120)},70%,72%)">${val}</span>`;
      });
      html += '</div>';
    });
    html += '</div><span class="matrix-bracket">⎦</span></div>';
    container.innerHTML = html;

    gsap.fromTo(container.querySelectorAll('.m-cell'),
      { scale: 0.85, opacity: 0.3 },
      { scale: 1, opacity: 1, duration: 0.3, stagger: { amount: 0.25, from: 'random' }, ease: 'back.out(1.5)' }
    );
  }

  // ============================================================
  // Formula
  // ============================================================
  function renderFormula(opId) {
    const f = FORMULAS[opId];
    if (!f) return;
    el.querySelector('#formula-box').style.display = 'block';
    try { katex.render(f.tex, el.querySelector('#formula-katex'), { throwOnError: false, displayMode: true }); }
    catch {}
    el.querySelector('#formula-desc').textContent = f.desc;
  }

  // ============================================================
  // Download
  // ============================================================
  function setupDownload() {
    el.querySelector('#download-btn').addEventListener('click', () => {
      const canvas = el.querySelector('#output-canvas');
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ml-vizard_pipeline.png`;
      a.click();
    });
  }

  return el;
}

// ============================================================
// Helpers
// ============================================================
function updateSliderTrack(slider, min, max) {
  const mn = parseFloat(min ?? slider.min);
  const mx = parseFloat(max ?? slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - mn) / (mx - mn)) * 100;
  slider.style.setProperty('--pct', `${pct}%`);
}

const PAL = {
  viridis:   [[68,1,84],[41,120,142],[68,190,112],[253,231,37]],
  plasma:    [[13,8,135],[168,15,152],[242,131,52],[252,253,191]],
  magma:     [[0,0,4],[83,24,121],[217,107,84],[252,253,191]],
  coolwarm:  [[59,76,192],[221,220,220],[180,4,38]],
  grayscale: [[0,0,0],[255,255,255]],
};
function cmapSample(name, t) {
  const pal = PAL[name] || PAL.viridis;
  t = Math.max(0, Math.min(1, t));
  const idx = t * (pal.length - 1);
  const lo = Math.floor(idx), hi = Math.min(lo+1, pal.length-1);
  const f = idx - lo;
  return [0,1,2].map(i => Math.round(pal[lo][i]*(1-f) + pal[hi][i]*f));
}
