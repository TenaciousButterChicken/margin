// CNN Explorer - math + image generators.
//
// Filter Lab uses pure CPU 2D convolution on grayscale 128×128 images.
// Layer Explorer hands tensors to MobileNet (TF.js) - that lives in the
// React component since it's all async. This file is the synchronous
// "shape what you can see" layer.

/* =====================================================================
   Types
   ===================================================================== */

export type GrayImage = {
  width: number;
  height: number;
  data: Float32Array; // grayscale, values in [0, 1]
};

export type Kernel3x3 = number[]; // length 9, row-major (top-left first)

export type ColorImage = {
  width: number;
  height: number;
  /** RGBA bytes, length = width * height * 4 */
  data: Uint8ClampedArray;
};

/* =====================================================================
   Kernel presets
   ===================================================================== */

export const KERNEL_PRESETS: { name: string; values: Kernel3x3 }[] = [
  { name: "Identity",  values: [0, 0, 0,  0, 1, 0,  0, 0, 0] },
  { name: "Sobel X",   values: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
  { name: "Sobel Y",   values: [-1, -2, -1,  0, 0, 0,  1, 2, 1] },
  { name: "Blur",      values: [1/9, 1/9, 1/9,  1/9, 1/9, 1/9,  1/9, 1/9, 1/9] },
  { name: "Sharpen",   values: [0, -1, 0,  -1, 5, -1,  0, -1, 0] },
  { name: "Emboss",    values: [-2, -1, 0,  -1, 1, 1,  0, 1, 2] },
];

/* =====================================================================
   2D convolution (CPU)
   ===================================================================== */

/** Convolve a grayscale image with a 3×3 kernel.
 *  Edge pixels: clamp (replicate) - simplest and good enough for the demo. */
export function convolve(img: GrayImage, kernel: Kernel3x3): GrayImage {
  const w = img.width;
  const h = img.height;
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const sy = clampInt(y + ky, 0, h - 1);
        for (let kx = -1; kx <= 1; kx++) {
          const sx = clampInt(x + kx, 0, w - 1);
          const k = kernel[(ky + 1) * 3 + (kx + 1)];
          sum += k * img.data[sy * w + sx];
        }
      }
      out[y * w + x] = sum;
    }
  }
  return { width: w, height: h, data: out };
}

/** Compute the convolution at a single (x, y), and return the 9 patch
 *  values plus the running sum. Used by the hover-info strip. */
export type ConvolutionTrace = {
  patch: number[]; // length 9, row-major, in same order as kernel
  terms: number[]; // length 9, kernel[i] * patch[i]
  sum: number;
};

export function traceConvolution(
  img: GrayImage,
  kernel: Kernel3x3,
  x: number,
  y: number
): ConvolutionTrace {
  const patch: number[] = new Array(9);
  const terms: number[] = new Array(9);
  let sum = 0;
  for (let ky = -1; ky <= 1; ky++) {
    const sy = clampInt(y + ky, 0, img.height - 1);
    for (let kx = -1; kx <= 1; kx++) {
      const sx = clampInt(x + kx, 0, img.width - 1);
      const idx = (ky + 1) * 3 + (kx + 1);
      const v = img.data[sy * img.width + sx];
      patch[idx] = v;
      const t = kernel[idx] * v;
      terms[idx] = t;
      sum += t;
    }
  }
  return { patch, terms, sum };
}

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/* =====================================================================
   Filter Lab - preset grayscale image generators
   ===================================================================== */

