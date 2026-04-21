/**
 * Image ↔ Matrix conversion and pixel-level transformations
 */

/**
 * Extract RGBA pixel data from canvas
 */
export function getImageData(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Draw ImageData back to canvas
 */
export function putImageData(canvas, imageData) {
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Load an image (File, URL, or HTMLImageElement) into a canvas
 */
export function loadImageToCanvas(source, canvas, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const img = source instanceof HTMLImageElement ? source : new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(getImageData(canvas));
    };
    img.onerror = reject;
    if (!(source instanceof HTMLImageElement)) {
      if (source instanceof File) {
        img.src = URL.createObjectURL(source);
      } else {
        img.src = source;
        img.crossOrigin = 'anonymous';
      }
    }
  });
}

/**
 * Extract a rectangular sub-region as a 2D numeric matrix (grayscale)
 */
export function imageToMatrix(imageData, x = 0, y = 0, w = 8, h = 8) {
  const { data, width } = imageData;
  const matrix = [];
  for (let row = 0; row < h; row++) {
    const r = [];
    for (let col = 0; col < w; col++) {
      const idx = ((y + row) * width + (x + col)) * 4;
      const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      r.push(gray);
    }
    matrix.push(r);
  }
  return matrix;
}

/**
 * Apply transpose to image (reflect across diagonal)
 */
export function transposeImage(imageData) {
  const { data, width, height } = imageData;
  const newData = new Uint8ClampedArray(data.length);
  const newW = height, newH = width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (x * newW + y) * 4;
      newData[dstIdx]     = data[srcIdx];
      newData[dstIdx + 1] = data[srcIdx + 1];
      newData[dstIdx + 2] = data[srcIdx + 2];
      newData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(newData, newW, newH);
}

/**
 * Apply 2D convolution with the given kernel
 */
export function applyConvolution(imageData, kernel) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  const kh = kernel.length;
  const kw = kernel[0].length;
  const kcy = Math.floor(kh / 2);
  const kcx = Math.floor(kw / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < kh; ky++) {
        for (let kx = 0; kw && kx < kw; kx++) {
          const px = x + kx - kcx;
          const py = y + ky - kcy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const idx = (py * width + px) * 4;
          const w = kernel[ky][kx];
          r += data[idx]     * w;
          g += data[idx + 1] * w;
          b += data[idx + 2] * w;
        }
      }
      const i = (y * width + x) * 4;
      out[i]     = clamp(r);
      out[i + 1] = clamp(g);
      out[i + 2] = clamp(b);
      out[i + 3] = data[i + 3];
    }
  }
  return new ImageData(out, width, height);
}

/**
 * Apply a 3x3 matrix to RGB color channels
 */
export function applyColorMatrix(imageData, matrix3x3) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  const m = matrix3x3;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    out[i]     = clamp(m[0][0]*r + m[0][1]*g + m[0][2]*b);
    out[i + 1] = clamp(m[1][0]*r + m[1][1]*g + m[1][2]*b);
    out[i + 2] = clamp(m[2][0]*r + m[2][1]*g + m[2][2]*b);
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}

/**
 * Scalar multiply (brightness)
 */
export function scalarMultiplyImage(imageData, scalar) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i]     = clamp(data[i]     * scalar);
    out[i + 1] = clamp(data[i + 1] * scalar);
    out[i + 2] = clamp(data[i + 2] * scalar);
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}

/**
 * Inverse image (255 - channel)
 */
export function inverseImage(imageData) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i]     = 255 - data[i];
    out[i + 1] = 255 - data[i + 1];
    out[i + 2] = 255 - data[i + 2];
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}

/**
 * Extract single RGB channel
 * channel: 'r' | 'g' | 'b'
 */
export function extractChannel(imageData, channel) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  const ch = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i + ch];
    out[i] = ch === 0 ? v : 0;
    out[i + 1] = ch === 1 ? v : 0;
    out[i + 2] = ch === 2 ? v : 0;
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}

/**
 * Grayscale
 */
export function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
    out[i] = out[i+1] = out[i+2] = g;
    out[i+3] = data[i+3];
  }
  return new ImageData(out, width, height);
}

/**
 * Affine transform (bilinear interpolation)
 * matrix: 3x3 homogeneous
 */
