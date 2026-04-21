import katex from 'katex';
import { gsap } from 'gsap';

/* ============================================================
   Math Lab — Interactive visualisations of Phase 0 concepts
   Tabs: Vectors | Dot Product | Norms | Gradient | Chain Rule
   ============================================================ */

const TABS = [
  { id: 'vectors',   label: '→ Vectors',     icon: '→' },
  { id: 'dot',       label: '· Dot Product', icon: '·' },
  { id: 'norms',     label: '‖·‖ Norms',     icon: '‖' },
  { id: 'gradient',  label: '∇ Gradient',    icon: '∇' },
  { id: 'chainrule', label: '∘ Chain Rule',  icon: '∘' },
];

export function MathLab() {
  let activeTab = 'vectors';
  const animLoop = { running: true };

  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">🧮 Math <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">Foundations of machine learning made visual. Every concept is interactive — drag, tweak, and explore.</p>
      </div>
    </div>
    <div class="lab-tabs" id="math-tabs">
      ${TABS.map(t => `<button class="lab-tab ${t.id==='vectors'?'active':''}" data-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
    </div>
    <div id="math-content"></div>
  `;

  requestAnimationFrame(() => {
    el.querySelectorAll('.lab-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        animLoop.running = false;
        setTimeout(() => { animLoop.running = true; }, 50);
        el.querySelectorAll('.lab-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        renderTab();
      });
    });
    renderTab();
  });

  function renderTab() {
    const content = el.querySelector('#math-content');
    content.innerHTML = '';
    animLoop.running = true;
    const renderers = { vectors: renderVectors, dot: renderDot, norms: renderNorms, gradient: renderGradient, chainrule: renderChainRule };
    renderers[activeTab]?.(content, animLoop);
    gsap.fromTo(content, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  }

  return el;
}

/* ================================================================
   TAB 1: Vectors — add, subtract, scalar multiply (draggable)
   ================================================================ */
function renderVectors(container, loop) {
  container.innerHTML = `
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Vector Operations</span>
          <div class="segmented" id="vec-mode-seg">
            <button class="seg-btn active" data-mode="add">a + b</button>
            <button class="seg-btn" data-mode="sub">a − b</button>
            <button class="seg-btn" data-mode="scalar">λa</button>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.8rem;margin-bottom:8px">Drag the vector tip endpoints (coloured circles) to reshape vectors. The result updates live.</p>
        <canvas id="vec-canvas" class="plot-canvas" height="380" style="height:380px"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Parameters</span></div>
        <div class="slider-wrap" id="scalar-wrap" style="display:none">
          <div class="slider-label">λ (scalar) <span id="scalar-disp">1.50</span></div>
          <input type="range" id="scalar-slider" min="-3" max="3" step="0.05" value="1.5">
        </div>
        <div class="stat-chips" id="vec-stats"></div>
        <div class="formula-box" id="vec-formula"></div>
        <div class="info-callout">
          <strong>Why it matters:</strong> Every data point in ML is a vector. Features are dimensions. Distance between vectors = similarity between data points.
        </div>
      </div>
    </div>
  `;
  setupVectorCanvas(container, loop);
}

function setupVectorCanvas(container, loop) {
  const canvas = container.querySelector('#vec-canvas');
  const ctx = canvas.getContext('2d');
  let mode = 'add';
  let scalar = 1.5;
  let W, H, cx, cy, scale;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = 380;
    cx = W / 2; cy = H / 2; scale = Math.min(W, H) / 6;
  }
  resize();

  // Vectors in "unit" coords
  let a = { x: 1.5, y: 1.2 };
  let b = { x: 0.8, y: -1.0 };
  let dragging = null;

  function toScreen(v) { return { x: cx + v.x * scale, y: cy - v.y * scale }; }
  function fromScreen(sx, sy) { return { x: (sx - cx) / scale, y: -(sy - cy) / scale }; }

  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const sa = toScreen(a), sb = toScreen(b);
    const hitA = Math.hypot(mx - sa.x, my - sa.y) < 14;
    const hitB = Math.hypot(mx - sb.x, my - sb.y) < 14;
    if (hitA) dragging = 'a';
    else if (hitB && mode !== 'scalar') dragging = 'b';
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const r = canvas.getBoundingClientRect();
    const v = fromScreen(e.clientX - r.left, e.clientY - r.top);
    if (dragging === 'a') a = v;
    if (dragging === 'b') b = v;
    updateStats();
  });
  window.addEventListener('mouseup', () => dragging = null);

  container.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      container.querySelector('#scalar-wrap').style.display = mode === 'scalar' ? 'flex' : 'none';
      updateStats();
    });
  });
  const scalarSlider = container.querySelector('#scalar-slider');
  scalarSlider?.addEventListener('input', e => {
    scalar = parseFloat(e.target.value);
    container.querySelector('#scalar-disp').textContent = scalar.toFixed(2);
    updateSliderTrack(scalarSlider);
    updateStats();
  });
  updateSliderTrack(scalarSlider);

  function updateStats() {
    let result;
    if (mode === 'add') result = { x: a.x + b.x, y: a.y + b.y };
    else if (mode === 'sub') result = { x: a.x - b.x, y: a.y - b.y };
    else result = { x: scalar * a.x, y: scalar * a.y };

    const magA = Math.hypot(a.x, a.y).toFixed(3);
    const magB = Math.hypot(b.x, b.y).toFixed(3);
    const magR = Math.hypot(result.x, result.y).toFixed(3);

    const chips = container.querySelector('#vec-stats');
    chips.innerHTML = `
      <div class="stat-chip"><span class="chip-val" style="color:#7c3aed">[${a.x.toFixed(2)}, ${a.y.toFixed(2)}]</span><span class="chip-label">Vector a</span></div>
      <div class="stat-chip"><span class="chip-val" style="color:#06b6d4">[${b.x.toFixed(2)}, ${b.y.toFixed(2)}]</span><span class="chip-label">Vector b</span></div>
      <div class="stat-chip"><span class="chip-val">${magA}</span><span class="chip-label">‖a‖</span></div>
      <div class="stat-chip"><span class="chip-val">${magB}</span><span class="chip-label">‖b‖</span></div>
      <div class="stat-chip"><span class="chip-val" style="color:#fbbf24">[${result.x.toFixed(2)}, ${result.y.toFixed(2)}]</span><span class="chip-label">Result</span></div>
      <div class="stat-chip"><span class="chip-val">${magR}</span><span class="chip-label">‖result‖</span></div>
    `;
    const fb = container.querySelector('#vec-formula');
    const texMap = {
      add:    `\\mathbf{a}+\\mathbf{b}=[${a.x.toFixed(2)},${a.y.toFixed(2)}]+[${b.x.toFixed(2)},${b.y.toFixed(2)}]=[${result.x.toFixed(2)},${result.y.toFixed(2)}]`,
      sub:    `\\mathbf{a}-\\mathbf{b}=[${a.x.toFixed(2)},${a.y.toFixed(2)}]-[${b.x.toFixed(2)},${b.y.toFixed(2)}]=[${result.x.toFixed(2)},${result.y.toFixed(2)}]`,
      scalar: `\\lambda\\mathbf{a}=${scalar.toFixed(2)}\\cdot[${a.x.toFixed(2)},${a.y.toFixed(2)}]=[${result.x.toFixed(2)},${result.y.toFixed(2)}]`,
    };
    try { katex.render(texMap[mode], fb, { throwOnError: false, displayMode: true }); } catch {}
  }

  function draw() {
    if (!loop.running) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'transparent';

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const sx = cx + i * scale, sy = cy + i * scale;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText('x', W - 14, cy - 6); ctx.fillText('y', cx + 5, 12);

    let result;
    if (mode === 'add') result = { x: a.x + b.x, y: a.y + b.y };
    else if (mode === 'sub') result = { x: a.x - b.x, y: a.y - b.y };
    else result = { x: scalar * a.x, y: scalar * a.y };

    const O = { x: cx, y: cy };
    const sa = toScreen(a), sb = toScreen(b), sr = toScreen(result);

    // Tip-to-tail for add/sub
    if (mode === 'add') {
      ctx.strokeStyle = 'rgba(6,182,212,0.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
      drawArrow2(ctx, sa.x, sa.y, sr.x, sr.y, 'rgba(6,182,212,0.5)', 1.5);
      ctx.setLineDash([]);
    }

    // Origin arrows
    drawArrow2(ctx, cx, cy, sa.x, sa.y, '#7c3aed', 2.5);
    if (mode !== 'scalar') drawArrow2(ctx, cx, cy, sb.x, sb.y, '#06b6d4', 2.5);
    drawArrow2(ctx, cx, cy, sr.x, sr.y, '#fbbf24', 2.5);

    // Draggable endpoints
    [[sa, '#7c3aed', 'a'], [sb, '#06b6d4', 'b'], [sr, '#fbbf24', 'r']].forEach(([s, c, lbl], i) => {
      if (i === 1 && mode === 'scalar') return;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(s.x, s.y, i === 2 ? 5 : 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(lbl === 'r' ? (mode==='add'?'a+b': mode==='sub'?'a−b':'λa') : lbl, s.x + 10, s.y - 8);
    });

    requestAnimationFrame(draw);
  }
  updateStats();
  draw();
}

