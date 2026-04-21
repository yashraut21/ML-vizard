/**
 * Built-in procedural demo images (no external files needed)
 * Each returns an ImageData drawn to a canvas
 */

export const SAMPLE_IMAGES = [
  { id: 'gradient',   label: 'Gradient',    draw: drawGradient },
  { id: 'checkerboard', label: 'Checker',   draw: drawCheckerboard },
  { id: 'circles',   label: 'Circles',      draw: drawCircles },
  { id: 'portrait',  label: 'Portrait',     draw: drawPortrait },
];

function drawGradient(canvas, size = 256) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0,   '#1a0533');
  g.addColorStop(0.3, '#3d1a8e');
  g.addColorStop(0.6, '#1e8ca3');
  g.addColorStop(1,   '#38f0c0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Add some radial noise structure
  const g2 = ctx.createRadialGradient(size*0.3, size*0.3, 10, size*0.3, size*0.3, size*0.6);
  g2.addColorStop(0, 'rgba(255,220,100,0.4)');
  g2.addColorStop(1, 'rgba(255,220,100,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
}

function drawCheckerboard(canvas, size = 256) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const sq = 32;
  for (let y = 0; y < size; y += sq) {
    for (let x = 0; x < size; x += sq) {
      const v = ((x/sq + y/sq) % 2 === 0);
      ctx.fillStyle = v ? '#e8e4f8' : '#1a163a';
      ctx.fillRect(x, y, sq, sq);
    }
  }
}

function drawCircles(canvas, size = 256) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, size, size);
  const cx = size/2, cy = size/2;
  const colors = ['#7c3aed','#06b6d4','#ec4899','#10b981','#f59e0b'];
  for (let i = 0; i < 8; i++) {
    const r = size*0.05 + i * size * 0.052;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // Add a few filled circles
  [[0.25,0.25,0.08,'#7c3aed'],[0.75,0.25,0.07,'#06b6d4'],[0.25,0.75,0.07,'#ec4899'],[0.75,0.75,0.06,'#10b981']].forEach(([fx,fy,fr,c])=>{
    ctx.beginPath();
    ctx.arc(fx*size, fy*size, fr*size, 0, Math.PI*2);
    ctx.fillStyle = c + 'aa';
    ctx.fill();
  });
}

function drawPortrait(canvas, size = 256) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Dark background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, size, size);
  // Stylized human silhouette using gradients
  const bodyGrad = ctx.createRadialGradient(size*0.5, size*0.62, size*0.05, size*0.5, size*0.62, size*0.32);
  bodyGrad.addColorStop(0, '#4c1d8f');
  bodyGrad.addColorStop(1, '#1e0d3a');
  ctx.beginPath();
  ctx.ellipse(size*0.5, size*0.7, size*0.28, size*0.32, 0, 0, Math.PI*2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  // Head
  const headGrad = ctx.createRadialGradient(size*0.5, size*0.32, size*0.04, size*0.5, size*0.32, size*0.18);
  headGrad.addColorStop(0, '#7c3aed');
  headGrad.addColorStop(1, '#3b1a8a');
  ctx.beginPath();
  ctx.arc(size*0.5, size*0.32, size*0.17, 0, Math.PI*2);
  ctx.fillStyle = headGrad;
  ctx.fill();
  // Glow
  const glow = ctx.createRadialGradient(size*0.5, size*0.5, 0, size*0.5, size*0.5, size*0.5);
  glow.addColorStop(0, 'rgba(124,58,237,0.15)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
}

/**
 * Load a sample image to a canvas by id
 */
export function loadSampleToCanvas(id, canvas, size = 256) {
  const sample = SAMPLE_IMAGES.find(s => s.id === id);
  if (!sample) return;
  sample.draw(canvas, size);
}
