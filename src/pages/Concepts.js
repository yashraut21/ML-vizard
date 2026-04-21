import { gsap } from 'gsap';
import katex from 'katex';

const CONCEPTS = [
  {
    id: 'transpose',
    tag: 'tag-blue', tagLabel: 'Linear Algebra',
    title: 'Transpose',
    desc: 'Reflect a matrix across its main diagonal. Rows become columns and vice versa. Critical for dot products, covariance matrices, and neural network weight updates.',
    formula: 'B_{ij} = A_{ji} \\quad \\Rightarrow \\quad B = A^T',
    draw: drawTransposeAnim,
    labLink: '#image-lab',
  },
  {
    id: 'multiply',
    tag: 'tag-violet', tagLabel: 'Linear Algebra',
    title: 'Matrix Multiplication',
    desc: 'C[i,j] is the dot product of row i of A and column j of B. This is the core operation in neural networks — every layer is a matrix multiply.',
    formula: 'C_{ij} = \\sum_k A_{ik} B_{kj}',
    draw: drawMultiplyAnim,
    labLink: '#image-lab',
  },
  {
    id: 'inverse',
    tag: 'tag-cyan', tagLabel: 'Linear Algebra',
    title: 'Matrix Inverse',
    desc: 'A⁻¹A = I. The inverse "undoes" a linear transformation. Only square, non-singular matrices have inverses. Used in solving linear systems Ax = b.',
    formula: 'A A^{-1} = I \\quad \\Leftrightarrow \\quad \\det(A) \\neq 0',
    draw: drawInverseAnim,
    labLink: '#image-lab',
  },
  {
    id: 'eigen',
    tag: 'tag-green', tagLabel: 'Advanced',
    title: 'Eigenvalues & Eigenvectors',
    desc: 'Vectors that only get scaled (not rotated) when multiplied by A. The scale factor is the eigenvalue λ. Foundation of PCA, graph algorithms, and stability analysis.',
    formula: 'A\\mathbf{v} = \\lambda\\mathbf{v}, \\quad \\lambda \\in \\mathbb{R}',
    draw: drawEigenAnim,
    labLink: '#image-lab',
  },
  {
    id: 'svd',
    tag: 'tag-pink', tagLabel: 'Advanced',
    title: 'SVD — Singular Value Decomposition',
    desc: 'Any matrix factors as A = UΣVᵀ. The singular values Σ capture the "energy" at each rank. Truncating to rank k gives the best low-rank approximation — the basis of image compression and recommender systems.',
    formula: 'A = U\\Sigma V^T, \\quad A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T',
    draw: drawSVDAnim,
    labLink: '#image-lab',
  },
  {
    id: 'convolution',
    tag: 'tag-blue', tagLabel: 'Signal Processing',
    title: 'Convolution',
    desc: 'Slide a small kernel over a signal or image. Each output is a weighted sum of nearby inputs. The backbone of CNNs — blurring, sharpening, and edge detection are all convolutions.',
    formula: '(f * g)[n] = \\sum_{k} f[k]\\, g[n-k]',
    draw: drawConvAnim,
    labLink: '#image-lab',
  },
  {
    id: 'fourier',
    tag: 'tag-violet', tagLabel: 'Signal Processing',
    title: 'Fourier Transform',
    desc: 'Decompose any signal into a sum of sinusoids. Each frequency bin X[k] tells you the amplitude and phase of that frequency in the original signal. Every audio codec and image JPEG uses this.',
    formula: 'X[k] = \\sum_{n=0}^{N-1} x[n]\\, e^{-2\\pi i kn/N}',
    draw: drawFourierAnim,
    labLink: '#audio-lab',
  },
  {
    id: 'dot',
    tag: 'tag-green', tagLabel: 'Fundamentals',
    title: 'Dot Product & Similarity',
    desc: 'a·b = |a||b|cos θ. If two vectors are similar, their dot product is large. This is why attention in transformers and cosine similarity in NLP both rely on it.',
    formula: '\\mathbf{a} \\cdot \\mathbf{b} = \\sum_i a_i b_i = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta',
    draw: drawDotAnim,
    labLink: null,
  },
];

