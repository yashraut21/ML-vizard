import katex from 'katex';
import { gsap } from 'gsap';

/* ============================================================
   Regression Lab
   Tabs: Linear Regression | Gradient Descent | Polynomial | Regularisation
   ============================================================ */

const TABS = [
  { id: 'linear',   label: '📈 Linear Regression' },
  { id: 'gd',       label: '⛰ Gradient Descent' },
  { id: 'poly',     label: '🌊 Polynomial' },
  { id: 'reg',      label: '🔒 Regularisation' },
];

export function RegressionLab() {
  let activeTab = 'linear';
  const loop = { running: true };

  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">📈 Regression <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">Click to place data points, fit regression models, and watch gradient descent find the optimal weights in real time.</p>
      </div>
    </div>
    <div class="lab-tabs" id="reg-tabs">
      ${TABS.map(t=>`<button class="lab-tab ${t.id==='linear'?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="reg-content"></div>
  `;

  requestAnimationFrame(() => {
    el.querySelectorAll('.lab-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        loop.running = false;
        setTimeout(() => { loop.running = true; }, 50);
        el.querySelectorAll('.lab-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        renderTab();
      });
    });
    renderTab();
  });

  function renderTab() {
    const c = el.querySelector('#reg-content');
    c.innerHTML = '';
    loop.running = true;
    const map = { linear: renderLinear, gd: renderGD, poly: renderPoly, reg: renderReg };
    map[activeTab]?.(c, loop);
    gsap.fromTo(c, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
  }

  return el;
}

/* ================================================================
   TAB 1: Linear Regression — drag to add/remove, live fit
   ================================================================ */
function renderLinear(container, loop) {
  let pts = genDefaultPts();
  let w0 = 0, w1 = 1; // intercept, slope

  container.innerHTML = `
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header">
          <span class="card-title">Scatter Plot</span>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-secondary" id="lr-clear">Clear</button>
            <button class="btn btn-sm btn-secondary" id="lr-sample">Sample data</button>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:8px"><strong>Left-click</strong> to add points. <strong>Right-click</strong> to remove nearest.</p>
        <canvas id="lr-canvas" class="plot-canvas" height="420" style="height:420px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Fitted Model</span></div>
        <div class="stat-chips" id="lr-stats"></div>
        <div class="slider-wrap">
          <div class="slider-label">Intercept w₀ <span id="w0-disp">0.00</span></div>
          <input type="range" id="w0-slider" min="-3" max="3" step="0.01" value="0">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Slope w₁ <span id="w1-disp">1.00</span></div>
          <input type="range" id="w1-slider" min="-3" max="3" step="0.01" value="1">
        </div>
        <button class="btn btn-primary btn-sm" id="ols-fit">⚡ Fit OLS (Normal Equation)</button>
        <div class="formula-box" id="lr-formula"></div>
        <div class="info-callout">
          Residuals (dashed lines) show the error at each point. OLS minimises their <strong>squared sum</strong>.
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#lr-canvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth, H = canvas.height = 420;
  const pad = 40;

  function toS(xv, yv) { return { x: pad + xv * (W - 2*pad), y: H - pad - yv * (H - 2*pad) }; }
  function fromS(sx, sy) { return { x: (sx - pad) / (W - 2*pad), y: (H - pad - sy) / (H - 2*pad) }; }

  container.querySelector('#lr-clear').addEventListener('click', () => { pts = []; updateStats(); });
  container.querySelector('#lr-sample').addEventListener('click', () => { pts = genDefaultPts(); updateStats(); });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const p = fromS(e.clientX - r.left, e.clientY - r.top);
    if (pts.length === 0) return;
    const nearest = pts.reduce((best, pt, i) => {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      return d < best.d ? { d, i } : best;
    }, { d: Infinity, i: -1 });
    if (nearest.d < 0.06) pts.splice(nearest.i, 1);
    updateStats();
  });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const p = fromS(e.clientX - r.left, e.clientY - r.top);
    if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) { pts.push(p); updateStats(); }
  });

  const w0Slider = container.querySelector('#w0-slider');
  const w1Slider = container.querySelector('#w1-slider');
  [w0Slider, w1Slider].forEach(s => {
    s.addEventListener('input', () => {
      w0 = parseFloat(w0Slider.value);
      w1 = parseFloat(w1Slider.value);
      container.querySelector('#w0-disp').textContent = w0.toFixed(2);
      container.querySelector('#w1-disp').textContent = w1.toFixed(2);
      updateSliderTrack(w0Slider); updateSliderTrack(w1Slider);
      updateStats();
    });
  });
  updateSliderTrack(w0Slider); updateSliderTrack(w1Slider);

  container.querySelector('#ols-fit').addEventListener('click', () => {
    if (pts.length < 2) return;
    const n = pts.length;
    const sx = pts.reduce((s, p) => s + p.x, 0);
    const sy = pts.reduce((s, p) => s + p.y, 0);
    const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
    w1 = (n * sxy - sx * sy) / (n * sxx - sx * sx + 1e-10);
    w0 = (sy - w1 * sx) / n;
    w1Slider.value = Math.max(-3, Math.min(3, w1));
    w0Slider.value = Math.max(-3, Math.min(3, w0));
    container.querySelector('#w0-disp').textContent = w0.toFixed(3);
    container.querySelector('#w1-disp').textContent = w1.toFixed(3);
    updateSliderTrack(w0Slider); updateSliderTrack(w1Slider);
    updateStats();
    gsap.fromTo(canvas, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)', duration: 0.5 });
  });

  function updateStats() {
    if (pts.length === 0) return;
    const mse = pts.reduce((s, p) => { const pred = w0 + w1 * p.x; return s + (p.y - pred) ** 2; }, 0) / pts.length;
    const r2 = computeR2(pts, w0, w1);
    container.querySelector('#lr-stats').innerHTML = `
      <div class="stat-chip"><span class="chip-val">${w0.toFixed(3)}</span><span class="chip-label">w₀ (bias)</span></div>
      <div class="stat-chip"><span class="chip-val">${w1.toFixed(3)}</span><span class="chip-label">w₁ (slope)</span></div>
      <div class="stat-chip"><span class="chip-val">${mse.toFixed(4)}</span><span class="chip-label">MSE</span></div>
      <div class="stat-chip"><span class="chip-val">${r2.toFixed(3)}</span><span class="chip-label">R²</span></div>
    `;
    try { katex.render(`\\hat{y}=${w0.toFixed(2)}+${w1.toFixed(2)}x,\\quad R^2=${r2.toFixed(3)}`, container.querySelector('#lr-formula'), { throwOnError: false, displayMode: true }); } catch {}
  }

  function draw() {
    if (!loop.running) return;
    ctx.clearRect(0, 0, W, H);
    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = pad + i * (W - 2*pad) / 4;
      const y = H - pad - i * (H - 2*pad) / 4;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Regression line
    const x0s = toS(0, w0), x1s = toS(1, w0 + w1);
    ctx.strokeStyle = 'rgba(124,58,237,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0s.x, x0s.y); ctx.lineTo(x1s.x, x1s.y); ctx.stroke();

    // Residuals + points
    pts.forEach(p => {
      const pred = w0 + w1 * p.x;
      const sp = toS(p.x, p.y), spr = toS(p.x, pred);
      ctx.strokeStyle = 'rgba(253,231,37,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(spr.x, spr.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2); ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  updateStats(); draw();
}

/* ================================================================
   TAB 2: Gradient Descent — loss landscape + animated ball
   ================================================================ */
function renderGD(container, loop) {
  let pts = genDefaultPts();
  let w0 = 2.0, w1 = -1.0;
  let lr = 0.8, gdRunning = false;
  let lossHistory = [];
  let animFrame = null;

  container.innerHTML = `
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Loss Landscape L(w₀, w₁)</span></div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:6px">The heatmap shows MSE loss as a function of w₀ and w₁. Click to set starting position. Watch gradient descent find the minimum.</p>
        <canvas id="gd-landscape" class="plot-canvas" height="360" style="height:360px;cursor:crosshair"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Training</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Learning rate η <span id="gd-lr-disp">0.80</span></div>
          <input type="range" id="gd-lr" min="0.01" max="2.0" step="0.01" value="0.8">
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-primary btn-sm" id="gd-start" style="flex:1">▶ Run GD</button>
          <button class="btn btn-secondary btn-sm" id="gd-reset" style="flex:1">↺ Reset</button>
        </div>
        <div class="stat-chips" id="gd-stats"></div>
        <div class="card-header" style="margin-top:4px"><span class="card-title">Loss over iterations</span></div>
        <canvas id="loss-curve" class="loss-curve-canvas"></canvas>
        <div class="info-callout">
          <strong>Try:</strong> High η → oscillates or diverges. Low η → slow but stable. The sweet spot is problem-dependent.
        </div>
      </div>
    </div>
  `;

  const landscape = container.querySelector('#gd-landscape');
  const ctx = landscape.getContext('2d');
  let LW = landscape.width = landscape.offsetWidth, LH = landscape.height = 360;
  const W0_RANGE = [-1, 3], W1_RANGE = [-2, 3];
  let path = [{ w0, w1 }];

  function lossFn(a, b) {
    return pts.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0) / pts.length;
  }
  function gradFn(a, b) {
    const n = pts.length;
    let dw0 = 0, dw1 = 0;
    pts.forEach(p => { const e = p.y - (a + b * p.x); dw0 -= 2 * e / n; dw1 -= 2 * e * p.x / n; });
    return { dw0, dw1 };
  }
  function toL(a, b) {
    const tx = (a - W0_RANGE[0]) / (W0_RANGE[1] - W0_RANGE[0]);
    const ty = (b - W1_RANGE[0]) / (W1_RANGE[1] - W1_RANGE[0]);
    return { x: tx * LW, y: (1 - ty) * LH };
  }

  landscape.addEventListener('click', e => {
    const r = landscape.getBoundingClientRect();
    w0 = W0_RANGE[0] + (e.clientX - r.left) / LW * (W0_RANGE[1] - W0_RANGE[0]);
    w1 = W1_RANGE[1] - (e.clientY - r.top) / LH * (W1_RANGE[1] - W1_RANGE[0]);
    path = [{ w0, w1 }]; lossHistory = [lossFn(w0, w1)];
    updateStats();
  });

  const lrSlider = container.querySelector('#gd-lr');
  lrSlider.addEventListener('input', e => { lr = parseFloat(e.target.value); container.querySelector('#gd-lr-disp').textContent = lr.toFixed(2); updateSliderTrack(lrSlider); });
  updateSliderTrack(lrSlider);

  container.querySelector('#gd-start').addEventListener('click', () => {
    gdRunning = !gdRunning;
    container.querySelector('#gd-start').textContent = gdRunning ? '⏸ Pause' : '▶ Run GD';
  });
  container.querySelector('#gd-reset').addEventListener('click', () => {
    gdRunning = false; container.querySelector('#gd-start').textContent = '▶ Run GD';
    w0 = 2; w1 = -1; path = [{ w0, w1 }]; lossHistory = [lossFn(w0, w1)]; updateStats();
  });

  function updateStats() {
    const loss = lossFn(w0, w1);
    const g = gradFn(w0, w1);
    container.querySelector('#gd-stats').innerHTML = `
      <div class="stat-chip"><span class="chip-val">${w0.toFixed(3)}</span><span class="chip-label">w₀</span></div>
      <div class="stat-chip"><span class="chip-val">${w1.toFixed(3)}</span><span class="chip-label">w₁</span></div>
      <div class="stat-chip"><span class="chip-val">${loss.toFixed(4)}</span><span class="chip-label">Loss</span></div>
      <div class="stat-chip"><span class="chip-val">${path.length}</span><span class="chip-label">Steps</span></div>
    `;
  }

  function drawLandscape() {
    if (!loop.running) return;
    // GD step
    if (gdRunning && path.length < 300) {
      const g = gradFn(w0, w1);
      w0 -= lr * g.dw0; w1 -= lr * g.dw1;
      path.push({ w0, w1 }); lossHistory.push(lossFn(w0, w1));
      updateStats();
      if (Math.abs(g.dw0) < 1e-5 && Math.abs(g.dw1) < 1e-5) gdRunning = false;
    }

    // Heatmap
    const res = 4;
    for (let px = 0; px < LW; px += res) {
      for (let py = 0; py < LH; py += res) {
        const a = W0_RANGE[0] + (px / LW) * (W0_RANGE[1] - W0_RANGE[0]);
        const b = W1_RANGE[1] - (py / LH) * (W1_RANGE[1] - W1_RANGE[0]);
        const loss = Math.min(lossFn(a, b), 2);
        const t = loss / 2;
        const hue = 240 - t * 240;
        ctx.fillStyle = `hsl(${hue},70%,${15 + t * 20}%)`;
        ctx.fillRect(px, py, res, res);
      }
    }

    // Path
    if (path.length > 1) {
      ctx.strokeStyle = 'rgba(253,231,37,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      path.forEach((p, i) => { const s = toL(p.w0, p.w1); i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y); });
      ctx.stroke();
      path.forEach((p, i) => {
        if (i % 5 === 0) {
          const s = toL(p.w0, p.w1);
          ctx.fillStyle = `rgba(253,231,37,${0.3 + 0.7 * i / path.length})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
        }
      });
    }

    // Current pos
    const sc = toL(w0, w1);
    ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
    ctx.fillText('w₀ →', LW / 2, LH - 4);
    ctx.save(); ctx.translate(12, LH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('w₁ →', 0, 0); ctx.restore();

    // Loss curve
    drawLossCurve();
    requestAnimationFrame(drawLandscape);
  }

  function drawLossCurve() {
    const lc = container.querySelector('#loss-curve');
    if (!lc || lossHistory.length < 2) return;
    const lctx = lc.getContext('2d');
    lc.width = lc.offsetWidth || 250; lc.height = 140;
    const W = lc.width, H = lc.height;
    lctx.clearRect(0, 0, W, H);
    const maxL = Math.max(...lossHistory, 0.01);
    const g = lctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#06b6d4');
    lctx.strokeStyle = g; lctx.lineWidth = 2;
    lctx.beginPath();
    lossHistory.forEach((l, i) => {
      const x = (i / lossHistory.length) * W;
      const y = H - 8 - (l / maxL) * (H - 16);
      i === 0 ? lctx.moveTo(x, y) : lctx.lineTo(x, y);
    });
    lctx.stroke();
    lctx.fillStyle = 'rgba(255,255,255,0.3)'; lctx.font = '10px Inter';
    lctx.fillText(`Loss: ${lossHistory[lossHistory.length - 1]?.toFixed(4)}`, 8, 14);
    lctx.fillText(`Iter: ${lossHistory.length}`, 8, H - 5);
  }

  lossHistory = [lossFn(w0, w1)]; updateStats(); drawLandscape();
}

