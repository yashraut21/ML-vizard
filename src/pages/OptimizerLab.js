import katex from 'katex';
import { gsap } from 'gsap';

/* ============================================================
   Optimizer Race Lab — All optimisers racing on a loss surface
   ============================================================ */

export function OptimizerLab() {
  const loop = { running: true };
  const el = document.createElement('div');
  el.className = 'page lab-page';
  el.innerHTML = `
    <div class="lab-header">
      <div>
        <h1 class="lab-title">⚡ Optimizer <span style="color:var(--accent-cyan)">Race</span></h1>
        <p class="lab-desc">Watch SGD, Momentum, AdaGrad, RMSProp, and Adam race to the minimum on the same loss surface simultaneously.</p>
      </div>
    </div>
    <div class="plot-row">
      <div class="card" style="flex:1">
        <div class="card-header">
          <span class="card-title">Loss Landscape</span>
          <div class="flex gap-sm">
            <select id="surface-sel" style="background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);border-radius:4px;padding:4px 10px;font-size:0.78rem">
              <option value="bowl">Symmetric Bowl (x²+y²)</option>
              <option value="ellipse">Elongated Ellipse (0.5x²+5y²)</option>
              <option value="saddle">Saddle Point (x²-y²)</option>
              <option value="rosenbrock">Rosenbrock (banana)</option>
              <option value="beale">Beale-like (ravine)</option>
            </select>
            <button class="btn btn-sm btn-secondary" id="opt-reset">↺ Reset</button>
            <button class="btn btn-sm btn-primary" id="opt-toggle">▶ Race!</button>
          </div>
        </div>
        <p class="text-muted" style="font-size:0.78rem;margin-bottom:6px">Click to set a shared starting point for all optimisers.</p>
        <canvas id="opt-canvas" class="plot-canvas" height="500" style="height:500px;cursor:crosshair"></canvas>
      </div>
      <div class="card" style="width:280px;display:flex;flex-direction:column;gap:var(--gap-md)">
        <div class="card-header"><span class="card-title">Hyperparameters</span></div>
        <div class="slider-wrap">
          <div class="slider-label">Base LR η <span id="opt-lr-disp">0.05</span></div>
          <input type="range" id="opt-lr" min="0.001" max="0.5" step="0.001" value="0.05">
        </div>
        <div class="slider-wrap">
          <div class="slider-label">Momentum β <span id="opt-mom-disp">0.90</span></div>
          <input type="range" id="opt-mom" min="0.0" max="0.99" step="0.01" value="0.9">
        </div>

        <div class="card-header" style="margin-top:4px"><span class="card-title">Leaderboard</span></div>
        <div id="opt-leaderboard"></div>

        <div class="card-header" style="margin-top:4px"><span class="card-title">Loss Curves</span></div>
        <canvas id="opt-loss-canvas" style="width:100%;height:160px;border-radius:6px;background:var(--bg-elevated)"></canvas>

        <div class="info-callout">
          <strong>Tips:</strong> Elongated Ellipse shows why Adam is better than plain SGD — SGD zigzags, Adam adapts per-parameter. Try Rosenbrock for the hardest test.
        </div>
      </div>
    </div>
    <!-- Formula row -->
    <div class="plot-row" style="margin-top:var(--gap-md)">
      ${[
        {name:'SGD',color:'#ec4899',tex:'\\theta\\leftarrow\\theta-\\eta\\nabla L'},
        {name:'Momentum',color:'#f97316',tex:'v\\leftarrow\\beta v+(1-\\beta)\\nabla L;\\;\\theta\\leftarrow\\theta-\\eta v'},
        {name:'AdaGrad',color:'#fbbf24',tex:'G\\leftarrow G+g^2;\\;\\theta\\leftarrow\\theta-\\tfrac{\\eta}{\\sqrt{G+\\epsilon}}g'},
        {name:'RMSProp',color:'#10b981',tex:'G\\leftarrow\\beta G+(1-\\beta)g^2;\\;\\theta\\leftarrow\\theta-\\tfrac{\\eta}{\\sqrt{G+\\epsilon}}g'},
        {name:'Adam',color:'#7c3aed',tex:'m\\leftarrow\\beta_1 m+(1-\\beta_1)g;\\;v\\leftarrow\\beta_2 v+(1-\\beta_2)g^2'},
      ].map(o=>`<div class="card" style="padding:12px">
        <div style="color:${o.color};font-weight:700;font-size:0.85rem;margin-bottom:6px">${o.name}</div>
        <div id="opt-formula-${o.name.toLowerCase()}"></div>
      </div>`).join('')}
    </div>
  `;

  // Render formulae
  const fmap={sgd:'\\theta\\leftarrow\\theta-\\eta\\nabla L',momentum:'v\\leftarrow\\beta v+(1-\\beta)\\nabla L,\\quad\\theta\\leftarrow\\theta-\\eta v',adagrad:'G\\leftarrow G+g^2,\\quad\\theta\\leftarrow\\theta-\\dfrac{\\eta}{\\sqrt{G+\\epsilon}}g',rmsprop:'G\\leftarrow\\beta G+(1-\\beta)g^2,\\quad\\theta\\leftarrow\\theta-\\dfrac{\\eta}{\\sqrt{G+\\epsilon}}g',adam:'\\hat{m}=\\tfrac{m}{1-\\beta_1^t},\\;\\hat{v}=\\tfrac{v}{1-\\beta_2^t},\\;\\theta\\leftarrow\\theta-\\tfrac{\\eta\\hat{m}}{\\sqrt{\\hat{v}}+\\epsilon}'};
  Object.entries(fmap).forEach(([k,tex])=>{
    const fEl=el.querySelector(`#opt-formula-${k}`);
    if(fEl)try{katex.render(tex,fEl,{throwOnError:false,displayMode:true});}catch{}
  });

  requestAnimationFrame(()=>{setup(el,loop);});
  return el;
}

