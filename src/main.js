import './index.css';
import './extra.css';
import { gsap } from 'gsap';
import { ImageLab }      from './pages/ImageLab.js';
import { AudioLab }      from './pages/AudioLab.js';
import { Concepts }      from './pages/Concepts.js';
import { MathLab }       from './pages/MathLab.js';
import { StatsLab }      from './pages/StatsLab.js';
import { RegressionLab } from './pages/RegressionLab.js';
import { NeuralNetLab }  from './pages/NeuralNetLab.js';
import { OptimizerLab }  from './pages/OptimizerLab.js';

// ---- Matrix Rain Background ----
function initMatrixRain() {
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-rain';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, cols, drops;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.floor(W / 18);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }
  resize();
  window.addEventListener('resize', resize);

  const chars = '01⌘∑∫∂∇×⊗∏MATRIX[]+-λσ'.split('');
  function rain() {
    ctx.fillStyle = 'rgba(6,10,20,0.12)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '13px JetBrains Mono, monospace';
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = `rgba(124,58,237,${Math.random() * 0.25 + 0.04})`;
      ctx.fillText(ch, i * 18, y * 18);
      if (y * 18 > H && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 0.5;
    });
    requestAnimationFrame(rain);
  }
  rain();
}

// ---- Route Registry ----
const ROUTES = {
  home:          renderHome,
  'math-lab':    () => renderPage(MathLab()),
  'stats-lab':   () => renderPage(StatsLab()),
  'regression':  () => renderPage(RegressionLab()),
  'neural-net':  () => renderPage(NeuralNetLab()),
  'optimizer':   () => renderPage(OptimizerLab()),
  'image-lab':   () => renderPage(ImageLab()),
  'audio-lab':   () => renderPage(AudioLab()),
  concepts:      () => renderPage(Concepts()),
};

const NAV_GROUPS = [
  {
    label: 'Math & Stats',
    items: [
      { route: 'math-lab',  icon: '🧮', label: 'Math Lab',   badge: 'P0' },
      { route: 'stats-lab', icon: '📊', label: 'Stats Lab',  badge: 'P1' },
    ],
  },
  {
    label: 'Classical ML',
    items: [
      { route: 'regression', icon: '📈', label: 'Regression Lab', badge: 'P2' },
    ],
  },
  {
    label: 'Deep Learning',
    items: [
      { route: 'neural-net', icon: '🧠', label: 'Neural Net Lab',  badge: 'P3' },
      { route: 'optimizer',  icon: '⚡', label: 'Optimizer Race',  badge: 'P5' },
    ],
  },
  {
    label: 'Signal',
    items: [
      { route: 'image-lab', icon: '🖼', label: 'Image Lab',  badge: null },
      { route: 'audio-lab', icon: '🎵', label: 'Audio Lab',  badge: null },
    ],
  },
];

