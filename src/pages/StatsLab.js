import katex from 'katex';
import { gsap } from 'gsap';

/* ============================================================
   Stats Lab — Phase 1: Probability & Statistics
   Tabs: Distributions | Bayes | Correlation | Entropy | MLE
   ============================================================ */

const TABS = [
  { id: 'dist',    label: '📊 Distributions' },
  { id: 'bayes',   label: '🔮 Bayes Theorem' },
  { id: 'corr',    label: '🔗 Correlation' },
  { id: 'entropy', label: '🌀 Entropy' },
  { id: 'mle',     label: '🎯 MLE' },
];

export function StatsLab() {
  let activeTab = 'dist';
  const loop = { running: true };
  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">📊 Stats <span style="color:var(--accent-cyan)">Lab</span></h1>
        <p class="lab-desc">Probability distributions, Bayes' theorem, correlation, entropy, and maximum likelihood — all made interactive.</p>
      </div>
    </div>
    <div class="lab-tabs" id="stats-tabs">
      ${TABS.map(t=>`<button class="lab-tab ${t.id==='dist'?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="stats-content"></div>
  `;

  requestAnimationFrame(()=>{
    el.querySelectorAll('.lab-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        loop.running=false; setTimeout(()=>{loop.running=true;},50);
        el.querySelectorAll('.lab-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); activeTab=btn.dataset.tab; renderTab();
      });
    });
    renderTab();
  });

  function renderTab(){
    const c=el.querySelector('#stats-content');
    c.innerHTML=''; loop.running=true;
    const map={dist:renderDist,bayes:renderBayes,corr:renderCorr,entropy:renderEntropy,mle:renderMLE};
    map[activeTab]?.(c,loop);
    gsap.fromTo(c,{opacity:0,y:10},{opacity:1,y:0,duration:0.3});
  }
  return el;
}

/* ================================================================
   TAB 1: Probability Distributions
   ================================================================ */
