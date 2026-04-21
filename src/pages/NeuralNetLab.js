import katex from 'katex';
import { gsap } from 'gsap';

/* ============================================================
   Neural Net Lab
   Tabs: Architecture | Activations | Forward Pass | Training
   ============================================================ */

const TABS = [
  { id: 'arch',        label: '🧠 Architecture' },
  { id: 'activations', label: '⚡ Activations' },
  { id: 'forward',     label: '→ Forward Pass' },
  { id: 'training',    label: '📉 Training' },
];

export function NeuralNetLab() {
  let activeTab = 'arch';
  const loop = { running: true };

  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">🧠 Neural Net <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">Build a neural network layer by layer, observe activation functions, watch data flow forward, and train a classifier live.</p>
      </div>
    </div>
    <div class="lab-tabs" id="nn-tabs">
      ${TABS.map(t=>`<button class="lab-tab ${t.id==='arch'?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="nn-content"></div>
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
    const c = el.querySelector('#nn-content');
    c.innerHTML = ''; loop.running = true;
    const map = { arch: renderArch, activations: renderActivations, forward: renderForward, training: renderTraining };
    map[activeTab]?.(c, loop);
    gsap.fromTo(c, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
  }

  return el;
}

/* ================================================================
   TAB 1: Architecture Builder
   ================================================================ */
function renderArch(container, loop) {
  // Default architecture: [2, 4, 4, 1]
  let layers = [2, 4, 3, 1];

  container.innerHTML = `
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header">
          <span class="card-title">Network Architecture</span>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-secondary" id="nn-add-layer">+ Add Layer</button>
            <button class="btn btn-sm btn-secondary" id="nn-remove-layer">− Remove Layer</button>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:8px">Click a layer label to change neuron count. The diagram updates instantly.</p>
        <canvas id="arch-canvas" class="plot-canvas" height="460" style="height:460px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Layer Controls</span></div>
        <div id="layer-controls"></div>
        <div class="stat-chips" id="arch-stats"></div>
        <div class="info-callout">
          <strong>Parameters</strong> = sum of (neurons_in × neurons_out + neurons_out) per layer. More parameters → more capacity but slower training.
        </div>
        <div class="formula-box" id="arch-formula"></div>
      </div>
    </div>
  `;

  container.querySelector('#nn-add-layer').addEventListener('click', () => {
    if(layers.length < 8) { layers.splice(layers.length-1, 0, 4); renderLayerControls(); updateStats(); }
  });
  container.querySelector('#nn-remove-layer').addEventListener('click', () => {
    if(layers.length > 2) { layers.splice(layers.length-2, 1); renderLayerControls(); updateStats(); }
  });

  function renderLayerControls() {
    const ctrl = container.querySelector('#layer-controls');
    ctrl.innerHTML = '';
    layers.forEach((n, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
      const label = i===0?'Input':i===layers.length-1?'Output':`Hidden ${i}`;
      row.innerHTML = `
        <span style="font-size:0.75rem;color:var(--text-muted);min-width:70px">${label}</span>
        <input type="number" min="1" max="16" value="${n}" style="width:60px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--accent-cyan);border-radius:4px;padding:4px 8px;font-family:var(--font-mono);font-size:0.8rem;text-align:center">
        <span style="font-size:0.72rem;color:var(--text-muted)">neurons</span>
      `;
      const input = row.querySelector('input');
      input.addEventListener('change', () => {
        layers[i] = Math.max(1, Math.min(16, parseInt(input.value)||1));
        updateStats();
      });
      ctrl.appendChild(row);
    });
  }

  function updateStats() {
    let params = 0;
    for(let i=0;i<layers.length-1;i++) params += layers[i]*layers[i+1]+layers[i+1];
    container.querySelector('#arch-stats').innerHTML = `
      <div class="stat-chip"><span class="chip-val">${layers.length}</span><span class="chip-label">Layers</span></div>
      <div class="stat-chip"><span class="chip-val">${layers.reduce((s,n)=>s+n,0)}</span><span class="chip-label">Neurons</span></div>
      <div class="stat-chip"><span class="chip-val">${params.toLocaleString()}</span><span class="chip-label">Parameters</span></div>
    `;
    try{katex.render(`\\text{params}=\\sum_{l=1}^{L}(n_l\\cdot n_{l-1}+n_l)=${params}`,container.querySelector('#arch-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  renderLayerControls(); updateStats();

  const canvas=container.querySelector('#arch-canvas');
  const ctx=canvas.getContext('2d');

  function draw() {
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=460;
    ctx.clearRect(0,0,W,H);
    const maxN=Math.max(...layers);
    const lx=layers.map((_,i)=>(i+1)*W/(layers.length+1));

    // Connection weights (animated)
    const t=Date.now()*0.001;
    layers.forEach((_,li)=>{
      if(li>=layers.length-1)return;
      const nA=layers[li], nB=layers[li+1];
      const xA=lx[li], xB=lx[li+1];
      for(let a=0;a<nA;a++){for(let b=0;b<nB;b++){
        const yA=H/2+(a-(nA-1)/2)*50;
        const yB=H/2+(b-(nB-1)/2)*50;
        const pulse=(Math.sin(t*2+li*0.7+a*0.3+b*0.2)+1)/2;
        ctx.strokeStyle=`rgba(124,58,237,${0.04+pulse*0.12})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(xA,yA);ctx.lineTo(xB,yB);ctx.stroke();
      }}
    });

    // Neurons
    const colors=['#06b6d4','#7c3aed','#ec4899','#10b981','#fbbf24','#f97316'];
    layers.forEach((n,li)=>{
      const x=lx[li];
      const clr=li===0?colors[0]:li===layers.length-1?colors[3]:colors[1];
      for(let ni=0;ni<n;ni++){
        const y=H/2+(ni-(n-1)/2)*50;
        const pulse=(Math.sin(t*1.5+li*0.8+ni*0.4)+1)/2;
        // Shadow
        ctx.shadowColor=clr; ctx.shadowBlur=8+pulse*8;
        ctx.fillStyle=`rgba(${hexToRgbStr(clr)},${0.7+pulse*0.3})`;
        ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        // Inner
        ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.arc(x-4,y-4,4,0,Math.PI*2);ctx.fill();
      }
      // Layer label
      ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px Inter';ctx.textAlign='center';
      const lbl=li===0?'Input':li===layers.length-1?'Output':`H${li}`;
      ctx.fillText(lbl,x,H-12);
      ctx.fillText(`${n}`,x,H-26);
    });

    // Arrow between layers
    for(let i=0;i<layers.length-1;i++){
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='16px sans-serif';ctx.textAlign='center';
      ctx.fillText('→',(lx[i]+lx[i+1])/2,H/2+4);
    }

    ctx.textAlign='left';
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 2: Activation Functions
   ================================================================ */