export function Concepts() {
  const el = document.createElement('div');
  el.className = 'page';
  el.innerHTML = `
    <div style="padding:var(--gap-xl) var(--gap-xl) var(--gap-md);max-width:1400px;margin:0 auto">
      <h1 class="lab-title">📐 Concepts</h1>
      <p class="lab-desc" style="max-width:700px">Core linear algebra and signal processing concepts, each with an animated mini-demo. Click "Try in Lab" to experiment interactively.</p>
    </div>
    <div class="concepts-grid" id="concepts-grid"></div>
  `;

  requestAnimationFrame(() => {
    const grid = el.querySelector('#concepts-grid');
    CONCEPTS.forEach((concept, idx) => {
      const card = buildConceptCard(concept);
      grid.appendChild(card);
    });

    // Entrance stagger
    gsap.fromTo(grid.querySelectorAll('.concept-card'),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
    );
  });

  return el;
}

function buildConceptCard(concept) {
  const card = document.createElement('div');
  card.className = 'concept-card';
  card.id = `concept-${concept.id}`;

  const canvas = document.createElement('canvas');
  canvas.className = 'concept-card-canvas';
  canvas.width = 340; canvas.height = 180;
  card.appendChild(canvas);

  const body = document.createElement('div');
  body.className = 'concept-card-body';

  const tag = document.createElement('span');
  tag.className = `concept-card-tag ${concept.tag}`;
  tag.textContent = concept.tagLabel;

  const title = document.createElement('h3');
  title.className = 'concept-card-title';
  title.textContent = concept.title;

  const desc = document.createElement('p');
  desc.className = 'concept-card-desc';
  desc.textContent = concept.desc;

  const formulaBox = document.createElement('div');
  formulaBox.className = 'concept-formula';
  try { katex.render(concept.formula, formulaBox, { throwOnError: false, displayMode: false }); }
  catch { formulaBox.textContent = concept.formula; }

  const actions = document.createElement('div');
  actions.className = 'flex gap-sm';
  if (concept.labLink) {
    const link = document.createElement('a');
    link.href = concept.labLink;
    link.className = 'btn btn-sm btn-primary';
    link.innerHTML = `Try in Lab <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>`;
    link.addEventListener('click', e => {
      e.preventDefault();
      window.location.hash = concept.labLink.replace('#','');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    actions.appendChild(link);
  }
  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn btn-sm btn-secondary';
  replayBtn.textContent = '▶ Replay';
  actions.appendChild(replayBtn);

  body.appendChild(tag);
  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(formulaBox);
  body.appendChild(actions);
  card.appendChild(body);

  // Start animation
  let animTimer = null;
  function startAnim() {
    if (animTimer) cancelAnimationFrame(animTimer);
    concept.draw(canvas, animTimer => { /* store cancel */ });
  }
  replayBtn.addEventListener('click', startAnim);

  // IntersectionObserver: play when visible
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) startAnim();
  }, { threshold: 0.4 });
  obs.observe(card);

  return card;
}

// ---- Animation Functions ----

function drawTransposeAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cols = 4, rows = 3;
  const CELL = 36, pad = 10;
  const matW = cols * CELL, matH = rows * CELL;

  let t = 0;
  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    const phase = (Math.sin(t * 0.04) + 1) / 2; // 0 → 1 → 0

    const drawMatrix = (ox, oy, r, c, label, highlight) => {
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          const val = (i * c + j + 1);
          const isHL = highlight && i === highlight[0] && j === highlight[1];
          ctx.fillStyle = isHL ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)';
          roundRect(ctx, ox + j*CELL + 2, oy + i*CELL + 2, CELL-4, CELL-4, 4);
          ctx.fill();
          ctx.fillStyle = isHL ? '#c4b5fd' : 'rgba(6,182,212,0.8)';
          ctx.font = '11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(val, ox + j*CELL + CELL/2, oy + i*CELL + CELL/2 + 4);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, ox + (c*CELL)/2, oy - 6);
    };

    // Original A (3×4) on left
    const ax = 12, ay = (h - matH) / 2;
    const bx = w - 12 - rows*CELL, by = (h - cols*CELL) / 2;

    drawMatrix(ax, ay, rows, cols, 'A (3×4)', null);

    // Transposed Aᵀ (4×3) on right, morphed
    ctx.save();
    ctx.globalAlpha = phase > 0.05 ? 1 : phase * 20;
    drawMatrix(bx, by, cols, rows, 'Aᵀ (4×3)', null);
    ctx.restore();

    // Arrow
    ctx.fillStyle = 'rgba(252,231,37,0.7)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→', w/2, h/2 + 6);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('transpose', w/2, h/2 + 20);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawMultiplyAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const CELL = 28;
  let t = 0;

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const step = Math.floor(t / 30) % 9; // which cell of C we're computing
    const ri = Math.floor(step / 3), ci = step % 3;

    const A = [[1,2,0],[3,0,1],[0,2,4]];
    const B = [[2,0,1],[1,3,0],[0,1,2]];
    const C = A.map(row => [0,1,2].map(j => row.reduce((s,_,k)=>s+row[k]*B[k][j],0)));

    const drawMat = (ox, oy, mat, hlRow, hlCol, label, color) => {
      mat.forEach((row, i) => {
        row.forEach((v, j) => {
          const isHL = (hlRow !== null && i === hlRow) || (hlCol !== null && j === hlCol);
          ctx.fillStyle = isHL ? `rgba(${color},0.3)` : 'rgba(255,255,255,0.06)';
          roundRect(ctx, ox+j*CELL+1, oy+i*CELL+1, CELL-2, CELL-2, 3);
          ctx.fill();
          ctx.fillStyle = isHL ? `rgba(${color},1)` : 'rgba(6,182,212,0.75)';
          ctx.font = '11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v, ox+j*CELL+CELL/2, oy+i*CELL+CELL/2+4);
        });
      });
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, ox+1.5*CELL, oy-7);
    };

    const ax = 8, bx = ax + 3*CELL + 22, cx = bx + 3*CELL + 22;
    const y = (h - 3*CELL)/2;

    drawMat(ax, y, A, ri, null, 'A', '124,58,237');
    drawMat(bx, y, B, null, ci, 'B', '6,182,212');
    drawMat(cx, y, C, null, null, 'C=AB', '253,231,37');

    // Highlight C cell
    ctx.fillStyle = 'rgba(253,231,37,0.4)';
    roundRect(ctx, cx+ci*CELL+1, y+ri*CELL+1, CELL-2, CELL-2, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('×', ax+3*CELL+10, y+1.5*CELL+4);
    ctx.fillText('=', bx+3*CELL+10, y+1.5*CELL+4);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawInverseAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const A = [[2,1],[5,3]];
    const Ainv = [[3,-1],[-5,2]];
    const phase = (Math.sin(t * 0.03) + 1) / 2;

    // Draw A and A⁻¹
    const CELL = 38;
    const drawMat2x2 = (ox, oy, mat, label, clr) => {
      mat.forEach((row, i) => row.forEach((v, j) => {
        ctx.fillStyle = `rgba(${clr},0.1)`;
        roundRect(ctx, ox+j*CELL+2, oy+i*CELL+2, CELL-4, CELL-4, 5);
        ctx.fill();
        ctx.strokeStyle = `rgba(${clr},0.3)`; ctx.lineWidth=1;
        roundRect(ctx, ox+j*CELL+2, oy+i*CELL+2, CELL-4, CELL-4, 5);
        ctx.stroke();
        ctx.fillStyle = `rgba(${clr},0.9)`;
        ctx.font = '13px JetBrains Mono, monospace'; ctx.textAlign='center';
        ctx.fillText(v, ox+j*CELL+CELL/2, oy+i*CELL+CELL/2+5);
      }));
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.font='10px Inter,sans-serif'; ctx.fillText(label, ox+CELL, oy-8);
    };

    const y = (h - 2*CELL)/2;
    drawMat2x2(16, y, A, 'A', '124,58,237');
    drawMat2x2(w/2+10, y, Ainv, 'A⁻¹', '6,182,212');

    // Animated product = I
    const identVal = Math.round(phase * 100) / 100;
    ctx.fillStyle = `rgba(253,231,37,${0.5+phase*0.5})`;
    ctx.font = '12px JetBrains Mono, monospace'; ctx.textAlign='center';
    ctx.fillText(`A × A⁻¹ = I`, w/2, h-16);

    // Arrow
    ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='18px sans-serif';
    ctx.fillText('·', w/2, y+CELL+6);
    ctx.fillText('=  I', w/2+8, y+CELL/2+6);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawEigenAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const cx = w/2, cy = h/2;
    // Draw coordinate axes
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(w,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,h); ctx.stroke();

    // Eigenvectors v1=(1,0) λ=2, v2=(0,1) λ=0.5
    const scale = 65;
    const lambda1 = 2 + 0.5*Math.sin(t*0.03);
    const lambda2 = 0.5 + 0.2*Math.cos(t*0.05);

    // Draw ellipse (eigenvector axes)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle='rgba(124,58,237,0.4)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.ellipse(0,0, scale*lambda1, scale*lambda2, 0, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Many random vectors being mapped
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + t * 0.01;
      const r = 50;
      const vx = Math.cos(angle)*r, vy = Math.sin(angle)*r;
      const mx = vx * lambda1, my = vy * lambda2;
      const blend = (Math.sin(t*0.04) + 1) / 2;
      const px = vx + (mx - vx) * blend;
      const py = vy + (my - vy) * blend;

      ctx.strokeStyle='rgba(6,182,212,0.35)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+px,cy+py);ctx.stroke();
      ctx.fillStyle='rgba(6,182,212,0.6)';
      ctx.beginPath();ctx.arc(cx+px,cy+py,3,0,Math.PI*2);ctx.fill();
    }

    // Eigenvectors highlighted
    const ev1 = [1,0], ev2 = [0,1];
    drawArrow(ctx, cx, cy, cx+ev1[0]*scale*lambda1, cy+ev1[1]*scale*lambda2, 'rgba(124,58,237,1)', 2.5);
    drawArrow(ctx, cx, cy, cx+ev2[0]*scale*lambda1, cy+ev2[1]*scale*lambda2, 'rgba(253,231,37,1)', 2.5);

    ctx.fillStyle='rgba(124,58,237,0.9)';ctx.font='11px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText(`λ₁ = ${lambda1.toFixed(2)}`, cx+scale*lambda1+5, cy-5);
    ctx.fillStyle='rgba(253,231,37,0.9)';
    ctx.fillText(`λ₂ = ${lambda2.toFixed(2)}`, cx+5, cy-scale*lambda2-5);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawSVDAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;

  // Fake singular value bars
  const SVs = [120, 60, 25, 12, 5, 2, 1, 0.4];

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const rank = Math.max(1, Math.round(((Math.sin(t*0.025)+1)/2) * SVs.length));
    const maxSV = SVs[0];
    const barW = (w - 40) / SVs.length;
    const maxH = h - 60;

    SVs.forEach((sv, i) => {
      const bh = (sv / maxSV) * maxH;
      const included = i < rank;
      const grd = ctx.createLinearGradient(0, h-20, 0, h-20-bh);
      if (included) {
        grd.addColorStop(0, 'rgba(124,58,237,0.9)');
        grd.addColorStop(1, 'rgba(6,182,212,0.9)');
      } else {
        grd.addColorStop(0, 'rgba(255,255,255,0.04)');
        grd.addColorStop(1, 'rgba(255,255,255,0.12)');
      }
      ctx.fillStyle = grd;
      roundRect(ctx, 20 + i*barW + 3, h-20-bh, barW-6, bh, 3);
      ctx.fill();

      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px JetBrains Mono,monospace';ctx.textAlign='center';
      ctx.fillText(`σ${i+1}`, 20+i*barW+barW/2, h-6);
    });

    ctx.fillStyle='rgba(253,231,37,0.85)';ctx.font='12px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText(`Rank k = ${rank}  (keeping ${Math.round(SVs.slice(0,rank).reduce((s,v)=>s+v*v,0)/SVs.reduce((s,v)=>s+v*v,0)*100)}% energy)`, 20, 22);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawConvAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;
  const SIG = [10,20,30,40,80,120,110,80,50,30,20,15,10,8,5,3];
  const KERN = [0.2,0.6,0.2];

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const pos = Math.floor(t / 6) % (SIG.length - 2);
    const barW = (w - 32) / SIG.length;
    const maxV = Math.max(...SIG);

    // Draw input bars
    SIG.forEach((v, i) => {
      const bh = (v / maxV) * (h/2 - 20);
      const isKern = i >= pos && i < pos + 3;
      ctx.fillStyle = isKern ? 'rgba(124,58,237,0.7)' : 'rgba(6,182,212,0.35)';
      roundRect(ctx, 16+i*barW+1, h/2-bh, barW-2, bh, 2);
      ctx.fill();
    });
    // Draw kernel highlight
    for (let k = 0; k < 3; k++) {
      const i = pos + k;
      ctx.strokeStyle='rgba(253,231,37,0.8)';ctx.lineWidth=2;
      ctx.strokeRect(16+i*barW, h/2 - (SIG[i]/maxV)*(h/2-20)-2, barW, (SIG[i]/maxV)*(h/2-20)+2);
    }

    // Convolved output
    const conv = SIG.map((_,i)=>{
      if (i===0||i===SIG.length-1) return SIG[i];
      return KERN[0]*SIG[i-1]+KERN[1]*SIG[i]+KERN[2]*(SIG[i+1]||SIG[i]);
    });
    ctx.strokeStyle='rgba(236,72,153,0.8)';ctx.lineWidth=2;
    ctx.beginPath();
    conv.forEach((v,i)=>{
      const x = 16+i*barW+barW/2;
      const y = h/2 + 12 + (1-(v/maxV))*(h/2-30);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle='rgba(6,182,212,0.7)';ctx.font='10px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText('Input x[n]', 16, h/2-4);
    ctx.fillStyle='rgba(236,72,153,0.7)';
    ctx.fillText('Output (x*k)[n]', 16, h-8);
    ctx.fillStyle='rgba(253,231,37,0.7)';
    ctx.fillText(`Kernel @ n=${pos}`, 16+pos*barW, h/2+12);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawFourierAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;
  const FREQS = [1, 3, 5];

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const phase = t * 0.04;
    const colors = ['rgba(124,58,237,0.8)','rgba(6,182,212,0.8)','rgba(236,72,153,0.8)'];
    const combined = [];
    const numPts = w - 32;

    for (let i = 0; i <= numPts; i++) {
      const x = i / numPts;
      combined.push(FREQS.reduce((s,f,fi) => s + Math.sin(2*Math.PI*f*x + phase*(fi+1)*0.3) / FREQS.length, 0));
    }

    // Draw components
    FREQS.forEach((f, fi) => {
      ctx.strokeStyle = colors[fi]; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= numPts; i++) {
        const x = 16 + i;
        const v = Math.sin(2*Math.PI*f*(i/numPts) + phase*(fi+1)*0.3) / FREQS.length;
        const y = (h*0.35) - v * (h*0.12);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    });

    // Draw sum
    ctx.strokeStyle='rgba(253,231,37,0.9)';ctx.lineWidth=2.5;
    ctx.beginPath();
    combined.forEach((v,i)=>{
      const x=16+i, y=(h*0.72)-v*(h*0.2);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();

    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='10px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText('Components (f=1,3,5 Hz)', 16, 14);
    ctx.fillStyle='rgba(253,231,37,0.6)';
    ctx.fillText('Sum = x(t)', 16, h*0.55);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawDotAnim(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  let t = 0;

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    const cx = w/2, cy = h/2;

    ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();

    const r = 65;
    const a1 = t * 0.02;
    const a2 = a1 + (Math.sin(t*0.01)*0.8 + Math.PI/4);
    const v1 = [Math.cos(a1)*r, -Math.sin(a1)*r];
    const v2 = [Math.cos(a2)*r, -Math.sin(a2)*r];
    const dot = v1[0]*v2[0]+v1[1]*v2[1];
    const similarity = dot / (r*r);
    const angle = Math.acos(Math.max(-1,Math.min(1,similarity)));

    drawArrow(ctx, cx, cy, cx+v1[0], cy+v1[1], 'rgba(124,58,237,1)', 2.5);
    drawArrow(ctx, cx, cy, cx+v2[0], cy+v2[1], 'rgba(6,182,212,1)', 2.5);

    // Arc between
    ctx.strokeStyle='rgba(253,231,37,0.5)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(cx, cy, 30, -a1, -a2, a2<a1);ctx.stroke();
    ctx.fillStyle='rgba(253,231,37,0.7)';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(`θ=${(angle*180/Math.PI).toFixed(0)}°`, cx+(Math.cos((a1+a2)/2))*44, cy-(Math.sin((a1+a2)/2))*44);

    const dotStr = dot.toFixed(1);
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px JetBrains Mono,monospace';ctx.textAlign='center';
    ctx.fillText(`a·b = ${dotStr}`, cx, h-12);

    t++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- Canvas helpers ----
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
function drawArrow(ctx, x1, y1, x2, y2, color, lw=1.5) {
  const angle = Math.atan2(y2-y1, x2-x1);
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=lw;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const al=10, aa=0.45;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-al*Math.cos(angle-aa), y2-al*Math.sin(angle-aa));
  ctx.lineTo(x2-al*Math.cos(angle+aa), y2-al*Math.sin(angle+aa));
  ctx.closePath();ctx.fill();
}