/** Render a gray image by drawing onto a canvas, then read back pixels. */
function drawGray(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void
): GrayImage {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Float32Array(size * size) };
  }
  // Soft cream background - looks better than pure white in the warm palette
  ctx.fillStyle = "#F4F4F2";
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = new Float32Array(size * size);
  for (let i = 0; i < data.length; i++) {
    const r = imgData.data[i * 4];
    const g = imgData.data[i * 4 + 1];
    const b = imgData.data[i * 4 + 2];
    // Standard luminosity → grayscale
    data[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return { width: size, height: size, data };
}

export type FilterLabImageKind = "face" | "stripes" | "circle" | "seven";

export function generateFilterLabImage(
  kind: FilterLabImageKind,
  size: number = 128
): GrayImage {
  switch (kind) {
    case "face":
      return generateFace(size);
    case "stripes":
      return generateStripes(size);
    case "circle":
      return generateCircle(size);
    case "seven":
      return generateSeven(size);
  }
}

function generateFace(size: number): GrayImage {
  return drawGray(size, (ctx, s) => {
    // Face outline (soft gray fill)
    ctx.fillStyle = "#cbcbc8";
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2 + s * 0.04, s * 0.34, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(s * 0.4, s * 0.42, s * 0.04, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.6, s * 0.42, s * 0.04, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose
    ctx.strokeStyle = "#444";
    ctx.lineWidth = s * 0.018;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.48);
    ctx.lineTo(s * 0.5, s * 0.56);
    ctx.stroke();
    // Mouth (smile)
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.6, s * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  });
}

function generateStripes(size: number): GrayImage {
  return drawGray(size, (ctx, s) => {
    const bandH = s / 8;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#222" : "#dcdcd9";
      ctx.fillRect(0, i * bandH, s, bandH);
    }
  });
}