const OPT_COLORS={sgd:'#ec4899',momentum:'#f97316',adagrad:'#fbbf24',rmsprop:'#10b981',adam:'#7c3aed'};
const OPT_NAMES=Object.keys(OPT_COLORS);

const SURFACES = {
  bowl:       {f:(x,y)=>x*x+y*y,                       grad:(x,y)=>[2*x,2*y],              start:[1.8,1.6],  range:[-2.5,2.5]},
  ellipse:    {f:(x,y)=>0.5*x*x+5*y*y,                 grad:(x,y)=>[x,10*y],                start:[2.0,0.8],  range:[-2.5,2.5]},
  saddle:     {f:(x,y)=>x*x-y*y,                        grad:(x,y)=>[2*x,-2*y],              start:[0.5,0.3],  range:[-2,2]},
  rosenbrock: {f:(x,y)=>(1-x)**2+100*(y-x*x)**2,       grad:(x,y)=>[-2*(1-x)-400*x*(y-x*x),200*(y-x*x)],   start:[-1.2,1.0], range:[-2.2,2.2]},
  beale:      {f:(x,y)=>(1.5-x+x*y)**2+(2.25-x+x*y*y)**2+(2.625-x+x*y*y*y)**2, grad:(x,y)=>{const a=1.5-x+x*y,b=2.25-x+x*y*y,c=2.625-x+x*y*y*y;return[2*a*(y-1)+2*b*(y*y-1)+2*c*(y*y*y-1),2*a*x+2*b*2*x*y+2*c*3*x*y*y];}, start:[0.5,2.0], range:[-3,3]},
};