/* ================================================================
   TAB 3: Polynomial Regression — degree slider, bias-variance
   ================================================================ */
function renderPoly(container, loop) {
  let pts = genDefaultPts();
  let degree = 1;

  container.innerHTML = `
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header">
          <span class="card-title">Polynomial Regression</span>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-secondary" id="poly-clear">Clear</button>
            <button class="btn btn-sm btn-secondary" id="poly-nonlinear">Nonlinear data</button>
          </div>
        </div>
        <canvas id="poly-canvas" class="plot-canvas" height="400" style="height:400px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Model Controls</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Polynomial degree <span id="deg-disp">1</span></div>
          <input type="range" id="deg-slider" min="1" max="12" step="1" value="1">
        </div>
        <div class="stat-chips" id="poly-stats"></div>
        <div class="info-callout" id="poly-bias-var">
          <strong>Degree 1:</strong> High bias, low variance. Underfitting — too simple to capture the pattern.
        </div>
        <div class="formula-box" id="poly-formula"></div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#poly-canvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth, H = canvas.height = 400;
  const pad = 40;
  function toS(xv, yv) { return { x: pad + xv * (W-2*pad), y: H-pad - yv*(H-2*pad) }; }
  function fromS(sx, sy) { return { x: (sx-pad)/(W-2*pad), y: (H-pad-sy)/(H-2*pad) }; }

  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const p = fromS(e.clientX-r.left, e.clientY-r.top);
    if (p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1) { pts.push(p); fit(); }
  });
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const r=canvas.getBoundingClientRect();
    const p=fromS(e.clientX-r.left,e.clientY-r.top);
    const ni=pts.reduce((b,pt,i)=>{const d=Math.hypot(pt.x-p.x,pt.y-p.y);return d<b.d?{d,i}:b;},{d:Infinity,i:-1});
    if(ni.d<0.06){pts.splice(ni.i,1);fit();}
  });
  container.querySelector('#poly-clear').addEventListener('click',()=>{pts=[];fit();});
  container.querySelector('#poly-nonlinear').addEventListener('click',()=>{pts=genNonlinearPts();fit();});

  const degSlider=container.querySelector('#deg-slider');
  degSlider.addEventListener('input',e=>{degree=parseInt(e.target.value);container.querySelector('#deg-disp').textContent=degree;updateSliderTrack(degSlider);fit();});
  updateSliderTrack(degSlider);

  let coeffs = null;
  function fit() {
    if(pts.length<2){coeffs=null;return;}
    coeffs=polyFit(pts.map(p=>p.x),pts.map(p=>p.y),degree);
    const mse=pts.reduce((s,p)=>{const pred=polyEval(coeffs,p.x);return s+(p.y-pred)**2;},0)/pts.length;
    const r2=1-mse/(variance(pts.map(p=>p.y)));
    container.querySelector('#poly-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${degree}</span><span class="chip-label">Degree</span></div>
      <div class="stat-chip"><span class="chip-val">${mse.toFixed(4)}</span><span class="chip-label">MSE</span></div>
      <div class="stat-chip"><span class="chip-val">${Math.max(0,r2).toFixed(3)}</span><span class="chip-label">R²</span></div>
    `;
    const bvInfo={1:'High bias, low variance. Underfitting.',2:'Linear fit.',3:'Good balance for many problems.',4:'Moderate complexity.',5:'Getting complex.','6+':'High variance, low bias. Overfitting if few data points!'};
    const key=degree<=5?degree.toString():'6+';
    container.querySelector('#poly-bias-var').innerHTML=`<strong>Degree ${degree}:</strong> ${bvInfo[key]}`;
    const termStr=coeffs.slice(0,Math.min(4,coeffs.length)).map((c,i)=>`${c.toFixed(2)}x^{${i}}`).join('+');
    try{katex.render(`\\hat{y}=${termStr}+\\ldots`,container.querySelector('#poly-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  function draw() {
    if(!loop.running)return;
    ctx.clearRect(0,0,W,H);
    // Axes
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const px=pad+i*(W-2*pad)/4,py=H-pad-i*(H-2*pad)/4;ctx.beginPath();ctx.moveTo(px,pad);ctx.lineTo(px,H-pad);ctx.stroke();ctx.beginPath();ctx.moveTo(pad,py);ctx.lineTo(W-pad,py);ctx.stroke();}

    // Curve
    if(coeffs){
      ctx.strokeStyle='#7c3aed';ctx.lineWidth=2.5;ctx.beginPath();
      let first=true;
      for(let i=0;i<=200;i++){
        const xv=i/200;const yv=polyEval(coeffs,xv);const s=toS(xv,yv);
        if(yv<-0.1||yv>1.1){first=true;continue;}
        first?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);first=false;
      }
      ctx.stroke();
    }
    pts.forEach(p=>{const s=toS(p.x,p.y);ctx.fillStyle='#06b6d4';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();});
    requestAnimationFrame(draw);
  }
  fit(); draw();
}