function renderDist(container, loop) {
  const DISTS = {
    normal:   { label:'Normal (Gaussian)', params:{μ:{min:-3,max:3,step:0.1,val:0},σ:{min:0.1,max:3,step:0.1,val:1}}, pdf:(x,p)=>Math.exp(-0.5*((x-p.μ)/p.σ)**2)/(p.σ*Math.sqrt(2*Math.PI)), xRange:[-6,6], desc:'The bell curve. Arises naturally (Central Limit Theorem). Mean=μ, Variance=σ².', tex:'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
    uniform:  { label:'Uniform', params:{a:{min:-3,max:0,step:0.1,val:-1},b:{min:0,max:3,step:0.1,val:1}}, pdf:(x,p)=>x>=p.a&&x<=p.b?1/(p.b-p.a):0, xRange:[-4,4], desc:'Equal probability over an interval. Max entropy for bounded distributions.', tex:'f(x)=\\frac{1}{b-a}\\;\\text{for }x\\in[a,b]' },
    exponential:{label:'Exponential', params:{λ:{min:0.2,max:3,step:0.1,val:1}}, pdf:(x,p)=>x>=0?p.λ*Math.exp(-p.λ*x):0, xRange:[0,8], desc:'Time between events in a Poisson process. Memoryless property.', tex:'f(x)=\\lambda e^{-\\lambda x},\\; x\\geq 0' },
    laplace:  { label:'Laplace', params:{μ:{min:-3,max:3,step:0.1,val:0},b:{min:0.1,max:3,step:0.1,val:1}}, pdf:(x,p)=>Math.exp(-Math.abs(x-p.μ)/p.b)/(2*p.b), xRange:[-8,8], desc:'Like Gaussian but with heavier tails. MAP estimation with Laplace prior = Lasso.', tex:'f(x)=\\frac{1}{2b}e^{-|x-\\mu|/b}' },
    beta:     { label:'Beta', params:{α:{min:0.2,max:8,step:0.2,val:2},β:{min:0.2,max:8,step:0.2,val:5}}, pdf:(x,p)=>x>0&&x<1?Math.pow(x,p.α-1)*Math.pow(1-x,p.β-1)/betaFn(p.α,p.β):0, xRange:[0,1], desc:'Distribution over [0,1]. Natural prior for probabilities. Used in Bayesian inference.', tex:'f(x)=\\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)}' },
  };
  let distKey='normal';
  let params={μ:0,σ:1};
  let showCDF=false;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header">
          <span class="card-title">Probability Distribution</span>
          <div class="flex gap-sm">
            <select id="dist-sel" style="background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:4px;padding:4px 10px;font-size:0.78rem">
              ${Object.entries(DISTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
            </select>
            <label class="flex gap-sm" style="font-size:0.8rem;align-items:center;cursor:pointer">
              <input type="checkbox" id="cdf-toggle" style="accent-color:var(--accent-violet)"> CDF
            </label>
          </div>
        </div>
        <canvas id="dist-canvas" class="plot-canvas" height="340" style="height:340px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Parameters</span></div>
        <div id="dist-params"></div>
        <div class="stat-chips" id="dist-stats"></div>
        <div class="formula-box" id="dist-formula"></div>
        <div class="info-callout" id="dist-desc"></div>
      </div>
    </div>
  `;

  container.querySelector('#cdf-toggle').addEventListener('change',e=>{showCDF=e.target.checked;});
  container.querySelector('#dist-sel').addEventListener('change',e=>{
    distKey=e.target.value;
    params={};
    Object.entries(DISTS[distKey].params).forEach(([k,v])=>{params[k]=v.val;});
    buildParamSliders();updateDistStats();
  });

  function buildParamSliders(){
    const d=DISTS[distKey];
    const area=container.querySelector('#dist-params');
    area.innerHTML='';
    Object.entries(d.params).forEach(([k,cfg])=>{
      params[k]=params[k]??cfg.val;
      const w=document.createElement('div'); w.className='slider-wrap'; w.style.marginBottom='10px';
      w.innerHTML=`<div class="slider-label">${k} <span id="dp-${k}">${params[k].toFixed(2)}</span></div><input type="range" id="dsl-${k}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${params[k]}">`;
      const sl=w.querySelector(`#dsl-${k}`);
      sl.addEventListener('input',e=>{params[k]=parseFloat(e.target.value);w.querySelector(`#dp-${k}`).textContent=params[k].toFixed(2);updateSliderTrack(sl);updateDistStats();});
      updateSliderTrack(sl);
      area.appendChild(w);
    });
    try{katex.render(DISTS[distKey].tex,container.querySelector('#dist-formula'),{throwOnError:false,displayMode:true});}catch{}
    container.querySelector('#dist-desc').textContent=DISTS[distKey].desc;
  }

  function updateDistStats(){
    const d=DISTS[distKey];
    const xs=Array.from({length:200},(_,i)=>d.xRange[0]+i*(d.xRange[1]-d.xRange[0])/200);
    const ys=xs.map(x=>d.pdf(x,params));
    const dx=(d.xRange[1]-d.xRange[0])/200;
    const mean=xs.reduce((s,x,i)=>s+x*ys[i]*dx,0);
    const variance=xs.reduce((s,x,i)=>s+(x-mean)**2*ys[i]*dx,0);
    container.querySelector('#dist-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${isFinite(mean)?mean.toFixed(3):'—'}</span><span class="chip-label">Mean</span></div>
      <div class="stat-chip"><span class="chip-val">${isFinite(variance)?variance.toFixed(3):'—'}</span><span class="chip-label">Variance</span></div>
      <div class="stat-chip"><span class="chip-val">${isFinite(variance)?Math.sqrt(variance).toFixed(3):'—'}</span><span class="chip-label">Std Dev</span></div>
    `;
  }

  buildParamSliders(); updateDistStats();
  // Init params
  Object.entries(DISTS[distKey].params).forEach(([k,v])=>{params[k]=v.val;});

  const canvas=container.querySelector('#dist-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    const d=DISTS[distKey];
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=340;
    ctx.clearRect(0,0,W,H);
    const pad={l:50,r:20,t:20,b:40};
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const xr=d.xRange;

    const N=300;
    const xs=Array.from({length:N},(_,i)=>xr[0]+i*(xr[1]-xr[0])/(N-1));
    const ys=xs.map(x=>d.pdf(x,params));
    const maxY=Math.max(...ys,0.001);

    function toS(x,y){return{x:pad.l+(x-xr[0])/(xr[1]-xr[0])*cW, y:pad.t+cH-y/maxY*cH};}

    // Grid
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const y=pad.t+i*cH/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();}
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1.5;
    const ax=toS(0,0);
    ctx.beginPath();ctx.moveTo(pad.l,H-pad.b);ctx.lineTo(W-pad.r,H-pad.b);ctx.stroke();
    if(xr[0]<0&&xr[1]>0){ctx.beginPath();ctx.moveTo(ax.x,pad.t);ctx.lineTo(ax.x,H-pad.b);ctx.stroke();}

    // Filled area
    const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    grad.addColorStop(0,'rgba(124,58,237,0.5)'); grad.addColorStop(1,'rgba(124,58,237,0.02)');
    ctx.fillStyle=grad; ctx.beginPath();
    const s0=toS(xs[0],0); ctx.moveTo(s0.x,s0.y);
    xs.forEach((x,i)=>{const s=toS(x,ys[i]);ctx.lineTo(s.x,s.y);});
    const sLast=toS(xs[xs.length-1],0); ctx.lineTo(sLast.x,sLast.y); ctx.closePath(); ctx.fill();

    // PDF line
    ctx.strokeStyle='#7c3aed';ctx.lineWidth=2.5;ctx.beginPath();
    xs.forEach((x,i)=>{const s=toS(x,ys[i]);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);});
    ctx.stroke();

    // CDF
    if(showCDF){
      const dx=(xr[1]-xr[0])/(N-1);
      let cumul=0; const cdfs=ys.map(y=>{cumul+=y*dx;return cumul;});
      const maxCdf=Math.max(...cdfs,0.01);
      ctx.strokeStyle='#06b6d4';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();
      xs.forEach((x,i)=>{const s=toS(x,cdfs[i]/maxCdf*maxY);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);});
      ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#06b6d4';ctx.font='10px Inter';ctx.fillText('CDF',W-pad.r-40,pad.t+15);
    }

    // X axis labels
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='10px Inter';ctx.textAlign='center';
    for(let x=Math.ceil(xr[0]);x<=xr[1];x+=Math.ceil((xr[1]-xr[0])/6)){
      const s=toS(x,0);
      ctx.fillText(x.toFixed(1),s.x,H-pad.b+14);
    }
    // Y axis
    [0,0.5,1].forEach(f=>{
      const yv=f*maxY;
      const sy=pad.t+cH-f*cH;
      ctx.textAlign='right';ctx.fillText(yv.toFixed(2),pad.l-5,sy+4);
      ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,sy);ctx.lineTo(W-pad.r,sy);ctx.stroke();
    });
    ctx.textAlign='left';

    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 2: Bayes Theorem
   ================================================================ */
function renderBayes(container, loop) {
  let prior=0.01, sensitivity=0.95, specificity=0.95;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Medical Test Scenario</span></div>
        <canvas id="bayes-canvas" class="plot-canvas" height="400" style="height:400px"></canvas>
      </div>
      <div class="card" style="width:300px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Parameters</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Prior (disease prevalence) <span id="prior-disp">1.0%</span></div>
          <input type="range" id="prior-sl" min="0.001" max="0.5" step="0.001" value="0.01">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Sensitivity (true positive rate) <span id="sens-disp">95.0%</span></div>
          <input type="range" id="sens-sl" min="0.1" max="1" step="0.01" value="0.95">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Specificity (true negative rate) <span id="spec-disp">95.0%</span></div>
          <input type="range" id="spec-sl" min="0.1" max="1" step="0.01" value="0.95">
        </div>
        <div class="stat-chips" id="bayes-stats"></div>
        <div class="formula-box" id="bayes-formula"></div>
        <div class="info-callout">
          <strong>Base rate fallacy:</strong> With 1% prevalence and 95% accurate test, a positive result only means ~16% chance of disease! This is why mass screening is carefully designed.
        </div>
      </div>
    </div>
  `;

  function update(){
    const fp=1-specificity, fn=1-sensitivity;
    const tp=prior*sensitivity, tnFn=prior*fn, fpFp=(1-prior)*fp, tnSpec=(1-prior)*specificity;
    const posterior=tp/(tp+fpFp+1e-10);
    container.querySelector('#bayes-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${(posterior*100).toFixed(1)}%</span><span class="chip-label">P(Disease | +)</span></div>
      <div class="stat-chip"><span class="chip-val">${(tp*100).toFixed(2)}%</span><span class="chip-label">True Positive</span></div>
      <div class="stat-chip"><span class="chip-val">${(fpFp*100).toFixed(2)}%</span><span class="chip-label">False Positive</span></div>
      <div class="stat-chip"><span class="chip-val">${(prior*100).toFixed(1)}%</span><span class="chip-label">Prevalence</span></div>
    `;
    const tex=`P(D|+)=\\frac{P(+|D)P(D)}{P(+|D)P(D)+P(+|\\neg D)P(\\neg D)}=${(posterior).toFixed(3)}`;
    try{katex.render(tex,container.querySelector('#bayes-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  [['prior-sl','prior-disp',v=>{prior=v;return`${(v*100).toFixed(1)}%`;}],
   ['sens-sl','sens-disp',v=>{sensitivity=v;return`${(v*100).toFixed(1)}%`;}],
   ['spec-sl','spec-disp',v=>{specificity=v;return`${(v*100).toFixed(1)}%`;}]
  ].forEach(([id,dispId,setter])=>{
    const sl=container.querySelector(`#${id}`),disp=container.querySelector(`#${dispId}`);
    sl.addEventListener('input',e=>{disp.textContent=setter(parseFloat(e.target.value));updateSliderTrack(sl);update();});
    updateSliderTrack(sl);
  });
  update();

  const canvas=container.querySelector('#bayes-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=400;
    ctx.clearRect(0,0,W,H);
    // Visualise population as 1000 dots
    const N=1000, cols=40, rows=25;
    const dotR=6, gapX=(W-cols*dotR*2)/cols, gapY=(H-rows*dotR*2-40)/rows;
    const diseasedN=Math.round(prior*N);
    const tpN=Math.round(diseasedN*sensitivity);
    const fpN=Math.round((N-diseasedN)*(1-specificity));
    let idx=0;
    for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){
      const x=dotR+col*(dotR*2+gapX);
      const y=30+dotR+row*(dotR*2+gapY);
      const isDiseased=idx<diseasedN;
      const isTP=idx<tpN;
      const isFP=!isDiseased&&(idx-diseasedN)<fpN;
      ctx.fillStyle=isDiseased?(isTP?'#ec4899':'rgba(236,72,153,0.2)'):isFP?'#fbbf24':'rgba(6,182,212,0.15)';
      ctx.beginPath();ctx.arc(x,y,dotR,0,Math.PI*2);ctx.fill();
      idx++;
    }}
    // Legend
    const leg=[['#ec4899','Has disease + tested +'],['rgba(236,72,153,0.4)','Has disease, tested −'],['#fbbf24','No disease, tested + (FP)'],['rgba(6,182,212,0.4)','No disease, tested −']];
    leg.forEach(([c,l],i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(14,10+i*22,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='11px Inter';ctx.fillText(l,26,14+i*22);});
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 3: Correlation — scatter plot with live ρ
   ================================================================ */
function renderCorr(container, loop) {
  let pts=[]; let noise=0.3; let slope=1.0;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Scatter Plot</span><span class="text-muted" style="font-size:0.78rem">Click to add points, right-click to remove</span></div>
        <canvas id="corr-canvas" class="plot-canvas" height="380" style="height:380px;cursor:crosshair"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Controls</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Noise level <span id="noise-disp">0.30</span></div>
          <input type="range" id="noise-sl" min="0" max="1" step="0.01" value="0.3">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Relationship slope <span id="slope-disp">1.00</span></div>
          <input type="range" id="slope-sl" min="-2" max="2" step="0.05" value="1">
        </div>
        <button class="btn btn-sm btn-primary" id="gen-corr">🎲 Generate data</button>
        <button class="btn btn-sm btn-secondary" id="clear-corr">Clear</button>
        <div class="stat-chips" id="corr-stats"></div>
        <div class="formula-box" id="corr-formula"></div>
        <div class="info-callout">
          <strong>Correlation ≠ Causation.</strong> ρ=0.9 doesn't mean x causes y. It just means they move together linearly. Always check for confounders.
        </div>
      </div>
    </div>
  `;

  function genData(){
    pts=Array.from({length:50},()=>{const x=Math.random();return{x,y:slope*x+noise*(Math.random()-0.5)};});
    updateCorr();
  }

  function updateCorr(){
    if(pts.length<2)return;
    const mx=pts.reduce((s,p)=>s+p.x,0)/pts.length;
    const my=pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const num=pts.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0);
    const dX=Math.sqrt(pts.reduce((s,p)=>s+(p.x-mx)**2,0));
    const dY=Math.sqrt(pts.reduce((s,p)=>s+(p.y-my)**2,0));
    const r=num/(dX*dY+1e-10);
    const cov=num/pts.length;
    container.querySelector('#corr-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val" style="color:${r>0?'#10b981':'#ec4899'}">${r.toFixed(3)}</span><span class="chip-label">Pearson r</span></div>
      <div class="stat-chip"><span class="chip-val">${cov.toFixed(4)}</span><span class="chip-label">Cov(X,Y)</span></div>
      <div class="stat-chip"><span class="chip-val">${pts.length}</span><span class="chip-label">Points</span></div>
    `;
    const tex=`r=\\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2}\\sqrt{\\sum(y_i-\\bar{y})^2}}=${r.toFixed(3)}`;
    try{katex.render(tex,container.querySelector('#corr-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  const noiseSl=container.querySelector('#noise-sl'),slopeSl=container.querySelector('#slope-sl');
  noiseSl.addEventListener('input',e=>{noise=parseFloat(e.target.value);container.querySelector('#noise-disp').textContent=noise.toFixed(2);updateSliderTrack(noiseSl);});
  slopeSl.addEventListener('input',e=>{slope=parseFloat(e.target.value);container.querySelector('#slope-disp').textContent=slope.toFixed(2);updateSliderTrack(slopeSl);});
  [noiseSl,slopeSl].forEach(updateSliderTrack);
  container.querySelector('#gen-corr').addEventListener('click',genData);
  container.querySelector('#clear-corr').addEventListener('click',()=>{pts=[];updateCorr();});

  const canvas=container.querySelector('#corr-canvas');
  const ctx=canvas.getContext('2d');
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)/(canvas.width-60)+0.05,y:1-(e.clientY-r.top)/(canvas.height-60)-0.05};if(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1){pts.push({x:p.x-0.05,y:p.y-0.05});updateCorr();}});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)/(canvas.width-60)+0.05,y:1-(e.clientY-r.top)/(canvas.height-60)-0.05};if(!pts.length)return;const ni=pts.reduce((b,pt,i)=>{const d=Math.hypot(pt.x-p.x+0.05,pt.y-p.y+0.05);return d<b.d?{d,i}:b;},{d:Infinity,i:-1});if(ni.d<0.05){pts.splice(ni.i,1);updateCorr();}});

  genData();

  const pad=30;
  function toS(x,y,W,H){return{x:pad+x*(W-2*pad),y:H-pad-y*(H-2*pad)};}

  function draw(){
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=380;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const p=pad+i*(W-2*pad)/4,p2=pad+i*(H-2*pad)/4;ctx.beginPath();ctx.moveTo(p,pad);ctx.lineTo(p,H-pad);ctx.stroke();ctx.beginPath();ctx.moveTo(pad,p2);ctx.lineTo(W-pad,p2);ctx.stroke();}

    // Regression line
    if(pts.length>=2){
      const mx=pts.reduce((s,p)=>s+p.x,0)/pts.length, my=pts.reduce((s,p)=>s+p.y,0)/pts.length;
      const sl=pts.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/pts.reduce((s,p)=>s+(p.x-mx)**2,0);
      const ic=my-sl*mx;
      const s0=toS(0,ic,W,H), s1=toS(1,ic+sl,W,H);
      ctx.strokeStyle='rgba(253,231,37,0.5)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(s0.x,s0.y);ctx.lineTo(s1.x,s1.y);ctx.stroke();ctx.setLineDash([]);
    }
    pts.forEach(p=>{const s=toS(p.x,p.y,W,H);ctx.fillStyle='#7c3aed8a';ctx.strokeStyle='#7c3aed';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();});
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 4: Entropy & Cross-Entropy
   ================================================================ */