/* ================================================================
   TAB 2: Dot Product — projection, angle, cosine similarity
   ================================================================ */
function renderDot(container, loop) {
  container.innerHTML = `
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Dot Product & Projection</span></div>
        <p class="text-muted" style="font-size:0.8rem;margin-bottom:8px">Drag vectors. The shadow of <strong style="color:#7c3aed">a</strong> onto <strong style="color:#06b6d4">b</strong> (dashed line) = the projection.</p>
        <canvas id="dot-canvas" class="plot-canvas" height="360" style="height:360px"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Live Values</span></div>
        <div class="stat-chips" id="dot-stats"></div>
        <div class="formula-box" id="dot-formula"></div>
        <div class="info-callout">
          <strong>ML use:</strong> Cosine similarity = dot product of unit vectors. Used in NLP (sentence similarity), attention mechanisms, and recommendation systems.
        </div>
        <div class="formula-box">
          <div class="formula-title">Relationship to angle</div>
          <div id="dot-angle-formula"></div>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#dot-canvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth, H = canvas.height = 360;
  let cx = W/2, cy = H/2, scale = Math.min(W,H)/5;
  let a = { x: 1.8, y: 1.0 }, b = { x: 0.5, y: 1.8 };
  let dragging = null;

  const toS = v => ({ x: cx + v.x*scale, y: cy - v.y*scale });

  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect(), mx = e.clientX-r.left, my = e.clientY-r.top;
    const sa = toS(a), sb = toS(b);
    if (Math.hypot(mx-sa.x,my-sa.y)<14) dragging='a';
    else if (Math.hypot(mx-sb.x,my-sb.y)<14) dragging='b';
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const r = canvas.getBoundingClientRect();
    const v = { x:(e.clientX-r.left-cx)/scale, y:-(e.clientY-r.top-cy)/scale };
    if (dragging==='a') a=v; else b=v;
    updateDotStats();
  });
  window.addEventListener('mouseup',()=>dragging=null);

  function updateDotStats() {
    const dot = a.x*b.x + a.y*b.y;
    const magA = Math.hypot(a.x,a.y), magB = Math.hypot(b.x,b.y);
    const cos = dot/(magA*magB+1e-10);
    const angle = (Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI).toFixed(1);
    const projLen = dot/magB;

    container.querySelector('#dot-stats').innerHTML = `
      <div class="stat-chip"><span class="chip-val">${dot.toFixed(3)}</span><span class="chip-label">a · b</span></div>
      <div class="stat-chip"><span class="chip-val">${cos.toFixed(3)}</span><span class="chip-label">cos θ</span></div>
      <div class="stat-chip"><span class="chip-val">${angle}°</span><span class="chip-label">Angle θ</span></div>
      <div class="stat-chip"><span class="chip-val">${projLen.toFixed(3)}</span><span class="chip-label">Projection</span></div>
    `;
    try { katex.render(`\\mathbf{a}\\cdot\\mathbf{b}=\\sum_i a_i b_i=${dot.toFixed(3)}`, container.querySelector('#dot-formula'), {throwOnError:false,displayMode:true}); } catch{}
    try { katex.render(`\\cos\\theta=\\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\|\\mathbf{a}\\|\\|\\mathbf{b}\\|}=${cos.toFixed(3)},\\quad\\theta=${angle}^\\circ`, container.querySelector('#dot-angle-formula'), {throwOnError:false,displayMode:true}); } catch{}
  }

  function draw() {
    if (!loop.running) return;
    ctx.clearRect(0,0,W,H);
    // Grid & axes
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let i=-6;i<=6;i++){const s=cx+i*scale;ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(s,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,cy+i*scale);ctx.lineTo(W,cy+i*scale);ctx.stroke();}
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.stroke();

    const sa=toS(a), sb=toS(b);
    const dot=a.x*b.x+a.y*b.y, magB2=b.x*b.x+b.y*b.y;
    const t = dot/magB2;
    const proj = { x: t*b.x, y: t*b.y };
    const sp = toS(proj);

    // Projection dashed line
    ctx.strokeStyle='rgba(255,200,50,0.4)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(sa.x,sa.y); ctx.lineTo(sp.x,sp.y); ctx.stroke();
    ctx.setLineDash([]);

    // Arc for angle
    const magA=Math.hypot(a.x,a.y), magBv=Math.hypot(b.x,b.y);
    const angA=Math.atan2(-a.y,a.x), angB=Math.atan2(-b.y,b.x);
    ctx.strokeStyle='rgba(253,231,37,0.5)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,cy,40,Math.min(angA,angB),Math.max(angA,angB)); ctx.stroke();

    // Vectors
    drawArrow2(ctx,cx,cy,sa.x,sa.y,'#7c3aed',2.5);
    drawArrow2(ctx,cx,cy,sb.x,sb.y,'#06b6d4',2.5);
    // Projection
    ctx.fillStyle='rgba(253,231,37,0.9)';
    ctx.beginPath();ctx.arc(sp.x,sp.y,5,0,Math.PI*2);ctx.fill();
    drawArrow2(ctx,cx,cy,sp.x,sp.y,'rgba(253,231,37,0.5)',1.5);

    // Endpoint dots
    ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.arc(sa.x,sa.y,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#06b6d4';ctx.beginPath();ctx.arc(sb.x,sb.y,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='white';ctx.font='bold 12px Inter';
    ctx.fillText('a',sa.x+10,sa.y-8); ctx.fillText('b',sb.x+10,sb.y-8);

    // Angle label
    const mid=(angA+angB)/2;
    ctx.fillStyle='rgba(253,231,37,0.7)'; ctx.font='11px Inter';
    ctx.fillText('θ', cx+Math.cos(mid)*54, cy+Math.sin(mid)*54);

    requestAnimationFrame(draw);
  }
  updateDotStats(); draw();
}

/* ================================================================
   TAB 3: Norms — L1, L2, Lp unit circles
   ================================================================ */
function renderNorms(container, loop) {
  container.innerHTML = `
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Unit Circles Under Different Norms</span></div>
        <canvas id="norms-canvas" class="plot-canvas" height="380" style="height:380px"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Vector & Norm</span></div>
        <div class="slider-wrap">
          <div class="slider-label">p (norm order) <span id="p-disp">2.00</span></div>
          <input type="range" id="p-slider" min="0.5" max="8" step="0.1" value="2">
        </div>
        <div class="info-callout" id="norm-info"></div>
        <div class="stat-chips" id="norm-stats"></div>
        <div class="formula-box" id="norm-formula"></div>
        <div class="info-callout">
          <strong>ML use:</strong> L1 → Lasso (sparse weights). L2 → Ridge (small weights). L∞ → max weight. p=1 ball shape explains why Lasso gives exact zeros.
        </div>
      </div>
    </div>
  `;
  const canvas = container.querySelector('#norms-canvas');
  const ctx = canvas.getContext('2d');
  let W=canvas.width=canvas.offsetWidth, H=canvas.height=380;
  let cx=W/2, cy=H/2, scale=Math.min(W,H)*0.35;
  let p=2.0;
  // Draggable vec
  let v = { x: 0.7, y: 0.5 };
  let dragging=false;

  canvas.addEventListener('mousedown',e=>{
    const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    const sv={x:cx+v.x*scale,y:cy-v.y*scale};
    if(Math.hypot(mx-sv.x,my-sv.y)<12) dragging=true;
  });
  canvas.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const r=canvas.getBoundingClientRect();
    v={x:(e.clientX-r.left-cx)/scale,y:-(e.clientY-r.top-cy)/scale};
    updateNormStats();
  });
  window.addEventListener('mouseup',()=>dragging=false);

  const pSlider = container.querySelector('#p-slider');
  pSlider.addEventListener('input',e=>{
    p=parseFloat(e.target.value);
    container.querySelector('#p-disp').textContent=p.toFixed(2);
    updateSliderTrack(pSlider);
    updateNormStats();
  });
  updateSliderTrack(pSlider);

  function lpNorm(v,p) { return Math.pow(Math.pow(Math.abs(v.x),p)+Math.pow(Math.abs(v.y),p), 1/p); }

  function updateNormStats() {
    const l1=lpNorm(v,1), l2=lpNorm(v,2), lp=lpNorm(v,p), linf=Math.max(Math.abs(v.x),Math.abs(v.y));
    container.querySelector('#norm-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${l1.toFixed(3)}</span><span class="chip-label">L1 norm</span></div>
      <div class="stat-chip"><span class="chip-val">${l2.toFixed(3)}</span><span class="chip-label">L2 norm</span></div>
      <div class="stat-chip"><span class="chip-val">${lp.toFixed(3)}</span><span class="chip-label">Lp norm</span></div>
      <div class="stat-chip"><span class="chip-val">${linf.toFixed(3)}</span><span class="chip-label">L∞ norm</span></div>
    `;
    const infoMap = {
      '<1.1': 'p < 1: Not a true norm (triangle inequality fails). Produces extreme sparsity.',
      '<1.6': 'p ≈ 1 (L1): Diamond-shaped ball → promotes sparsity (Lasso regularisation).',
      '<2.2': 'p = 2 (L2): Circle → Euclidean distance, Ridge regularisation.',
      '<5':   'p > 2: Rounder than circle, weights large components more.',
      default:'p → ∞ (L∞): Becomes a square. ‖v‖∞ = max(|v₁|, |v₂|).',
    };
    const info = p<1.1?infoMap['<1.1']:p<1.6?infoMap['<1.6']:p<2.2?infoMap['<2.2']:p<5?infoMap['<5']:infoMap.default;
    container.querySelector('#norm-info').innerHTML=`<strong>p = ${p.toFixed(2)}:</strong> ${info}`;
    try{katex.render(`\\|\\mathbf{v}\\|_p=\\left(|v_1|^p+|v_2|^p\\right)^{1/p}=${lp.toFixed(3)}`,container.querySelector('#norm-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  function drawLpCircle(ctx, p, cx, cy, r) {
    ctx.beginPath();
    for(let i=0;i<=360;i++){
      const a=i*Math.PI/180;
      const ca=Math.cos(a), sa2=Math.sin(a);
      const len = r / Math.pow(Math.pow(Math.abs(ca),p)+Math.pow(Math.abs(sa2),p),1/p);
      const x=cx+ca*len, y=cy+sa2*len;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();
  }

  function draw() {
    if(!loop.running)return;
    ctx.clearRect(0,0,W,H);
    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*scale,0);ctx.lineTo(cx+i*scale,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,cy+i*scale);ctx.lineTo(W,cy+i*scale);ctx.stroke();}
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.stroke();

    // L1 ball (diamond)
    drawLpCircle(ctx,1,cx,cy,scale);
    ctx.strokeStyle='rgba(236,72,153,0.35)';ctx.fillStyle='rgba(236,72,153,0.05)';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(236,72,153,0.6)';ctx.font='11px Inter';ctx.fillText('L1',cx+scale*0.7,cy-scale*0.35);

    // L2 ball (circle)
    drawLpCircle(ctx,2,cx,cy,scale);
    ctx.strokeStyle='rgba(6,182,212,0.5)';ctx.fillStyle='rgba(6,182,212,0.05)';ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(6,182,212,0.7)';ctx.fillText('L2',cx+scale*0.72,cy-scale*0.72);

    // Lp ball (current)
    drawLpCircle(ctx,p,cx,cy,scale*0.98);
    ctx.strokeStyle='rgba(124,58,237,0.9)';ctx.fillStyle='rgba(124,58,237,0.08)';ctx.lineWidth=2.5;ctx.fill();ctx.stroke();

    // Vec
    const sv={x:cx+v.x*scale,y:cy-v.y*scale};
    ctx.strokeStyle='#fbbf24';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(sv.x,sv.y);ctx.stroke();
    ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(sv.x,sv.y,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='white';ctx.font='bold 11px Inter';ctx.fillText('v',sv.x+10,sv.y-8);

    // Legend
    const leg=[['rgba(236,72,153,0.7)','L1 (p=1)'],['rgba(6,182,212,0.7)','L2 (p=2)'],['rgba(124,58,237,0.9)',`Lp (p=${p.toFixed(1)})`]];
    leg.forEach(([c,l],i)=>{ctx.fillStyle=c;ctx.fillRect(16,H-80+i*22,12,2);ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='11px Inter';ctx.fillText(l,34,H-73+i*22);});

    requestAnimationFrame(draw);
  }
  updateNormStats(); draw();
}

/* ================================================================
   TAB 4: Gradient — 2D gradient field visualizer
   ================================================================ */
function renderGradient(container, loop) {
  const FUNCS = {
    bowl:    { label: 'x² + y²',      f:(x,y)=>x*x+y*y,      grad:(x,y)=>[2*x,2*y] },
    saddle:  { label: 'x² − y²',      f:(x,y)=>x*x-y*y,      grad:(x,y)=>[2*x,-2*y] },
    valley:  { label: '0.5x² + 2y²',  f:(x,y)=>0.5*x*x+2*y*y, grad:(x,y)=>[x,4*y] },
    rosenbrock:{ label: 'Rosenbrock',  f:(x,y)=>(1-x)**2+100*(y-x*x)**2, grad:(x,y)=>[-2*(1-x)-400*x*(y-x*x), 200*(y-x*x)] },
  };
  let fnKey='bowl';
  let mousePos = null;
  let gdPath = [];
  let animGd = false;

  container.innerHTML = `
    <div class="plot-row">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Gradient Field</span>
          <div class="segmented" id="fn-seg">
            ${Object.entries(FUNCS).map(([k,v])=>`<button class="seg-btn ${k==='bowl'?'active':''}" data-fn="${k}">${v.label}</button>`).join('')}
          </div>
        </div>
        <p class="text-muted" style="font-size:0.8rem;margin-bottom:8px">Hover to see the gradient ∇f at any point. Click to start a gradient descent path from that point.</p>
        <canvas id="grad-canvas" class="plot-canvas" height="400" style="height:400px;cursor:crosshair"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Gradient at cursor</span></div>
        <div class="stat-chips" id="grad-stats">
          <div class="stat-chip"><span class="chip-val">—</span><span class="chip-label">∂f/∂x</span></div>
          <div class="stat-chip"><span class="chip-val">—</span><span class="chip-label">∂f/∂y</span></div>
          <div class="stat-chip"><span class="chip-val">—</span><span class="chip-label">f(x,y)</span></div>
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Learning rate η <span id="lr-disp">0.10</span></div>
          <input type="range" id="lr-slider" min="0.01" max="0.5" step="0.01" value="0.1">
        </div>
        <button class="btn btn-secondary btn-sm" id="clear-gd">Clear paths</button>
        <div class="formula-box" id="grad-formula"></div>
        <div class="info-callout">
          <strong>ML use:</strong> Gradient descent moves parameters in the direction <em>opposite</em> to the gradient. Every neural network trains using this principle.
        </div>
      </div>
    </div>
  `;
  try{katex.render('\\theta_{t+1}=\\theta_t-\\eta\\nabla_{\\theta}L(\\theta)',container.querySelector('#grad-formula'),{throwOnError:false,displayMode:true});}catch{}

  const canvas=container.querySelector('#grad-canvas');
  const ctx=canvas.getContext('2d');
  let W=canvas.width=canvas.offsetWidth, H=canvas.height=400;
  let cx=W/2, cy=H/2, scale=W/6;
  let lr=0.1;

  container.querySelector('#fn-seg').querySelectorAll('[data-fn]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      container.querySelectorAll('[data-fn]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      fnKey=btn.dataset.fn; gdPath=[]; animGd=false;
    });
  });
  const lrSlider=container.querySelector('#lr-slider');
  lrSlider.addEventListener('input',e=>{lr=parseFloat(e.target.value);container.querySelector('#lr-disp').textContent=lr.toFixed(2);updateSliderTrack(lrSlider);});
  updateSliderTrack(lrSlider);
  container.querySelector('#clear-gd').addEventListener('click',()=>{gdPath=[];animGd=false;});

  canvas.addEventListener('mousemove',e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left, my=e.clientY-r.top;
    const wx=(mx-cx)/scale, wy=-(my-cy)/scale;
    mousePos={wx,wy};
    const fn=FUNCS[fnKey];
    const g=fn.grad(wx,wy);
    const fv=fn.f(wx,wy);
    container.querySelector('#grad-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${g[0].toFixed(3)}</span><span class="chip-label">∂f/∂x</span></div>
      <div class="stat-chip"><span class="chip-val">${g[1].toFixed(3)}</span><span class="chip-label">∂f/∂y</span></div>
      <div class="stat-chip"><span class="chip-val">${fv.toFixed(3)}</span><span class="chip-label">f(x,y)</span></div>
    `;
  });
  canvas.addEventListener('mouseleave',()=>{mousePos=null;});
  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    const wx=(e.clientX-r.left-cx)/scale, wy=-(e.clientY-r.top-cy)/scale;
    // Run gradient descent for 60 steps
    const path=[{x:wx,y:wy}];
    let cur={x:wx,y:wy};
    const fn=FUNCS[fnKey];
    for(let i=0;i<80;i++){
      const g=fn.grad(cur.x,cur.y);
      cur={x:cur.x-lr*g[0], y:cur.y-lr*g[1]};
      path.push({...cur});
      if(Math.abs(g[0])<0.001&&Math.abs(g[1])<0.001) break;
    }
    gdPath.push(path);
  });

  function toS(wx,wy){return{x:cx+wx*scale,y:cy-wy*scale};}

  function draw() {
    if(!loop.running)return;
    ctx.clearRect(0,0,W,H);
    const fn=FUNCS[fnKey];

    // Contour heatmap
    const res=3;
    for(let px=0;px<W;px+=res){
      for(let py=0;py<H;py+=res){
        const wx=(px-cx)/scale, wy=-(py-cy)/scale;
        let v=fn.f(wx,wy);
        v=Math.max(0,Math.min(1,v/12));
        const hue=240-v*240;
        ctx.fillStyle=`hsla(${hue},70%,${20+v*15}%,0.9)`;
        ctx.fillRect(px,py,res,res);
      }
    }

    // Grid lines
    ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;
    for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*scale,0);ctx.lineTo(cx+i*scale,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,cy+i*scale);ctx.lineTo(W,cy+i*scale);ctx.stroke();}
    ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.stroke();

    // Gradient field arrows
    const gstep=scale*0.5;
    for(let px=gstep/2;px<W;px+=gstep){for(let py=gstep/2;py<H;py+=gstep){
      const wx=(px-cx)/scale, wy=-(py-cy)/scale;
      const g=fn.grad(wx,wy);
      const mag=Math.hypot(g[0],g[1])+0.001;
      const norm=Math.min(gstep*0.45/mag,gstep*0.45);
      const ex=px-g[0]/mag*norm, ey=py+g[1]/mag*norm;
      ctx.strokeStyle=`rgba(255,255,255,${0.15})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.beginPath();ctx.arc(ex,ey,1.5,0,Math.PI*2);ctx.fill();
    }}

    // GD paths
    gdPath.forEach((path,pi)=>{
      const hue=pi*60;
      ctx.strokeStyle=`hsl(${hue},80%,65%)`;ctx.lineWidth=2;
      ctx.beginPath();
      path.forEach((pt,i)=>{const s=toS(pt.x,pt.y);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);});
      ctx.stroke();
      path.forEach((pt,i)=>{if(i%5===0){const s=toS(pt.x,pt.y);ctx.fillStyle=`hsl(${hue},80%,65%)`;ctx.beginPath();ctx.arc(s.x,s.y,3,0,Math.PI*2);ctx.fill();}});
      // Start & end
      const s0=toS(path[0].x,path[0].y),se=toS(path[path.length-1].x,path[path.length-1].y);
      ctx.fillStyle='white';ctx.beginPath();ctx.arc(s0.x,s0.y,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4ade80';ctx.beginPath();ctx.arc(se.x,se.y,5,0,Math.PI*2);ctx.fill();
    });

    // Cursor gradient arrow
    if(mousePos){
      const g=fn.grad(mousePos.wx,mousePos.wy);
      const s=toS(mousePos.wx,mousePos.wy);
      const mag=Math.hypot(g[0],g[1])+0.001;
      const len=50;
      drawArrow2(ctx,s.x,s.y,s.x+g[0]/mag*len,s.y-g[1]/mag*len,'#fbbf24',2.5);
      ctx.fillStyle='rgba(251,191,36,0.9)';ctx.font='11px Inter';
      ctx.fillText(`∇f=(${g[0].toFixed(2)},${g[1].toFixed(2)})`,s.x+8,s.y-10);
    }

    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 5: Chain Rule — composite function animator
   ================================================================ */