// ---- SPA Navigator ----
export function navigate(route) {
  const app = document.getElementById('app');
  gsap.to(app, {
    opacity: 0, y: -8, duration: 0.18, ease: 'power2.in',
    onComplete: () => {
      app.innerHTML = '';
      (ROUTES[route] || ROUTES.home)();
      gsap.fromTo(app, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    }
  });
  // Update active nav
  document.querySelectorAll('.nav-link-flat, .nav-dropdown-item').forEach(l => {
    const isActive = l.dataset.route === route || (route === 'home' && l.dataset.route === 'home');
    l.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
  window.location.hash = route === 'home' ? '' : route;
}

function renderPage(pageEl) {
  document.getElementById('app').appendChild(pageEl);
}

// ---- Home Page ----
function renderHome() {
  document.getElementById('app').innerHTML = `
    <section class="hero">
      <div class="hero-eyebrow">
        <span class="dot"></span>
        Interactive ML Visualizer — From Scratch to Advanced
      </div>

      <h1 class="hero-title">
        See the Math.<br>
        <span class="gradient-text">Feel the Transform.</span>
      </h1>

      <p class="hero-subtitle">
        A complete, visual-first ML curriculum. Every formula animated. Every concept interactive.
        From vector dot products to neural network backpropagation.
      </p>

      <div class="hero-actions">
        <button class="btn btn-primary" id="hero-start" style="font-size:1rem;padding:14px 36px">
          🧮 Start with Math Lab
        </button>
        <button class="btn btn-secondary" id="hero-nn" style="font-size:1rem;padding:14px 36px">
          🧠 Neural Net Lab
        </button>
      </div>

      <div class="hero-feature-pills">
        ${['Vectors','Dot Product','Distributions','Bayes','Gradient Descent','Regression','Neural Networks','Backprop','Optimizers','Convolution','SVD','Entropy','MLE','Transformers'].map(f=>`<span class="pill">${f}</span>`).join('')}
      </div>

      <!-- Phase cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;max-width:1300px;width:100%;margin-top:56px">
        ${[
          { phase:'Phase 0', icon:'🧮', title:'Math Lab',        desc:'Vectors, dot products, norms, gradient fields, and the chain rule — the building blocks of all ML.',   route:'math-lab',   color:'var(--accent-cyan)' },
          { phase:'Phase 1', icon:'📊', title:'Stats Lab',       desc:'Probability distributions, Bayes theorem, correlation, entropy, and maximum likelihood estimation.',  route:'stats-lab',  color:'#10b981' },
          { phase:'Phase 2', icon:'📈', title:'Regression Lab',  desc:'Linear, polynomial, Ridge, and Lasso regression with gradient descent on a live loss landscape.',     route:'regression', color:'#fbbf24' },
          { phase:'Phase 3', icon:'🧠', title:'Neural Net Lab',  desc:'Build a neural network layer by layer. Train a classifier. Watch backpropagation in real time.',      route:'neural-net', color:'var(--accent-violet)' },
          { phase:'Phase 5', icon:'⚡', title:'Optimizer Race',  desc:'SGD, Momentum, AdaGrad, RMSProp, and Adam racing on the same loss surface simultaneously.',           route:'optimizer',  color:'#f97316' },
          { phase:'Signal',  icon:'🖼', title:'Image Lab',       desc:'Apply a pipeline of transforms to any image: transpose, convolution, SVD compression, rotation, and more.', route:'image-lab', color:'#ec4899' },
          { phase:'Signal',  icon:'🎵', title:'Audio Lab',       desc:'See audio as a 2D matrix. Explore waveforms, FFT spectra, and STFT spectrograms.',                    route:'audio-lab',  color:'#06b6d4' },
          { phase:'Gallery', icon:'📐', title:'Concepts',        desc:'Animated mini-demos for every linear algebra and ML concept: eigenvectors, SVD, Fourier, and more.',  route:'concepts',   color:'#a78bfa' },
        ].map(c=>`
          <button class="card feat-card" data-route="${c.route}" style="text-align:left;cursor:pointer;border:none;width:100%;position:relative;overflow:hidden">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <span style="font-size:1.8rem">${c.icon}</span>
              <div>
                <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${c.color};margin-bottom:2px">${c.phase}</div>
                <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary)">${c.title}</div>
              </div>
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.6;margin:0">${c.desc}</p>
            <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${c.color},transparent)"></div>
          </button>`).join('')}
      </div>
    </section>
  `;

  document.getElementById('hero-start').addEventListener('click', () => navigate('math-lab'));
  document.getElementById('hero-nn').addEventListener('click', () => navigate('neural-net'));
  document.querySelectorAll('.feat-card').forEach(c => c.addEventListener('click', () => navigate(c.dataset.route)));
}

// ---- Nav Setup ----
function buildNav() {
  const nav = document.getElementById('main-nav');
  const linksEl = nav.querySelector('#nav-links');
  if (!linksEl) return;

  // Home link
  const homeBtn = document.createElement('button');
  homeBtn.className = 'nav-link-flat nav-link';
  homeBtn.dataset.route = 'home';
  homeBtn.id = 'nav-home';
  homeBtn.textContent = 'Home';
  homeBtn.addEventListener('click', () => navigate('home'));
  linksEl.appendChild(homeBtn);

  // Dropdown groups
  NAV_GROUPS.forEach(group => {
    const dd = document.createElement('div');
    dd.className = 'nav-dropdown';
    dd.innerHTML = `
      <button class="nav-dropdown-toggle">
        ${group.label}
        <svg class="chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
      </button>
      <div class="nav-dropdown-menu">
        ${group.items.map(it=>`
          <button class="nav-dropdown-item" data-route="${it.route}">
            <span class="item-icon">${it.icon}</span>
            <span class="item-label">${it.label}</span>
            ${it.badge?`<span class="item-badge">${it.badge}</span>`:''}
          </button>`).join('')}
      </div>
    `;
    dd.querySelector('.nav-dropdown-toggle').addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      if (!wasOpen) dd.classList.add('open');
    });
    dd.querySelectorAll('.nav-dropdown-item').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.route));
    });
    linksEl.appendChild(dd);
  });

  // Concepts link
  const conceptsBtn = document.createElement('button');
  conceptsBtn.className = 'nav-link-flat nav-link';
  conceptsBtn.dataset.route = 'concepts';
  conceptsBtn.textContent = '📐 Concepts';
  conceptsBtn.addEventListener('click', () => navigate('concepts'));
  linksEl.appendChild(conceptsBtn);

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
  });
}

function setupNav() {
  buildNav();

  // Mobile toggle
  const toggle = document.getElementById('nav-mobile-toggle');
  const links = document.getElementById('nav-links');
  toggle?.addEventListener('click', () => {
    const open = links.dataset.open === 'true';
    links.dataset.open = !open;
    links.style.display = !open ? 'flex' : 'none';
    links.style.flexDirection = 'column';
    links.style.position = 'absolute';
    links.style.top = '60px'; links.style.left = '0'; links.style.right = '0';
    links.style.background = 'var(--bg-surface)';
    links.style.padding = '12px';
    links.style.borderBottom = '1px solid var(--border)';
    links.style.zIndex = '150';
    links.style.gap = '4px';
  });
}

// ---- Toast ----
export function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div'); el.id = 'toast-container'; document.body.appendChild(el); return el;
  })();
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => gsap.to(t, { opacity: 0, x: 20, duration: 0.3, onComplete: () => t.remove() }), 3000);
}

// ---- Boot ----
initMatrixRain();
setupNav();

function routeFromHash() {
  const hash = window.location.hash.replace('#', '') || 'home';
  navigate(hash);
}
window.addEventListener('hashchange', routeFromHash);
routeFromHash();

window.addEventListener('scroll', () => {
  const nav = document.getElementById('main-nav');
  if (nav) nav.style.background = window.scrollY > 20 ? 'hsla(220,25%,6%,0.97)' : 'hsla(220,25%,6%,0.8)';
});