/* ================================================================
   TAB 4: Regularisation — Ridge vs Lasso, weight decay
   ================================================================ */
function renderReg(container, loop) {
  let pts = genDefaultPts();
  let regType='none', alpha=0.01, degree=6;
  let coeffs=null;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Regularised Polynomial Fit</span></div>
        <canvas id="reg-canvas" class="plot-canvas" height="380" style="height:380px"></canvas>
      </div>
      <div class="card" style="width:300px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Controls</span></div>
        <div class="segmented" id="reg-type-seg">
          <button class="seg-btn active" data-type="none">None</button>
          <button class="seg-btn" data-type="ridge">Ridge (L2)</button>
          <button class="seg-btn" data-type="lasso">Lasso (L1)</button>
        </div>
        <div class="slider-wrap">
          <div class="slider-label">α (strength) <span id="alpha-disp">0.01</span></div>
          <input type="range" id="alpha-slider" min="0" max="0.5" step="0.001" value="0.01">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Degree <span id="reg-deg-disp">6</span></div>
          <input type="range" id="reg-deg-slider" min="1" max="12" step="1" value="6">
        </div>
        <div class="stat-chips" id="reg-stats"></div>
        <div id="reg-weights-bar" style="height:80px"></div>
        <div class="formula-box" id="reg-formula"></div>
        <div class="info-callout">
          <strong>Lasso vs Ridge:</strong> Lasso sets small weights exactly to zero (sparse). Ridge shrinks them but keeps them nonzero. This is why Lasso performs feature selection.
        </div>
      </div>
    </div>
  `;

  const canvas=container.querySelector('#reg-canvas');
  const ctx=canvas.getContext('2d');
  let W=canvas.width=canvas.offsetWidth, H=canvas.height=380;
  const pad=40;
  function toS(xv,yv){return{x:pad+xv*(W-2*pad),y:H-pad-yv*(H-2*pad)};}
  function fromS(sx,sy){return{x:(sx-pad)/(W-2*pad),y:(H-pad-sy)/(H-2*pad)};}

  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const p=fromS(e.clientX-r.left,e.clientY-r.top);if(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1){pts.push(p);fit();}});

  container.querySelectorAll('[data-type]').forEach(btn=>{
    btn.addEventListener('click',()=>{container.querySelectorAll('[data-type]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');regType=btn.dataset.type;fit();});
  });
  const alphaSlider=container.querySelector('#alpha-slider');
  alphaSlider.addEventListener('input',e=>{alpha=parseFloat(e.target.value);container.querySelector('#alpha-disp').textContent=alpha.toFixed(3);updateSliderTrack(alphaSlider);fit();});
  updateSliderTrack(alphaSlider);
  const regDegSlider=container.querySelector('#reg-deg-slider');
  regDegSlider.addEventListener('input',e=>{degree=parseInt(e.target.value);container.querySelector('#reg-deg-disp').textContent=degree;updateSliderTrack(regDegSlider);fit();});
  updateSliderTrack(regDegSlider);

  function fit(){
    if(pts.length<2){return;}
    // Simple ridge via normal equation with regularisation
    coeffs=polyFitReg(pts.map(p=>p.x),pts.map(p=>p.y),degree,regType,alpha);
    const mse=pts.reduce((s,p)=>{const pred=polyEval(coeffs,p.x);return s+(p.y-pred)**2;},0)/pts.length;
    const l2=coeffs.slice(1).reduce((s,c)=>s+c*c,0);
    const l1=coeffs.slice(1).reduce((s,c)=>s+Math.abs(c),0);
    const nzero=coeffs.slice(1).filter(c=>Math.abs(c)>1e-4).length;
    container.querySelector('#reg-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${mse.toFixed(4)}</span><span class="chip-label">MSE</span></div>
      <div class="stat-chip"><span class="chip-val">${l2.toFixed(3)}</span><span class="chip-label">‖w‖₂²</span></div>
      <div class="stat-chip"><span class="chip-val">${l1.toFixed(3)}</span><span class="chip-label">‖w‖₁</span></div>
      <div class="stat-chip"><span class="chip-val">${nzero}</span><span class="chip-label">Non-zero w</span></div>
    `;
    // Weight bar chart
    const bEl=container.querySelector('#reg-weights-bar');
    const maxC=Math.max(...coeffs.slice(1).map(c=>Math.abs(c)),0.01);
    bEl.innerHTML=`<div style="display:flex;gap:2px;align-items:flex-end;height:70px">${coeffs.slice(1).map((c,i)=>{
      const h=Math.abs(c)/maxC*65;
      return `<div style="flex:1;background:${Math.abs(c)<1e-4?'rgba(255,255,255,0.1)':'rgba(124,58,237,0.7)'};height:${h}px;border-radius:2px 2px 0 0;min-height:2px" title="w${i+1}=${c.toFixed(3)}"></div>`;
    }).join('')}</div><p class="text-muted" style="font-size:0.65rem;margin-top:3px">Weights w₁…wₙ (height = magnitude)</p>`;
    const texR=regType==='ridge'?`+${alpha}\\|\\mathbf{w}\\|_2^2`:regType==='lasso'?`+${alpha}\\|\\mathbf{w}\\|_1`:'';
    try{katex.render(`L=\\text{MSE}${texR}`,container.querySelector('#reg-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  function draw(){
    if(!loop.running)return;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();

    if(coeffs){
      const colors={none:'#7c3aed',ridge:'#06b6d4',lasso:'#ec4899'};
      ctx.strokeStyle=colors[regType];ctx.lineWidth=2.5;ctx.beginPath();let first=true;
      for(let i=0;i<=200;i++){const xv=i/200,yv=polyEval(coeffs,xv);const s=toS(xv,yv);if(yv<-0.5||yv>1.5){first=true;continue;}first?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);first=false;}
      ctx.stroke();
    }
    pts.forEach(p=>{const s=toS(p.x,p.y);ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();});
    requestAnimationFrame(draw);
  }
  fit();draw();
}

// ========== Shared helpers ==========
function genDefaultPts() {
  return Array.from({length:20},(_,i)=>{const x=i/20+Math.random()*0.03;return{x,y:0.2+0.6*x+0.1*(Math.random()-0.5)};});
}
function genNonlinearPts() {
  return Array.from({length:20},(_,i)=>{const x=i/20;return{x,y:0.5+0.4*Math.sin(x*Math.PI*3)+0.05*(Math.random()-0.5)};});
}
function computeR2(pts,w0,w1){
  const mn=pts.reduce((s,p)=>s+p.y,0)/pts.length;
  const sst=pts.reduce((s,p)=>s+(p.y-mn)**2,0);
  const ssr=pts.reduce((s,p)=>s+(p.y-(w0+w1*p.x))**2,0);
  return 1-ssr/(sst+1e-10);
}
function variance(arr){const m=arr.reduce((s,v)=>s+v,0)/arr.length;return arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length;}
function polyFit(xs,ys,deg) {
  const n=xs.length, d=Math.min(deg,n-1)+1;
  // Build Vandermonde matrix X, solve (X^T X) w = X^T y
  const X=xs.map(x=>Array.from({length:d},(_,i)=>Math.pow(x,i)));
  return solveNormalEq(X,ys);
}
function polyFitReg(xs,ys,deg,regType,alpha) {
  const n=xs.length, d=Math.min(deg,n-1)+1;
  const X=xs.map(x=>Array.from({length:d},(_,i)=>Math.pow(x,i)));
  if(regType==='ridge') {
    // (X^T X + alpha*I) w = X^T y
    const XtX=matMul(matT(X),X);
    for(let i=1;i<d;i++) XtX[i][i]+=alpha;
    const Xty=matVecMul(matT(X),ys);
    return gaussElim(XtX,Xty);
  }
  return solveNormalEq(X,ys);
}
function polyEval(c,x){return c.reduce((s,ci,i)=>s+ci*Math.pow(x,i),0);}
function solveNormalEq(X,y){const XtX=matMul(matT(X),X);const Xty=matVecMul(matT(X),y);return gaussElim(XtX,Xty);}
function matT(M){return M[0].map((_,j)=>M.map(r=>r[j]));}
function matMul(A,B){return A.map(r=>B[0].map((_,j)=>r.reduce((s,_,k)=>s+r[k]*B[k][j],0)));}
function matVecMul(A,v){return A.map(r=>r.reduce((s,a,j)=>s+a*v[j],0));}
function gaussElim(A,b){
  const n=A.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){let mx=i;for(let j=i+1;j<n;j++)if(Math.abs(M[j][i])>Math.abs(M[mx][i]))mx=j;[M[i],M[mx]]=[M[mx],M[i]];
  for(let j=i+1;j<n;j++){if(Math.abs(M[i][i])<1e-12)continue;const f=M[j][i]/M[i][i];for(let k=i;k<=n;k++)M[j][k]-=f*M[i][k];}}
  const x=new Array(n).fill(0);
  for(let i=n-1;i>=0;i--){x[i]=(M[i][n]-M[i].slice(i+1,n).reduce((s,v,j)=>s+v*x[i+1+j],0))/(M[i][i]||1e-10);}
  return x;
}
function updateSliderTrack(sl){if(!sl)return;const mn=parseFloat(sl.min),mx=parseFloat(sl.max),v=parseFloat(sl.value);sl.style.setProperty('--pct',`${((v-mn)/(mx-mn))*100}%`);}
