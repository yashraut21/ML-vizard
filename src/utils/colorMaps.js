/**
 * Color maps for matrix heatmap visualization
 */

/** Viridis colormap (sequential, perceptually uniform) */
const VIRIDIS = [
  [68,1,84],[72,36,116],[64,67,135],[52,94,141],[41,120,142],
  [32,144,140],[34,167,132],[68,190,112],[121,209,81],[189,222,38],[253,231,37]
];

/** Plasma colormap */
const PLASMA = [
  [13,8,135],[75,3,161],[125,3,168],[168,15,152],[203,52,120],
  [226,91,84],[242,131,52],[252,172,23],[240,214,15],[252,253,191]
];

/** Magma colormap */
const MAGMA = [
  [0,0,4],[10,7,32],[28,16,69],[54,21,102],[83,24,121],
  [118,30,122],[152,48,115],[186,75,100],[217,107,84],[244,149,69],[252,199,48],[252,253,191]
];

/** Cool-Warm diverging map */
const COOLWARM = [
  [59,76,192],[98,130,234],[141,176,254],[184,208,249],[221,220,220],
  [243,196,170],[248,158,115],[232,96,58],[180,4,38]
];

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function sampleMap(palette, t) {
  t = Math.max(0, Math.min(1, t));
  const idx = t * (palette.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, palette.length - 1);
  return lerpColor(palette[lo], palette[hi], idx - lo);
}

export const colorMaps = {
  viridis:  t => sampleMap(VIRIDIS, t),
  plasma:   t => sampleMap(PLASMA, t),
  magma:    t => sampleMap(MAGMA, t),
  coolwarm: t => sampleMap(COOLWARM, t),
  grayscale: t => { const v = Math.round(t * 255); return [v, v, v]; },
};

/**
 * Draw a 2D matrix as a heatmap onto a canvas
 */
export function drawHeatmap(canvas, matrix2D, mapName = 'viridis') {
  const cmap = colorMaps[mapName] ?? colorMaps.viridis;
  const rows = matrix2D.length;
  const cols = matrix2D[0].length;
  canvas.width  = cols;
  canvas.height = rows;

  let min = Infinity, max = -Infinity;
  matrix2D.forEach(row => row.forEach(v => {
    if (v < min) min = v;
    if (v > max) max = v;
  }));
  const range = max - min || 1;

  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(cols, rows);
  const d = imgData.data;
  matrix2D.forEach((row, y) => {
    row.forEach((v, x) => {
      const t = (v - min) / range;
      const [r, g, b] = cmap(t);
      const i = (y * cols + x) * 4;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    });
  });
  ctx.putImageData(imgData, 0, 0);
}

export const COLOR_MAP_NAMES = Object.keys(colorMaps);
