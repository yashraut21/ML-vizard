import * as math from 'mathjs';

/**
 * Core matrix operations wrapping math.js
 */

export function transpose(matrix) {
  return math.transpose(matrix);
}

export function inverse(matrix) {
  try {
    return math.inv(matrix);
  } catch (e) {
    throw new Error('Matrix is singular (not invertible)');
  }
}

export function multiply(A, B) {
  return math.multiply(A, B);
}

export function scalarMultiply(matrix, scalar) {
  return math.multiply(scalar, matrix);
}

export function determinant(matrix) {
  return math.det(matrix);
}

export function norm(matrix) {
  return math.norm(matrix);
}

export function eigenvalues(matrix) {
  try {
    const { values } = math.eigs(matrix);
    return values;
  } catch {
    return null;
  }
}

/**
 * SVD rank-k approximation (power iteration — no math.js dependency)
 */
export function svdApproximate(matrix2D, rank) {
  // Delegate to imageOps svdRankK via direct implementation here
  const m = matrix2D.length, n = matrix2D[0]?.length ?? 0;
  const r = Math.min(rank, m, n);
  let Ar = matrix2D.map(row => [...row]);
  let result = Array.from({ length: m }, () => new Array(n).fill(0));

  for (let iter = 0; iter < r; iter++) {
    let v = Array.from({ length: n }, () => Math.random() - 0.5);
    for (let step = 0; step < 30; step++) {
      let u = Ar.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
      const un = Math.sqrt(u.reduce((s, x) => s + x * x, 0));
      if (un < 1e-10) break;
      u = u.map(x => x / un);
      const newV = new Array(n).fill(0);
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) newV[j] += Ar[i][j] * u[i];
      const vn = Math.sqrt(newV.reduce((s, x) => s + x * x, 0));
      if (vn < 1e-10) break;
      v = newV.map(x => x / vn);
    }
    let u2 = Ar.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
    const sigma = Math.sqrt(u2.reduce((s, x) => s + x * x, 0));
    if (sigma < 1e-10) break;
    u2 = u2.map(x => x / sigma);
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
      result[i][j] += sigma * u2[i] * v[j];
      Ar[i][j] -= sigma * u2[i] * v[j];
    }
  }
  return result;
}

/**
 * Create standard matrices
 */
export function identityMatrix(n) {
  return math.identity(n).toArray();
}

export function rotationMatrix2D(angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  return [
    [Math.cos(r), -Math.sin(r), 0],
    [Math.sin(r),  Math.cos(r), 0],
    [0,            0,           1],
  ];
}

export function shearMatrix(sx, sy) {
  return [
    [1,  sx, 0],
    [sy, 1,  0],
    [0,  0,  1],
  ];
}

export function scaleMatrix(sx, sy) {
  return [
    [sx, 0,  0],
    [0,  sy, 0],
    [0,  0,  1],
  ];
}

export const KERNELS = {
  identity: [[0,0,0],[0,1,0],[0,0,0]],
  blur:     [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
  gaussian: [[1/16,2/16,1/16],[2/16,4/16,2/16],[1/16,2/16,1/16]],
  sharpen:  [[0,-1,0],[-1,5,-1],[0,-1,0]],
  edge:     [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],
  emboss:   [[-2,-1,0],[-1,1,1],[0,1,2]],
  sobelX:   [[-1,0,1],[-2,0,2],[-1,0,1]],
  sobelY:   [[-1,-2,-1],[0,0,0],[1,2,1]],
};