export function applyAffineTransform(imageData, matrix3x3) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length).fill(0);
  const m = matrix3x3;
  // Invert the matrix for backward mapping
  const det = m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
             -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
             +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  if (Math.abs(det) < 1e-10) return imageData;

  const inv = [
    [(m[1][1]*m[2][2]-m[1][2]*m[2][1])/det, (m[0][2]*m[2][1]-m[0][1]*m[2][2])/det, (m[0][1]*m[1][2]-m[0][2]*m[1][1])/det],
    [(m[1][2]*m[2][0]-m[1][0]*m[2][2])/det, (m[0][0]*m[2][2]-m[0][2]*m[2][0])/det, (m[0][2]*m[1][0]-m[0][0]*m[1][2])/det],
    [(m[1][0]*m[2][1]-m[1][1]*m[2][0])/det, (m[0][1]*m[2][0]-m[0][0]*m[2][1])/det, (m[0][0]*m[1][1]-m[0][1]*m[1][0])/det],
  ];

  const cx = width / 2, cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const sx = inv[0][0]*dx + inv[0][1]*dy + cx;
      const sy = inv[1][0]*dx + inv[1][1]*dy + cy;
      const rgba = bilinear(data, width, height, sx, sy);
      const idx = (y * width + x) * 4;
      out[idx]     = rgba[0];
      out[idx + 1] = rgba[1];
      out[idx + 2] = rgba[2];
      out[idx + 3] = rgba[3];
    }
  }
  return new ImageData(out, width, height);
}

/**
 * SVD rank-k approximation on grayscale image
 */
export function svdCompressImage(imageData, rank) {
  const gray = toGrayscale(imageData);
  const { data, width, height } = gray;

  // Build 2D grayscale matrix
  const mat = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(data[(y * width + x) * 4] / 255);
    }
    mat.push(row);
  }

  const compressed = svdRankK(mat, rank);
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = clamp(Math.round(compressed[y][x] * 255));
      const i = (y * width + x) * 4;
      out[i] = out[i+1] = out[i+2] = v;
      out[i+3] = 255;
    }
  }
  return new ImageData(out, width, height);
}

// ---- Helpers ----

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function bilinear(data, width, height, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = x0 + 1, y1 = y0 + 1;
  const fx = x - x0, fy = y - y0;
  const s = [x0, x1], t = [y0, y1];
  const w = [(1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy];
  const pts = [[x0,y0],[x1,y0],[x0,y1],[x1,y1]];
  let r=0,g=0,b=0,a=0;
  pts.forEach(([px,py], i) => {
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const idx = (py*width+px)*4;
      r += data[idx]*w[i]; g += data[idx+1]*w[i];
      b += data[idx+2]*w[i]; a += data[idx+3]*w[i];
    }
  });
  return [clamp(r),clamp(g),clamp(b),clamp(a)];
}

/**
 * Simple SVD rank-k approximation via power iteration
 */
function svdRankK(A, k) {
  const m = A.length, n = A[0].length;
  const rank = Math.min(k, m, n);

  // Work on a copy
  let Ar = A.map(r => [...r]);
  let result = Array.from({length:m}, () => new Array(n).fill(0));

  for (let r = 0; r < rank; r++) {
    // Power iteration to find top singular vector
    let v = Array.from({length:n}, () => Math.random()-0.5);
    for (let iter = 0; iter < 30; iter++) {
      let u = matVecMul(Ar, v);
      const unorm = vecNorm(u);
      if (unorm < 1e-10) break;
      u = u.map(x => x/unorm);
      v = matTVecMul(Ar, u);
      const vnorm = vecNorm(v);
      if (vnorm < 1e-10) break;
      v = v.map(x => x/vnorm);
    }
    let u = matVecMul(Ar, v);
    const sigma = vecNorm(u);
    if (sigma < 1e-10) break;
    u = u.map(x => x/sigma);

    // Add this rank-1 component
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        result[i][j] += sigma * u[i] * v[j];

    // Deflate
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        Ar[i][j] -= sigma * u[i] * v[j];
  }
  return result;
}

function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, j) => s + a*v[j], 0));
}
function matTVecMul(A, u) {
  const m=A.length, n=A[0].length;
  const result = new Array(n).fill(0);
  for (let i=0;i<m;i++) for (let j=0;j<n;j++) result[j]+=A[i][j]*u[i];
  return result;
}
function vecNorm(v) { return Math.sqrt(v.reduce((s,x)=>s+x*x,0)); }