function renderActivations(container, loop) {
  const ACTS = {
    sigmoid:  { fn:x=>1/(1+Math.exp(-x)), dfn:x=>{const s=1/(1+Math.exp(-x));return s*(1-s);}, tex:'\\sigma(x)=\\frac{1}{1+e^{-x}}', desc:'Classic activation. Squashes output to (0,1). Suffers from vanishing gradients for large |x|.' },
    tanh:     { fn:x=>Math.tanh(x), dfn:x=>1-Math.tanh(x)**2, tex:'\\tanh(x)=\\frac{e^x-e^{-x}}{e^x+e^{-x}}', desc:'Zero-centred sigmoid. Outputs in (-1,1). Still vanishes for large |x|.' },
    relu:     { fn:x=>Math.max(0,x), dfn:x=>x>0?1:0, tex:'\\text{ReLU}(x)=\\max(0,x)', desc:'Dead simple: pass positive, zero negative. Derivative is 1 or 0 — no vanishing! Can "die" (always zero) if not careful.' },
    leakyrelu:{ fn:x=>x>0?x:0.01*x, dfn:x=>x>0?1:0.01, tex:'\\text{LReLU}(x)=\\max(0.01x,x)', desc:'Fixes dying ReLU by allowing small negative gradient (0.01).' },
    gelu:     { fn:x=>x*0.5*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+0.044715*x**3))), dfn:x=>{const h=0.5*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+0.044715*x**3)));return h+x*0.5*(1-h*h)*Math.sqrt(2/Math.PI)*(1+3*0.044715*x**2);}, tex:'\\text{GELU}(x)=x\\Phi(x)', desc:'Used in GPT/BERT. Smooth ReLU-like shape. Allows small negative values with stochastic justification.' },
    swish:    { fn:x=>x/(1+Math.exp(-x)), dfn:x=>{const s=1/(1+Math.exp(-x));return s+x*s*(1-s);}, tex:'\\text{Swish}(x)=x\\cdot\\sigma(x)', desc:'Self-gated activation found by neural architecture search. Outperforms ReLU on deep networks.' },
  };
  let selected=Object.keys(ACTS);

  container.innerHTML=`
    <div class="card" style="margin-bottom:var(--gap-md)">
      <div class="card-header"><span class="card-title">Compare Activation Functions</span><span class="text-muted" style="font-size:0.78rem">Check/uncheck to show/hide</span></div>
      <div class="flex gap-sm" style="flex-wrap:wrap" id="act-toggles">
        ${Object.entries(ACTS).map(([k,v],i)=>{const c=ACT_COLORS[i];return `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.8rem">
          <input type="checkbox" id="act-${k}" checked style="accent-color:${c}">
          <span style="color:${c}">${k}</span></label>`;}).join('')}
      </div>
    </div>
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">f(x) — Activation</span></div>
        <canvas id="act-canvas" class="plot-canvas" height="300" style="height:300px"></canvas>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">f′(x) — Derivative (gradient)</span></div>
        <canvas id="deriv-canvas" class="plot-canvas" height="300" style="height:300px"></canvas>
      </div>
    </div>
    <div class="plot-row" style="margin-top:var(--gap-md)">
      ${Object.entries(ACTS).map(([k,v],i)=>`
        <div class="card" style="padding:var(--gap-md)">
          <div style="color:${ACT_COLORS[i]};font-weight:700;font-size:0.85rem;margin-bottom:6px">${k}</div>
          <div id="act-formula-${k}"></div>
          <p class="text-muted" style="font-size:0.78rem;margin-top:8px;line-height:1.5">${v.desc}</p>
        </div>`).join('')}
    </div>
  `;

  Object.entries(ACTS).forEach(([k,v])=>{
    try{katex.render(v.tex,container.querySelector(`#act-formula-${k}`),{throwOnError:false,displayMode:true});}catch{}
    container.querySelector(`#act-${k}`)?.addEventListener('change',()=>{
      selected=Object.keys(ACTS).filter(k2=>container.querySelector(`#act-${k2}`)?.checked);
    });
  });

  const actCanvas=container.querySelector('#act-canvas');
  const derivCanvas=container.querySelector('#deriv-canvas');

  function drawFn(canvas, getter, label, yRange=[-1.5,1.5]) {
    const ctx=canvas.getContext('2d');
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=300;
    ctx.clearRect(0,0,W,H);
    const pad=30;
    const cy=H/2, cx=pad;
    const xRange=[-5,5];
    function toS(x,y){return{x:pad+(x-xRange[0])/(xRange[1]-xRange[0])*(W-2*pad), y:H-pad-(y-yRange[0])/(yRange[1]-yRange[0])*(H-2*pad)};}

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
    for(let v=-4;v<=4;v+=2){const s=toS(v,0);ctx.beginPath();ctx.moveTo(s.x,pad);ctx.lineTo(s.x,H-pad);ctx.stroke();}
    for(let v=Math.ceil(yRange[0]);v<=yRange[1];v+=1){const s=toS(0,v);ctx.beginPath();ctx.moveTo(pad,s.y);ctx.lineTo(W-pad,s.y);ctx.stroke();}
    // Axes
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1.5;
    const ax=toS(0,0);
    ctx.beginPath();ctx.moveTo(pad,ax.y);ctx.lineTo(W-pad,ax.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(toS(0,yRange[0]).x,pad);ctx.lineTo(toS(0,yRange[1]).x,H-pad);ctx.stroke();
    // Labels
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='10px JetBrains Mono';ctx.textAlign='center';
    [-4,-2,0,2,4].forEach(v=>{const s=toS(v,0);ctx.fillText(v,s.x,ax.y+14);});

    // Curves
    Object.entries(ACTS).forEach(([k,v],i)=>{
      if(!selected.includes(k))return;
      const fn=getter(v);
      ctx.strokeStyle=ACT_COLORS[i];ctx.lineWidth=2.5;ctx.beginPath();let first=true;
      for(let px=pad;px<W-pad;px++){
        const x=xRange[0]+(px-pad)/(W-2*pad)*(xRange[1]-xRange[0]);
        const y=fn(x);
        if(!isFinite(y)){first=true;continue;}
        const s=toS(x,Math.max(yRange[0],Math.min(yRange[1],y)));
        first?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);first=false;
      }
      ctx.stroke();
      // Label at right edge
      ctx.fillStyle=ACT_COLORS[i];ctx.font='bold 10px Inter';ctx.textAlign='left';
      const lastX=xRange[1]-0.3;
      const lastY=Math.max(yRange[0],Math.min(yRange[1],fn(lastX)));
      const ls=toS(lastX,lastY);
      ctx.fillText(k,ls.x+2,ls.y);
    });
    ctx.textAlign='left';
  }

  function draw(){
    if(!loop.running)return;
    drawFn(actCanvas,v=>v.fn,'f(x)');
    drawFn(derivCanvas,v=>v.dfn,"f'(x)",[-.2,1.2]);
    requestAnimationFrame(draw);
  }
  draw();
}