function setup(container, loop) {
  let surfKey='ellipse', lr=0.05, beta=0.9, running=false;
  const surf=()=>SURFACES[surfKey];

  // Optimizer states
  function resetStates(startX,startY){
    return {
      sgd:      {pos:[startX,startY],history:[[startX,startY]]},
      momentum: {pos:[startX,startY],v:[0,0],history:[[startX,startY]]},
      adagrad:  {pos:[startX,startY],G:[0,0],t:1,history:[[startX,startY]]},
      rmsprop:  {pos:[startX,startY],G:[0,0],t:1,history:[[startX,startY]]},
      adam:     {pos:[startX,startY],m:[0,0],v:[0,0],t:1,history:[[startX,startY]]},
    };
  }
  let s=surf(); let states=resetStates(...s.start);
  let lossHistories={sgd:[],momentum:[],adagrad:[],rmsprop:[],adam:[]};
  let done=false;

  const canvas=container.querySelector('#opt-canvas');
  const ctx=canvas.getContext('2d');

  container.querySelector('#surface-sel').addEventListener('change',e=>{surfKey=e.target.value;reset();});
  container.querySelector('#opt-reset').addEventListener('click',reset);
  container.querySelector('#opt-toggle').addEventListener('click',()=>{
    running=!running;
    container.querySelector('#opt-toggle').textContent=running?'⏸ Pause':'▶ Race!';
  });
  const lrSl=container.querySelector('#opt-lr');
  lrSl.addEventListener('input',e=>{lr=parseFloat(e.target.value);container.querySelector('#opt-lr-disp').textContent=lr.toFixed(3);updateSliderTrack(lrSl);});
  updateSliderTrack(lrSl);
  const momSl=container.querySelector('#opt-mom');
  momSl.addEventListener('input',e=>{beta=parseFloat(e.target.value);container.querySelector('#opt-mom-disp').textContent=beta.toFixed(2);updateSliderTrack(momSl);});
  updateSliderTrack(momSl);

  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    const S=surf(); const rng=S.range;
    const W=canvas.width,H=canvas.height;
    const wx=rng[0]+(e.clientX-r.left)/W*(rng[1]-rng[0]);
    const wy=rng[1]-(e.clientY-r.top)/H*(rng[1]-rng[0]);
    states=resetStates(wx,wy);
    lossHistories={sgd:[],momentum:[],adagrad:[],rmsprop:[],adam:[]};
    done=false; running=true;
    container.querySelector('#opt-toggle').textContent='⏸ Pause';
  });

  function reset(){
    const S=SURFACES[surfKey];
    states=resetStates(...S.start);
    lossHistories={sgd:[],momentum:[],adagrad:[],rmsprop:[],adam:[]};
    done=false; running=false;
    container.querySelector('#opt-toggle').textContent='▶ Race!';
  }

  function step(){
    const fn=surf().f, gfn=surf().grad;
    const eps=1e-8, b2=0.999;
    OPT_NAMES.forEach(name=>{
      const st=states[name];
      const [x,y]=st.pos;
      const cg = gfn(x,y);
      // Clip gradient
      const gm=Math.hypot(cg[0],cg[1]);
      const g=gm>5?[cg[0]/gm*5,cg[1]/gm*5]:cg;
      let nx,ny;
      if(name==='sgd'){
        nx=x-lr*g[0]; ny=y-lr*g[1];
      } else if(name==='momentum'){
        st.v[0]=beta*st.v[0]+(1-beta)*g[0];
        st.v[1]=beta*st.v[1]+(1-beta)*g[1];
        nx=x-lr*st.v[0]; ny=y-lr*st.v[1];
      } else if(name==='adagrad'){
        st.G[0]+=g[0]*g[0]; st.G[1]+=g[1]*g[1];
        nx=x-lr/Math.sqrt(st.G[0]+eps)*g[0];
        ny=y-lr/Math.sqrt(st.G[1]+eps)*g[1];
      } else if(name==='rmsprop'){
        st.G[0]=beta*st.G[0]+(1-beta)*g[0]*g[0];
        st.G[1]=beta*st.G[1]+(1-beta)*g[1]*g[1];
        nx=x-lr/Math.sqrt(st.G[0]+eps)*g[0];
        ny=y-lr/Math.sqrt(st.G[1]+eps)*g[1];
      } else { // adam
        const b1=0.9;
        st.m[0]=b1*st.m[0]+(1-b1)*g[0]; st.m[1]=b1*st.m[1]+(1-b1)*g[1];
        st.v[0]=b2*st.v[0]+(1-b2)*g[0]*g[0]; st.v[1]=b2*st.v[1]+(1-b2)*g[1]*g[1];
        const mh=[st.m[0]/(1-b1**st.t),st.m[1]/(1-b1**st.t)];
        const vh=[st.v[0]/(1-b2**st.t),st.v[1]/(1-b2**st.t)];
        nx=x-lr*mh[0]/(Math.sqrt(vh[0])+eps);
        ny=y-lr*mh[1]/(Math.sqrt(vh[1])+eps);
        st.t++;
      }
      const rng=surf().range;
      nx=Math.max(rng[0],Math.min(rng[1],nx));
      ny=Math.max(rng[0],Math.min(rng[1],ny));
      st.pos=[nx,ny];
      st.history.push([nx,ny]);
      lossHistories[name].push(fn(nx,ny));
    });
  }

  function drawScene(){
    if(!loop.running)return;
    if(running&&!done) for(let i=0;i<3;i++) step();

    const S=surf();
    let W=canvas.width=canvas.offsetWidth, H=canvas.height=500;
    const rng=S.range;
    function toS(wx,wy){return{x:(wx-rng[0])/(rng[1]-rng[0])*W, y:H-(wy-rng[0])/(rng[1]-rng[0])*H};}

    // Heatmap
    const res=5;
    for(let px=0;px<W;px+=res){for(let py=0;py<H;py+=res){
      const wx=rng[0]+(px/W)*(rng[1]-rng[0]);
      const wy=rng[1]-(py/H)*(rng[1]-rng[0]);
      const v=Math.min(S.f(wx,wy),30);
      const t=v/30;
      ctx.fillStyle=`hsl(${240-t*240},65%,${12+t*25}%)`;
      ctx.fillRect(px,py,res,res);
    }}

    // Contour lines (iso-level rings)
    [0.5,1,2,4,8,16].forEach(lvl=>{
      ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;
      for(let px=res;px<W-res;px+=res){for(let py=res;py<H-res;py+=res){
        const wx=rng[0]+(px/W)*(rng[1]-rng[0]),wy=rng[1]-(py/H)*(rng[1]-rng[0]);
        const v=S.f(wx,wy);
        if(Math.abs(v-lvl)<0.15){ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(px,py,res,res);}
      }}
    });

    // Optimiser paths
    OPT_NAMES.forEach(name=>{
      const h=states[name].history;
      if(h.length<2)return;
      ctx.strokeStyle=OPT_COLORS[name];ctx.lineWidth=2;ctx.beginPath();
      h.forEach((p,i)=>{const s=toS(p[0],p[1]);i===0?ctx.moveTo(s.x,s.y):ctx.lineTo(s.x,s.y);});
      ctx.stroke();
      // Current pos
      const last=h[h.length-1];const ls=toS(last[0],last[1]);
      ctx.fillStyle=OPT_COLORS[name];ctx.strokeStyle='white';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(ls.x,ls.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
      // Name label
      ctx.fillStyle=OPT_COLORS[name];ctx.font='bold 10px Inter';
      ctx.fillText(name.toUpperCase(),ls.x+10,ls.y);
    });

    // Leaderboard
    const lb=container.querySelector('#opt-leaderboard');
    const ranked=[...OPT_NAMES].sort((a,b)=>{
      const la=lossHistories[a], lb2=lossHistories[b];
      return (la[la.length-1]??Infinity)-(lb2[lb2.length-1]??Infinity);
    });
    lb.innerHTML=ranked.map((name,i)=>{
      const hist=lossHistories[name];
      const loss=hist[hist.length-1]??'—';
      const steps=states[name].history.length;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:0.9rem">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
        <span style="color:${OPT_COLORS[name]};font-weight:700;font-size:0.8rem;min-width:75px">${name.toUpperCase()}</span>
        <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted)">${typeof loss==='number'?loss.toFixed(4):'—'}</span>
        <span style="font-size:0.68rem;color:var(--text-muted)">(${steps} steps)</span>
      </div>`;
    }).join('');

    // Loss curves
    const lc=container.querySelector('#opt-loss-canvas');
    const lctx=lc.getContext('2d');
    lc.width=lc.offsetWidth||240;lc.height=160;
    const LW=lc.width,LH=lc.height;
    lctx.clearRect(0,0,LW,LH);
    const allLoss=Object.values(lossHistories).flat();
    const maxL=Math.max(...allLoss,0.01);
    OPT_NAMES.forEach(name=>{
      const h=lossHistories[name];
      if(h.length<2)return;
      lctx.strokeStyle=OPT_COLORS[name];lctx.lineWidth=1.5;lctx.beginPath();
      h.forEach((l,i)=>{
        const x=(i/h.length)*LW, y=LH-4-(Math.min(l,maxL)/maxL)*(LH-8);
        i===0?lctx.moveTo(x,y):lctx.lineTo(x,y);
      });
      lctx.stroke();
    });
    // Legend
    OPT_NAMES.forEach((name,i)=>{
      lctx.fillStyle=OPT_COLORS[name];lctx.fillRect(4,4+i*14,14,2);
      lctx.font='9px Inter';lctx.fillText(name,22,9+i*14);
    });

    requestAnimationFrame(drawScene);
  }
  drawScene();
}

function updateSliderTrack(sl){if(!sl)return;const mn=parseFloat(sl.min),mx=parseFloat(sl.max),v=parseFloat(sl.value);sl.style.setProperty('--pct',`${((v-mn)/(mx-mn))*100}%`);}