function generateCircle(size: number): GrayImage {
  return drawGray(size, (ctx, s) => {
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
}

function generateSeven(size: number): GrayImage {
  return drawGray(size, (ctx, s) => {
    ctx.fillStyle = "#222";
    ctx.font = `bold ${s * 0.78}px var(--font-sans, sans-serif)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("7", s / 2, s / 2 + s * 0.04);
  });
}

/* =====================================================================
   Render a gray image to a canvas for display.
   For convolution outputs (which can be negative), pass `mode: "abs"`
   to display |value|. For raw images, pass "raw".
   ===================================================================== */

export type GrayRenderMode = "raw" | "abs" | "shift";

export function renderGrayToCanvas(
  canvas: HTMLCanvasElement | null,
  img: GrayImage,
  mode: GrayRenderMode = "raw"
) {
  if (!canvas) return;
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const data = ctx.createImageData(img.width, img.height);
  for (let i = 0; i < img.data.length; i++) {
    let v = img.data[i];
    if (mode === "abs") v = Math.abs(v);
    else if (mode === "shift") v = v + 0.5;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    const c = Math.round(v * 255);
    data.data[i * 4] = c;
    data.data[i * 4 + 1] = c;
    data.data[i * 4 + 2] = c;
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
}

/* =====================================================================
   Layer Explorer - preset RGB images.
   Procedurally generated 224×224 RGB. Synthetic (no real-photo
   shipping), but visually distinct enough that MobileNet's feature maps
   show interesting structure across layers.
   ===================================================================== */

export type LayerExplorerImageKind =
  | "concentric"
  | "stripes-diag"
  | "checker"
  | "vertical-bars"
  | "radial-sun"
  | "noise"
  | "spiral"
  | "face-stylized";

export const LAYER_EXPLORER_IMAGES: { kind: LayerExplorerImageKind; label: string }[] = [
  { kind: "concentric",     label: "Concentric" },
  { kind: "stripes-diag",   label: "Diagonal Stripes" },
  { kind: "checker",        label: "Checkerboard" },
  { kind: "vertical-bars",  label: "Vertical Bars" },
  { kind: "radial-sun",     label: "Sun" },
  { kind: "noise",          label: "Noise" },
  { kind: "spiral",         label: "Spiral" },
  { kind: "face-stylized",  label: "Face" },
];

/** Render a colored image by drawing onto a canvas. Returns the canvas
 *  itself so it can be passed to TF.js (tf.browser.fromPixels accepts
 *  HTMLCanvasElement). */
export function generateLayerExplorerImage(
  kind: LayerExplorerImageKind,
  size: number = 224
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  switch (kind) {
    case "concentric":
      drawConcentric(ctx, size);
      break;
    case "stripes-diag":
      drawDiagStripes(ctx, size);
      break;
    case "checker":
      drawChecker(ctx, size);
      break;
    case "vertical-bars":
      drawVerticalBars(ctx, size);
      break;
    case "radial-sun":
      drawSun(ctx, size);
      break;
    case "noise":
      drawNoise(ctx, size);
      break;
    case "spiral":
      drawSpiral(ctx, size);
      break;
    case "face-stylized":
      drawFaceStylized(ctx, size);
      break;
  }
  return canvas;
}

function drawConcentric(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#fbeee0";
  ctx.fillRect(0, 0, s, s);
  for (let r = s * 0.45; r > 4; r -= s * 0.05) {
    ctx.strokeStyle = `rgb(${181 + Math.round(Math.sin(r) * 30)}, 83, 42)`;
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDiagStripes(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#1f3a3a";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#9ed5c4";
  ctx.lineWidth = s * 0.06;
  for (let i = -s; i < s * 2; i += s * 0.18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + s, s);
    ctx.stroke();
  }
}

function drawChecker(ctx: CanvasRenderingContext2D, s: number) {
  const tile = s / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#1a1a18" : "#fafaf9";
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
}

function drawVerticalBars(ctx: CanvasRenderingContext2D, s: number) {
  const palette = ["#5a7e4a", "#3d5a2e", "#7a9a5a", "#2c4220", "#90a87a"];
  const bands = 14;
  const bandW = s / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect(i * bandW, 0, bandW, s);
  }
}

function drawSun(ctx: CanvasRenderingContext2D, s: number) {
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.55);
  grad.addColorStop(0, "#fffbe5");
  grad.addColorStop(0.4, "#f5cf4a");
  grad.addColorStop(1, "#b5532a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  // Rays
  ctx.strokeStyle = "#fff5b8";
  ctx.lineWidth = s * 0.014;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    ctx.beginPath();
    ctx.moveTo(s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18);
    ctx.lineTo(s / 2 + Math.cos(a) * s * 0.46, s / 2 + Math.sin(a) * s * 0.46);
    ctx.stroke();
  }
}

function drawNoise(ctx: CanvasRenderingContext2D, s: number) {
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = Math.floor(Math.random() * 256);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function drawSpiral(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#e8e4d6";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#3f3f3b";
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  for (let t = 0; t < Math.PI * 8; t += 0.05) {
    const r = (t / (Math.PI * 8)) * s * 0.42;
    const x = s / 2 + Math.cos(t) * r;
    const y = s / 2 + Math.sin(t) * r;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawFaceStylized(ctx: CanvasRenderingContext2D, s: number) {
  // Sky-ish background
  const grad = ctx.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, "#a9c8e2");
  grad.addColorStop(1, "#e8c8a0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  // Face circle
  ctx.fillStyle = "#f0d4a8";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2 + s * 0.05, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#1a1a18";
  ctx.beginPath();
  ctx.arc(s * 0.4, s * 0.46, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.6, s * 0.46, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  // Mouth
  ctx.strokeStyle = "#1a1a18";
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  ctx.arc(s / 2, s * 0.62, s * 0.10, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  // Hair
  ctx.fillStyle = "#3f3f3b";
  ctx.beginPath();
  ctx.ellipse(s / 2, s * 0.28, s * 0.30, s * 0.14, 0, 0, Math.PI);
  ctx.fill();
}

/* =====================================================================
   Heatmap colormap - clay-tinted, single hue ramp.
   Used by Layer Explorer feature maps.
   ===================================================================== */

const CMAP_LO: [number, number, number] = [252, 244, 238]; // accent-subtle (cream)
const CMAP_HI: [number, number, number] = [110, 50, 25];   // dark clay

/** Map a normalized [0, 1] value to an RGB triple. */
export function valueToHeatmap(v: number): [number, number, number] {
  const t = v < 0 ? 0 : v > 1 ? 1 : v;
  return [
    Math.round(CMAP_LO[0] + (CMAP_HI[0] - CMAP_LO[0]) * t),
    Math.round(CMAP_LO[1] + (CMAP_HI[1] - CMAP_LO[1]) * t),
    Math.round(CMAP_LO[2] + (CMAP_HI[2] - CMAP_LO[2]) * t),
  ];
}

/** Render a 2D heatmap (Float32Array of size width*height, any range)
 *  into the given canvas with auto-normalization. */
export function renderHeatmap(
  canvas: HTMLCanvasElement | null,
  data: Float32Array | number[],
  width: number,
  height: number
) {
  if (!canvas) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const t = (data[i] - lo) / span;
    const [r, g, b] = valueToHeatmap(t);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