const ACT_COLORS=['#7c3aed','#06b6d4','#ec4899','#10b981','#fbbf24','#f97316'];

/* ================================================================
   TAB 3: Forward Pass — data flowing through MLP
   ================================================================ */
function renderForward(container, loop) {
  const layers=[2,4,3,1];
  let inputVec=[0.8,-0.5];
  let weights=initWeights(layers);
  let activations=null;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Forward Pass Visualisation</span></div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:8px">Colours show activation values. Brighter = more activated. Watch the signal flow from input to output.</p>
        <canvas id="fwd-canvas" class="plot-canvas" height="480" style="height:480px"></canvas>
      </div>
      <div class="card" style="width:260px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Input & Activation</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Input x₁ <span id="x1-disp">0.80</span></div>
          <input type="range" id="x1-slider" min="-2" max="2" step="0.01" value="0.8">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Input x₂ <span id="x2-disp">-0.50</span></div>
          <input type="range" id="x2-slider" min="-2" max="2" step="0.01" value="-0.5">
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-sm btn-secondary" id="rand-weights" style="flex:1">🎲 Rand Weights</button>
        </div>
        <div class="segmented" id="act-fn-seg" style="margin-top:4px">
          <button class="seg-btn active" data-act="relu">ReLU</button>
          <button class="seg-btn" data-act="sigmoid">Sigmoid</button>
          <button class="seg-btn" data-act="tanh">Tanh</button>
        </div>
        <div id="fwd-activations" class="matrix-display" style="max-height:220px;overflow-y:auto;font-size:0.7rem"></div>
        <div class="formula-box" id="fwd-formula"></div>
      </div>
    </div>
  `;

  let actFn='relu';
  const actFns={relu:x=>Math.max(0,x),sigmoid:x=>1/(1+Math.exp(-x)),tanh:x=>Math.tanh(x)};

  container.querySelectorAll('[data-act]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      container.querySelectorAll('[data-act]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
      actFn=btn.dataset.act;forwardPass();
    });
  });
  const x1Sl=container.querySelector('#x1-slider'), x2Sl=container.querySelector('#x2-slider');
  [x1Sl,x2Sl].forEach(s=>s.addEventListener('input',()=>{
    inputVec=[parseFloat(x1Sl.value),parseFloat(x2Sl.value)];
    container.querySelector('#x1-disp').textContent=inputVec[0].toFixed(2);
    container.querySelector('#x2-disp').textContent=inputVec[1].toFixed(2);
    updateSliderTrack(x1Sl);updateSliderTrack(x2Sl);forwardPass();
  }));
  updateSliderTrack(x1Sl);updateSliderTrack(x2Sl);
  container.querySelector('#rand-weights').addEventListener('click',()=>{weights=initWeights(layers);forwardPass();});

  function forwardPass(){
    const fn=actFns[actFn];
    const acts=[[...inputVec]];
    let cur=[...inputVec];
    for(let l=0;l<layers.length-1;l++){
      const {W,b}=weights[l];
      const z=b.map((bv,i)=>bv+W[i].reduce((s,w,j)=>s+w*cur[j],0));
      const a=l<layers.length-2?z.map(fn):z.map(x=>1/(1+Math.exp(-x))); // sigmoid for output
      acts.push(a); cur=a;
    }
    activations=acts;
    // Show values
    const el2=container.querySelector('#fwd-activations');
    el2.innerHTML=acts.map((a,i)=>`<div style="margin-bottom:6px"><div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:2px">Layer ${i} (${['input','h1','h2','output'][Math.min(i,3)]})</div><div class="m-row">${a.map(v=>`<span class="m-cell" style="color:${v>0?'#06b6d4':'#ec4899'}">${v.toFixed(3)}</span>`).join('')}</div></div>`).join('');
    try{katex.render(`h^{(l)}=\\sigma\\left(W^{(l)}h^{(l-1)}+b^{(l)}\\right)`,container.querySelector('#fwd-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  const canvas=container.querySelector('#fwd-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=480;
    ctx.clearRect(0,0,W,H);
    if(!activations){requestAnimationFrame(draw);return;}

    const lx=layers.map((_,i)=>(i+1)*W/(layers.length+1));
    const t=Date.now()*0.001;

    // Connections with activation-weighted brightness
    layers.forEach((_,li)=>{
      if(li>=layers.length-1)return;
      const nA=layers[li],nB=layers[li+1];
      for(let a=0;a<nA;a++){for(let b=0;b<nB;b++){
        const yA=H/2+(a-(nA-1)/2)*52, yB=H/2+(b-(nB-1)/2)*52;
        const wv=weights[li].W[b][a];
        const brightness=Math.abs(wv)*0.3;
        ctx.strokeStyle=wv>0?`rgba(6,182,212,${brightness})`:  `rgba(236,72,153,${brightness})`;
        ctx.lineWidth=Math.min(2.5,Math.abs(wv)*1.5);
        ctx.beginPath();ctx.moveTo(lx[li],yA);ctx.lineTo(lx[li+1],yB);ctx.stroke();
      }}
    });

    // Neurons coloured by activation
    layers.forEach((n,li)=>{
      for(let ni=0;ni<n;ni++){
        const x=lx[li],y=H/2+(ni-(n-1)/2)*52;
        const av=activations[li]?.[ni]??0;
        const norm=Math.max(0,Math.min(1,(av+1)/2));
        const hue=norm>0.5?120:240;
        const light=20+norm*55;
        ctx.shadowColor=`hsl(${hue},80%,${light}%)`;ctx.shadowBlur=norm*16;
        ctx.fillStyle=`hsl(${hue},75%,${light}%)`;
        ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.font='9px JetBrains Mono';ctx.textAlign='center';
        ctx.fillText(av.toFixed(2),x,y+3);

        // Activation pulse animation
        const pulse=(Math.sin(t*2+li*0.7+ni*0.5)+1)/2*norm;
        ctx.strokeStyle=`rgba(255,255,255,${pulse*0.5})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(x,y,16+pulse*6,0,Math.PI*2);ctx.stroke();
      }
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='11px Inter';ctx.textAlign='center';
      ctx.fillText(li===0?'Input':li===layers.length-1?'Output':`H${li}`,lx[li],H-12);
    });
    ctx.textAlign='left';
    requestAnimationFrame(draw);
  }
  forwardPass();draw();
}

/* ================================================================
   TAB 4: Training — live classifier training
   ================================================================ */
function renderTraining(container, loop) {
  // XOR-like classification dataset
  let pts=genXORData(80);
  let nnWeights=null;
  let training=false;
  let epoch=0;
  let lossHist=[];
  let lr=0.05;
  const arch=[2,8,8,1];

  container.innerHTML=`
    <div class="plot-row">
      <div class="card">
        <div class="card-header"><span class="card-title">Decision Boundary (XOR Problem)</span>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-secondary" id="train-reset">↺ Reset</button>
            <button class="btn btn-sm btn-primary" id="train-toggle">▶ Train</button>
          </div>
        </div>
        <canvas id="train-canvas" class="plot-canvas" height="380" style="height:380px;cursor:crosshair"></canvas>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Training Controls</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Learning rate η <span id="train-lr-disp">0.050</span></div>
          <input type="range" id="train-lr" min="0.001" max="0.3" step="0.001" value="0.05">
        </div>
        <div class="stat-chips" id="train-stats"></div>
        <div class="card-header" style="margin-top:4px"><span class="card-title">Loss curve</span></div>
        <canvas id="train-loss" class="loss-curve-canvas"></canvas>
        <div class="info-callout">
          <strong>XOR is famous</strong> for being unsolvable by a single linear layer. You need at least one hidden layer — once you add it, watch the boundary become nonlinear!
        </div>
        <div class="formula-box" id="train-formula"></div>
      </div>
    </div>
  `;
  try{katex.render('L=-\\frac{1}{N}\\sum_i\\left[y_i\\log\\hat{y}_i+(1-y_i)\\log(1-\\hat{y}_i)\\right]',container.querySelector('#train-formula'),{throwOnError:false,displayMode:true});}catch{}

  function resetNet(){
    nnWeights=initWeights(arch);epoch=0;lossHist=[];training=false;
    container.querySelector('#train-toggle').textContent='▶ Train';
    updateStats(0);
  }
  resetNet();

  const lrSlider=container.querySelector('#train-lr');
  lrSlider.addEventListener('input',e=>{lr=parseFloat(e.target.value);container.querySelector('#train-lr-disp').textContent=lr.toFixed(3);updateSliderTrack(lrSlider);});
  updateSliderTrack(lrSlider);
  container.querySelector('#train-toggle').addEventListener('click',()=>{
    training=!training;container.querySelector('#train-toggle').textContent=training?'⏸ Pause':'▶ Train';
  });
  container.querySelector('#train-reset').addEventListener('click',resetNet);

  function sigmoid(x){return 1/(1+Math.exp(-x));}
  function relu(x){return Math.max(0,x);}
  function drelu(x){return x>0?1:0;}

  function forward(x){
    let cur=[...x];
    const acts=[cur];
    const zs=[];
    for(let l=0;l<arch.length-1;l++){
      const {W,b}=nnWeights[l];
      const z=b.map((bv,i)=>bv+W[i].reduce((s,w,j)=>s+w*cur[j],0));
      zs.push(z);
      cur=l<arch.length-2?z.map(relu):z.map(sigmoid);
      acts.push(cur);
    }
    return{acts,zs};
  }

  function trainStep(){
    if(!training||!nnWeights)return;
    const batchSize=Math.min(16,pts.length);
    const batch=pts.sort(()=>Math.random()-0.5).slice(0,batchSize);
    let loss=0;
    // Accumulate gradients
    const dW=nnWeights.map(l=>({W:l.W.map(r=>r.map(()=>0)),b:l.b.map(()=>0)}));
    batch.forEach(pt=>{
      const x=[pt.x,pt.y], y=pt.cls;
      const {acts,zs}=forward(x);
      const out=acts[acts.length-1][0];
      loss+=-y*Math.log(out+1e-10)-(1-y)*Math.log(1-out+1e-10);
      // Backprop
      let delta=[out-y];
      for(let l=arch.length-2;l>=0;l--){
        const {W}=nnWeights[l];
        const aIn=acts[l];
        delta.forEach((d,i)=>{
          aIn.forEach((a,j)=>{dW[l].W[i][j]+=d*a/batchSize;});
          dW[l].b[i]+=d/batchSize;
        });
        if(l>0){
          const newDelta=aIn.map((_,j)=>delta.reduce((s,d,i)=>s+d*W[i][j],0)*drelu(zs[l-1][j]));
          delta=newDelta;
        }
      }
    });
    loss/=batchSize;
    lossHist.push(loss);
    // Update
    nnWeights.forEach((l,li)=>{
      l.W.forEach((row,i)=>row.forEach((_,j)=>{l.W[i][j]-=lr*dW[li].W[i][j];}));
      l.b.forEach((_,i)=>{l.b[i]-=lr*dW[li].b[i];});
    });
    epoch++;
    updateStats(loss);
  }

  function updateStats(loss){
    // Accuracy
    const acc=pts.filter(pt=>{const {acts}=forward([pt.x,pt.y]);return Math.round(acts[acts.length-1][0])===pt.cls;}).length/pts.length;
    container.querySelector('#train-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${epoch}</span><span class="chip-label">Epoch</span></div>
      <div class="stat-chip"><span class="chip-val">${loss.toFixed(4)}</span><span class="chip-label">Loss</span></div>
      <div class="stat-chip"><span class="chip-val">${(acc*100).toFixed(1)}%</span><span class="chip-label">Accuracy</span></div>
    `;
  }

  const canvas=container.querySelector('#train-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    // Train multiple steps per frame
    if(training) for(let i=0;i<5;i++) trainStep();

    let W=canvas.width=canvas.offsetWidth, H=canvas.height=380;
    ctx.clearRect(0,0,W,H);
    const pad=20;
    function toS(x,y){return{x:pad+(x-0)/(1-0)*(W-2*pad),y:H-pad-(y-0)/(1-0)*(H-2*pad)};}

    // Decision boundary heatmap
    const res=8;
    for(let px=0;px<W;px+=res){for(let py=0;py<H;py+=res){
      const xv=(px-pad)/(W-2*pad), yv=(H-pad-py)/(H-2*pad);
      if(xv<0||xv>1||yv<0||yv>1)continue;
      const{acts}=forward([xv,yv]);
      const p=acts[acts.length-1][0];
      ctx.fillStyle=`rgba(${p>0.5?'124,58,237':'6,182,212'},${Math.abs(p-0.5)*1.5})`;
      ctx.fillRect(px,py,res,res);
    }}

    // Data points
    pts.forEach(pt=>{
      const s=toS(pt.x,pt.y);
      ctx.fillStyle=pt.cls===1?'#7c3aed':'#06b6d4';
      ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(s.x,s.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();
    });

    // Loss curve
    const lc=container.querySelector('#train-loss');
    if(lc&&lossHist.length>1){
      const lctx=lc.getContext('2d');
      lc.width=lc.offsetWidth||220;lc.height=140;
      const LW=lc.width,LH=lc.height;
      lctx.clearRect(0,0,LW,LH);
      const maxL=Math.max(...lossHist,0.01);
      const g=lctx.createLinearGradient(0,0,LW,0);
      g.addColorStop(0,'#7c3aed');g.addColorStop(1,'#06b6d4');
      lctx.strokeStyle=g;lctx.lineWidth=2;lctx.beginPath();
      const skip=Math.max(1,Math.floor(lossHist.length/LW));
      lossHist.filter((_,i)=>i%skip===0).forEach((l,i,arr)=>{
        const x=(i/arr.length)*LW,y=LH-8-(l/maxL)*(LH-16);
        i===0?lctx.moveTo(x,y):lctx.lineTo(x,y);
      });
      lctx.stroke();
      lctx.fillStyle='rgba(255,255,255,0.35)';lctx.font='10px Inter';
      lctx.fillText(`Loss: ${lossHist[lossHist.length-1]?.toFixed(4)}`,6,14);
      lctx.fillText(`Epoch: ${epoch}`,6,LH-5);
    }

    requestAnimationFrame(draw);
  }
  draw();
}

// ---- Helpers ----
function initWeights(layers){
  return layers.slice(0,-1).map((n,i)=>({
    W:Array.from({length:layers[i+1]},()=>Array.from({length:n},()=>(Math.random()-0.5)*Math.sqrt(2/n))),
    b:new Array(layers[i+1]).fill(0),
  }));
}
function genXORData(n){
  return Array.from({length:n},()=>{
    const x=Math.random(), y=Math.random();
    const cls=(x>0.5)!==(y>0.5)?1:0;
    return{x:x*0.8+0.1+(Math.random()-0.5)*0.08, y:y*0.8+0.1+(Math.random()-0.5)*0.08, cls};
  });
}
function updateSliderTrack(sl){if(!sl)return;const mn=parseFloat(sl.min),mx=parseFloat(sl.max),v=parseFloat(sl.value);sl.style.setProperty('--pct',`${((v-mn)/(mx-mn))*100}%`);}
function hexToRgbStr(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`;}