function renderEntropy(container, loop) {
  let p=0.5;
  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Shannon Entropy & Cross-Entropy</span></div>
        <canvas id="entropy-canvas" class="plot-canvas" height="360" style="height:360px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Distribution P</span></div>
        <div class="slider-wrap">
          <div class="slider-label">P(heads) = p <span id="ent-p-disp">0.50</span></div>
          <input type="range" id="ent-p-sl" min="0.001" max="0.999" step="0.001" value="0.5">
        </div>
        <div class="stat-chips" id="ent-stats"></div>
        <div class="formula-box" id="ent-formula"></div>
        <div class="formula-box" id="ce-formula"></div>
        <div class="info-callout">
          <strong>ML connection:</strong> Cross-entropy loss = -Σ y·log(ŷ). It measures how "surprised" a wrong prediction makes us. Maximising likelihood = minimising cross-entropy.
        </div>
      </div>
    </div>
  `;

  const pSl=container.querySelector('#ent-p-sl');
  pSl.addEventListener('input',e=>{p=parseFloat(e.target.value);container.querySelector('#ent-p-disp').textContent=p.toFixed(3);updateSliderTrack(pSl);updateEntropyStats();});
  updateSliderTrack(pSl);

  function h(p){return p===0||p===1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p+1e-10);}

  function updateEntropyStats(){
    const entropy=h(p);
    const q=0.5; // uniform
    const ce=-p*Math.log2(q)-(1-p)*Math.log2(q);
    const kl=p>0&&p<1?p*Math.log2(p/q)+(1-p)*Math.log2((1-p)/q):0;
    container.querySelector('#ent-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${entropy.toFixed(4)}</span><span class="chip-label">H(P) bits</span></div>
      <div class="stat-chip"><span class="chip-val">${ce.toFixed(4)}</span><span class="chip-label">H(P,Q)</span></div>
      <div class="stat-chip"><span class="chip-val">${kl.toFixed(4)}</span><span class="chip-label">KL(P||Q)</span></div>
    `;
    try{katex.render('H(P)=-\\sum_i p_i\\log_2 p_i',container.querySelector('#ent-formula'),{throwOnError:false,displayMode:true});}catch{}
    try{katex.render('H(P,Q)=-\\sum_i p_i\\log_2 q_i = H(P)+D_{KL}(P\\|Q)',container.querySelector('#ce-formula'),{throwOnError:false,displayMode:true});}catch{}
  }
  updateEntropyStats();

  const canvas=container.querySelector('#entropy-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=360;
    ctx.clearRect(0,0,W,H);
    const pad={l:50,r:20,t:20,b:40},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const N=300, xs=Array.from({length:N},(_,i)=>0.001+i*0.998/(N-1));
    const hs=xs.map(x=>h(x));
    const maxH=1.0;
    function toS(x,y){return{x:pad.l+x*cW,y:pad.t+cH-(Math.min(y,1)/maxH)*cH};}

    // Axes
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,H-pad.b);ctx.lineTo(W-pad.r,H-pad.b);ctx.stroke();

    // Fill
    const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    grad.addColorStop(0,'rgba(6,182,212,0.4)');grad.addColorStop(1,'rgba(6,182,212,0.02)');
    ctx.fillStyle=grad;ctx.beginPath();
    xs.forEach((x,i)=>{const s=toS(x,hs[i]);i===0?ctx.moveTo(s.x,H-pad.b):ctx.lineTo(s.x,s.y);});
    ctx.lineTo(pad.l+cW,H-pad.b);ctx.closePath();ctx.fill();

    // Entropy curve
    ctx.strokeStyle='#06b6d4';ctx.lineWidth=2.5;ctx.beginPath();
    xs.forEach((x,i)=>{const s=toS(x,hs[i]);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);});
    ctx.stroke();

    // Current p marker
    const cp=toS(p,h(p));
    ctx.fillStyle='#fbbf24';ctx.strokeStyle='white';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cp.x,cp.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(251,191,36,0.4)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(cp.x,H-pad.b);ctx.lineTo(cp.x,cp.y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(251,191,36,0.9)';ctx.font='11px Inter';ctx.fillText(`H=${h(p).toFixed(3)}`,cp.x+8,cp.y-6);

    // Labels
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='11px Inter';ctx.textAlign='center';
    ctx.fillText('p',pad.l+cW/2,H-pad.b+18);
    ctx.save();ctx.translate(14,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.fillText('H(p) bits',0,0);ctx.restore();
    [0,0.5,1].forEach(v=>{ctx.textAlign='center';ctx.fillText(v,pad.l+v*cW,H-pad.b+14);});
    [0,0.5,1].forEach(v=>{ctx.textAlign='right';ctx.fillText(v.toFixed(1),pad.l-4,pad.t+cH-(v/maxH)*cH+4);});
    ctx.textAlign='left';
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================================
   TAB 5: MLE — Maximum Likelihood Estimation
   ================================================================ */
function renderMLE(container, loop) {
  let samples=genNormalSamples(0.5,0.8,30);
  let μHat=0, σHat=1;

  container.innerHTML=`
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header"><span class="card-title">Maximum Likelihood — Gaussian</span><button class="btn btn-sm btn-secondary" id="mle-gen">🎲 New samples</button></div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:6px">Drag the sliders to fit a Gaussian to the data. The log-likelihood bar shows how well your parameters explain the observed data.</p>
        <canvas id="mle-canvas" class="plot-canvas" height="360" style="height:360px"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Fit Gaussian</span></div>
        <div class="slider-wrap">
          <div class="slider-label">μ (mean) <span id="mle-mu-disp">0.00</span></div>
          <input type="range" id="mle-mu-sl" min="-2" max="3" step="0.01" value="0">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">σ (std dev) <span id="mle-sigma-disp">1.00</span></div>
          <input type="range" id="mle-sigma-sl" min="0.1" max="2" step="0.01" value="1">
        </div>
        <button class="btn btn-primary btn-sm" id="mle-fit">⚡ MLE Estimate</button>
        <div class="stat-chips" id="mle-stats"></div>
        <div class="formula-box" id="mle-formula"></div>
        <div class="info-callout">
          <strong>MLE solution:</strong> μ̂ = sample mean. σ̂ = sample std dev. These are the parameters that maximise the probability of observing the data.
        </div>
      </div>
    </div>
  `;

  function logLikelihood(mu, sigma){
    return samples.reduce((s,x)=>s-0.5*((x-mu)/sigma)**2-Math.log(sigma*Math.sqrt(2*Math.PI)),0);
  }
  function updateStats(){
    const ll=logLikelihood(μHat,σHat);
    const mleMu=samples.reduce((s,x)=>s+x,0)/samples.length;
    const mleSig=Math.sqrt(samples.reduce((s,x)=>s+(x-mleMu)**2,0)/samples.length);
    const maxLL=logLikelihood(mleMu,mleSig);
    container.querySelector('#mle-stats').innerHTML=`
      <div class="stat-chip"><span class="chip-val">${ll.toFixed(2)}</span><span class="chip-label">Log-Likelihood</span></div>
      <div class="stat-chip"><span class="chip-val">${maxLL.toFixed(2)}</span><span class="chip-label">Max LL</span></div>
      <div class="stat-chip"><span class="chip-val">${samples.length}</span><span class="chip-label">N samples</span></div>
    `;
    try{katex.render('\\hat{\\mu}=\\bar{x},\\quad\\hat{\\sigma}^2=\\tfrac{1}{N}\\sum(x_i-\\bar{x})^2',container.querySelector('#mle-formula'),{throwOnError:false,displayMode:true});}catch{}
  }

  const muSl=container.querySelector('#mle-mu-sl'), sigSl=container.querySelector('#mle-sigma-sl');
  muSl.addEventListener('input',e=>{μHat=parseFloat(e.target.value);container.querySelector('#mle-mu-disp').textContent=μHat.toFixed(2);updateSliderTrack(muSl);updateStats();});
  sigSl.addEventListener('input',e=>{σHat=parseFloat(e.target.value);container.querySelector('#mle-sigma-disp').textContent=σHat.toFixed(2);updateSliderTrack(sigSl);updateStats();});
  [muSl,sigSl].forEach(updateSliderTrack);

  container.querySelector('#mle-fit').addEventListener('click',()=>{
    const mu=samples.reduce((s,x)=>s+x,0)/samples.length;
    const sig=Math.sqrt(samples.reduce((s,x)=>s+(x-mu)**2,0)/samples.length);
    μHat=mu; σHat=sig;
    muSl.value=mu; sigSl.value=sig;
    container.querySelector('#mle-mu-disp').textContent=mu.toFixed(3);
    container.querySelector('#mle-sigma-disp').textContent=sig.toFixed(3);
    updateSliderTrack(muSl);updateSliderTrack(sigSl);updateStats();
    gsap.fromTo(container.querySelector('#mle-canvas'),{filter:'brightness(1.5)'},{filter:'brightness(1)',duration:0.6});
  });
  container.querySelector('#mle-gen').addEventListener('click',()=>{
    const mu=(Math.random()-0.5)*2,sig=0.3+Math.random()*0.8;
    samples=genNormalSamples(mu,sig,30);updateStats();
  });
  updateStats();

  const canvas=container.querySelector('#mle-canvas');
  const ctx=canvas.getContext('2d');

  function draw(){
    if(!loop.running)return;
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=360;
    ctx.clearRect(0,0,W,H);
    const pad={l:50,r:20,t:20,b:40},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
    const xr=[-3,4];
    function toS(x,y){return{x:pad.l+(x-xr[0])/(xr[1]-xr[0])*cW,y:pad.t+cH-(y/0.8)*cH};}

    // Histogram
    const binN=15,binW=(xr[1]-xr[0])/binN;
    const bins=new Array(binN).fill(0);
    samples.forEach(x=>{const bi=Math.floor((x-xr[0])/binW);if(bi>=0&&bi<binN)bins[bi]++;});
    const maxBin=Math.max(...bins,1);
    bins.forEach((cnt,i)=>{
      const bx=xr[0]+i*binW, bxEnd=bx+binW;
      const sh=cnt/maxBin*0.7;
      const sl=toS(bx,sh),sl2=toS(bxEnd,0);
      ctx.fillStyle='rgba(6,182,212,0.25)';ctx.strokeStyle='rgba(6,182,212,0.6)';ctx.lineWidth=1;
      ctx.fillRect(sl.x,sl.y,sl2.x-sl.x,H-pad.b-sl.y);
      ctx.strokeRect(sl.x,sl.y,sl2.x-sl.x,H-pad.b-sl.y);
    });

    // Fitted Gaussian
    const N=200;
    ctx.strokeStyle='#7c3aed';ctx.lineWidth=2.5;ctx.beginPath();
    for(let i=0;i<=N;i++){
      const x=xr[0]+i*(xr[1]-xr[0])/N;
      const y=Math.exp(-0.5*((x-μHat)/σHat)**2)/(σHat*Math.sqrt(2*Math.PI))*0.8/maxBin*samples.length*binW*0.7;
      const s=toS(x,y);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);
    }
    ctx.stroke();

    // Sample ticks
    samples.forEach(x=>{const s=toS(x,0);ctx.fillStyle='rgba(6,182,212,0.7)';ctx.fillRect(s.x-1.5,H-pad.b-10,3,10);});

    // Mean lines
    const smean=toS(μHat,0);
    ctx.strokeStyle='rgba(251,191,36,0.7)';ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(smean.x,pad.t);ctx.lineTo(smean.x,H-pad.b);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(251,191,36,0.8)';ctx.font='11px Inter';ctx.fillText(`μ=${μHat.toFixed(2)}`,smean.x+4,pad.t+16);

    // Axis
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,H-pad.b);ctx.lineTo(W-pad.r,H-pad.b);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='10px Inter';ctx.textAlign='center';
    for(let x=Math.ceil(xr[0]);x<=xr[1];x++){const s=toS(x,0);ctx.fillText(x,s.x,H-pad.b+14);}
    ctx.textAlign='left';

    requestAnimationFrame(draw);
  }
  draw();
}

// ---- Helpers ----
function betaFn(a,b){let v=1;for(let i=0;i<100;i++)v*=(i+a)*(i+b)/((i+a+b)*(i+1));return v/(a*b);}
function genNormalSamples(mu,sigma,n){return Array.from({length:n},()=>{let u=0,v=0;while(!u)u=Math.random();v=Math.random();return mu+sigma*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);});}
function updateSliderTrack(sl){if(!sl)return;const mn=parseFloat(sl.min),mx=parseFloat(sl.max),v=parseFloat(sl.value);sl.style.setProperty('--pct',`${((v-mn)/(mx-mn))*100}%`);}