function renderChainRule(container, loop) {
  container.innerHTML = `
    <div class="card" style="margin-bottom:var(--gap-md)">
      <div class="card-header"><span class="card-title">The Chain Rule — How Backpropagation Works</span></div>
      <div class="info-callout">
        <strong>Chain Rule:</strong> If z = g(y) and y = f(x), then dz/dx = (dz/dy) · (dy/dx). In a neural network with many layers, gradients multiply through every layer — this is backpropagation.
      </div>
    </div>
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Composition Graph</span></div>
        <canvas id="chain-canvas" class="plot-canvas" height="340" style="height:340px"></canvas>
        <div class="slider-wrap" style="margin-top:var(--gap-md)">
          <div class="slider-label">Input x <span id="x-disp">1.00</span></div>
          <input type="range" id="x-slider" min="-3" max="3" step="0.05" value="1">
        </div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Function Chain</span></div>
        <div class="flex gap-sm" style="flex-wrap:wrap">
          ${[['f=x²,g=sin(y)',0],['f=e^x,g=x²',1],['f=ReLU,g=x²',2],['f=sigmoid,g=ln',3]].map(([l,i])=>
            `<button class="btn btn-sm btn-secondary" data-chain="${i}">${l}</button>`).join('')}
        </div>
        <div class="stat-chips" id="chain-stats"></div>
        <div class="formula-box" id="chain-formula"></div>
        <div class="formula-box" id="chain-deriv"></div>
        <div class="info-callout">
          <strong>Vanishing gradients:</strong> If many of these small derivatives multiply together, the product → 0. This is why deep networks with sigmoid activations were hard to train — ReLU helps because its derivative is exactly 1 for positive inputs.
        </div>
      </div>
    </div>
  `;

  const CHAINS = [
    { fLabel:'f(x)=x²', gLabel:'g(y)=sin(y)', f:x=>x*x, g:y=>Math.sin(y), df:x=>2*x, dg:y=>Math.cos(y), tex:'z=\\sin(x^2)', dtex:"\\frac{dz}{dx}=\\cos(x^2)\\cdot 2x" },
    { fLabel:'f(x)=eˣ', gLabel:'g(y)=y²', f:x=>Math.exp(x), g:y=>y*y, df:x=>Math.exp(x), dg:y=>2*y, tex:'z=e^{2x}', dtex:"\\frac{dz}{dx}=2e^x\\cdot e^x=2e^{2x}" },
    { fLabel:'f(x)=ReLU', gLabel:'g(y)=y²', f:x=>Math.max(0,x), g:y=>y*y, df:x=>x>0?1:0, dg:y=>2*y, tex:'z=\\text{ReLU}(x)^2', dtex:"\\frac{dz}{dx}=2\\text{ReLU}(x)\\cdot\\mathbf{1}[x>0]" },
    { fLabel:'f(x)=σ(x)', gLabel:'g(y)=ln(y)', f:x=>1/(1+Math.exp(-x)), g:y=>Math.log(Math.max(y,1e-10)), df:x=>{const s=1/(1+Math.exp(-x));return s*(1-s);}, dg:y=>1/Math.max(y,1e-10), tex:'z=\\ln(\\sigma(x))', dtex:"\\frac{dz}{dx}=\\frac{1}{\\sigma(x)}\\cdot\\sigma(x)(1-\\sigma(x))=1-\\sigma(x)" },
  ];

  let chainIdx=0;
  let x=1.0;
  const canvas=container.querySelector('#chain-canvas');
  const ctx=canvas.getContext('2d');
  let W=canvas.width=canvas.offsetWidth, H=canvas.height=340;

  container.querySelectorAll('[data-chain]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      container.querySelectorAll('[data-chain]').forEach(b=>b.classList.replace('btn-primary','btn-secondary'));
      btn.classList.replace('btn-secondary','btn-primary');
      chainIdx=parseInt(btn.dataset.chain);
      update();
    });
  });
  const xSlider=container.querySelector('#x-slider');
  xSlider.addEventListener('input',e=>{x=parseFloat(e.target.value);container.querySelector('#x-disp').textContent=x.toFixed(2);updateSliderTrack(xSlider);update();});
  updateSliderTrack(xSlider);

  function update() {
    const ch=CHAINS[chainIdx];
    const y=ch.f(x), z=ch.g(y);
    const dydx=ch.df(x), dzdx=ch.dg(y)*dydx;
    container.querySelector('#chain-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${x.toFixed(3)}</span><span class="chip-label">x</span></div>
      <div class="stat-chip"><span class="chip-val">${isFinite(y)?y.toFixed(3):'±∞'}</span><span class="chip-label">y=f(x)</span></div>
      <div class="stat-chip"><span class="chip-val">${isFinite(z)?z.toFixed(3):'±∞'}</span><span class="chip-label">z=g(y)</span></div>
      <div class="stat-chip"><span class="chip-val">${dydx.toFixed(3)}</span><span class="chip-label">dy/dx</span></div>
      <div class="stat-chip"><span class="chip-val">${ch.dg(y).toFixed(3)}</span><span class="chip-label">dz/dy</span></div>
      <div class="stat-chip"><span class="chip-val" style="color:#fbbf24">${isFinite(dzdx)?dzdx.toFixed(3):'±∞'}</span><span class="chip-label">dz/dx</span></div>
    `;
    try{katex.render(ch.tex,container.querySelector('#chain-formula'),{throwOnError:false,displayMode:true});}catch{}
    try{katex.render(ch.dtex,container.querySelector('#chain-deriv'),{throwOnError:false,displayMode:true});}catch{}
  }

  function draw() {
    if(!loop.running)return;
    const ch=CHAINS[chainIdx];
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='var(--bg-elevated,#1a1f2e)';

    // Draw computation graph: x → [f] → y → [g] → z
    const nodes=[
      {x:W*0.1, y:H/2, label:'x', val:x.toFixed(2), color:'#06b6d4'},
      {x:W*0.35, y:H/2, label:ch.fLabel, val:'', color:'#7c3aed', isBox:true},
      {x:W*0.55, y:H/2, label:'y', val:ch.f(x).toFixed(2), color:'#10b981'},
      {x:W*0.75, y:H/2, label:ch.gLabel, val:'', color:'#7c3aed', isBox:true},
      {x:W*0.92, y:H/2, label:'z', val:ch.g(ch.f(x)).toFixed(2), color:'#fbbf24'},
    ];

    // Arrows
    [[0,1],[1,2],[2,3],[3,4]].forEach(([from,to])=>{
      const n1=nodes[from], n2=nodes[to];
      const x1=n1.isBox?n1.x+50:n1.x+22, x2=n2.isBox?n2.x-50:n2.x-22;
      ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,n1.y);ctx.lineTo(x2,n2.y);ctx.stroke();
    });

    // Backward pass gradients below the graph
    const grads=[
      {x:W*0.1, lbl:'dz/dx', val:(ch.dg(ch.f(x))*ch.df(x)).toFixed(3), color:'#fbbf24'},
      {x:W*0.42, lbl:'×', val:'', color:'rgba(255,255,255,0.3)'},
      {x:W*0.55, lbl:'dz/dy', val:ch.dg(ch.f(x)).toFixed(3), color:'rgba(253,231,37,0.7)'},
      {x:W*0.72, lbl:'×', val:'', color:'rgba(255,255,255,0.3)'},
      {x:W*0.92, lbl:'dy/dx', val:ch.df(x).toFixed(3), color:'rgba(16,185,129,0.8)'},
    ];

    // Gradient backward arrow
    ctx.strokeStyle='rgba(251,191,36,0.3)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(W*0.92,H/2+56);ctx.lineTo(W*0.1,H/2+56);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(251,191,36,0.5)';ctx.font='10px Inter';ctx.textAlign='center';
    ctx.fillText('← backward pass (chain rule)',W/2,H/2+70);

    grads.forEach(g=>{
      if(g.val){
        ctx.fillStyle=g.color;ctx.font='bold 11px JetBrains Mono, monospace';ctx.textAlign='center';
        ctx.fillText(g.val,g.x,H/2+46);
        ctx.font='10px Inter';ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.fillText(g.lbl,g.x,H/2+34);
      } else {
        ctx.fillStyle=g.color;ctx.font='16px sans-serif';
        ctx.fillText(g.lbl,g.x,H/2+44);
      }
    });

    // Nodes
    nodes.forEach(n=>{
      if(n.isBox){
        ctx.fillStyle='rgba(124,58,237,0.15)';ctx.strokeStyle=n.color;ctx.lineWidth=1.5;
        roundRectStroke(ctx,n.x-50,n.y-22,100,44,8);
        ctx.fillStyle=n.color;ctx.font='10px Inter';ctx.textAlign='center';
        ctx.fillText(n.label,n.x,n.y+4);
      } else {
        ctx.fillStyle=n.color;ctx.beginPath();ctx.arc(n.x,n.y,22,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='white';ctx.font='bold 13px Inter';ctx.textAlign='center';
        ctx.fillText(n.label,n.x,n.y-4);
        ctx.font='10px JetBrains Mono,monospace';ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.fillText(n.val,n.x,n.y+12);
      }
    });

    ctx.textAlign='left';
    requestAnimationFrame(draw);
  }
  update(); draw();
}

// ---- Shared helpers ----
function drawArrow2(ctx, x1, y1, x2, y2, color, lw = 2) {
  const angle = Math.atan2(y2-y1,x2-x1);
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=lw;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const al=10,aa=0.42;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2-al*Math.cos(angle-aa),y2-al*Math.sin(angle-aa));
  ctx.lineTo(x2-al*Math.cos(angle+aa),y2-al*Math.sin(angle+aa));
  ctx.closePath(); ctx.fill();
}
function roundRectStroke(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  ctx.fill(); ctx.stroke();
}
function updateSliderTrack(slider) {
  if(!slider)return;
  const mn=parseFloat(slider.min),mx=parseFloat(slider.max),v=parseFloat(slider.value);
  slider.style.setProperty('--pct',`${((v-mn)/(mx-mn))*100}%`);
}
