// Embedding visualizer core. Loads the pre-extracted GPT-2 wte matrix
// (50,257 × 768, fp16) and PCA-projected 2D coordinates as static
// binaries. Provides:
//   • single-token resolution: "king" → token id 6242
//   • nearest-neighbor search in full 768D cosine space
//   • vector arithmetic: a − b + c → top-K nearest token ids
//   • access to 2D coords for plotting
//
// The full 77 MB fp16 matrix is fetched lazily — the visualizer can show
// the scatter plot from coords alone (~400 KB) and only pulls embeddings
// on the first interaction that needs 768D math.

const VOCAB_URL = "/embeddings/gpt2-vocab.json";
const COORDS_URL = "/embeddings/gpt2-coords-pca-2d.fp32.bin";
const EMBEDDINGS_URL = "/embeddings/gpt2-embeddings.fp16.bin";

export const VOCAB_SIZE = 50257;
export const HIDDEN = 768;

let vocabCache: string[] | null = null;
let vocabIndexCache: Map<string, number> | null = null;
let coordsCache: Float32Array | null = null; // length 50257*2
let embeddingsCache: Float32Array | null = null; // length 50257*768 (decoded from fp16)
let embeddingNorms: Float32Array | null = null; // length 50257, ||row_i||

export type LoadProgress = { loaded: number; total: number };

/** Fetch + cache the vocab list. ~520 KB. */
export async function loadVocab(): Promise<string[]> {
  if (vocabCache) return vocabCache;
  const res = await fetch(VOCAB_URL);
  if (!res.ok) throw new Error(`vocab fetch failed: ${res.status}`);
  vocabCache = (await res.json()) as string[];
  if (vocabCache.length !== VOCAB_SIZE) {
    // eslint-disable-next-line no-console
    console.warn(`vocab length ${vocabCache.length}, expected ${VOCAB_SIZE}`);
  }
  // Build a string→id map for fast lookup. The vocab includes leading-space
  // forms (" king", " woman") AND no-space forms ("king", "woman"). We
  // index BOTH variants pointing at their respective ids; lookup tries
  // " word" first (more common in mid-sentence position) then "word".
  vocabIndexCache = new Map();
  for (let i = 0; i < vocabCache.length; i++) {
    const w = vocabCache[i];
    if (w === "" || vocabIndexCache.has(w)) continue;
    vocabIndexCache.set(w, i);
  }
  return vocabCache;
}

/** Fetch + cache the 2D PCA coordinates. ~400 KB. */
export async function loadCoords(): Promise<Float32Array> {
  if (coordsCache) return coordsCache;
  const res = await fetch(COORDS_URL);
  if (!res.ok) throw new Error(`coords fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  coordsCache = new Float32Array(buf);
  return coordsCache;
}

/** Fetch + cache the full fp16 embeddings. ~77 MB.
 *
 *  We decode fp16→fp32 once on load and keep the result in memory so
 *  cosine math is plain dot products. Decoding is ~2-3 seconds on a
 *  modern machine. Optionally accepts a progress callback. */
export async function loadEmbeddings(
  onProgress?: (p: LoadProgress) => void
): Promise<Float32Array> {
  if (embeddingsCache) return embeddingsCache;
  const res = await fetch(EMBEDDINGS_URL);
  if (!res.ok) throw new Error(`embeddings fetch failed: ${res.status}`);
  const total = parseInt(res.headers.get("Content-Length") ?? "0", 10);

  // Stream so we can report progress.
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (onProgress) onProgress({ loaded, total });
    }
  } else {
    const buf = new Uint8Array(await res.arrayBuffer());
    chunks.push(buf);
    loaded = buf.length;
    if (onProgress) onProgress({ loaded, total });
  }

  // Concatenate.
  const all = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.length;
  }

  // Decode fp16 → fp32. There's no native typed array for fp16 in older
  // browsers; decode manually.
  const fp16 = new Uint16Array(all.buffer, all.byteOffset, all.byteLength / 2);
  const fp32 = new Float32Array(fp16.length);
  for (let i = 0; i < fp16.length; i++) {
    fp32[i] = halfToFloat(fp16[i]);
  }
  embeddingsCache = fp32;

  // Pre-compute row norms once for fast cosine.
  embeddingNorms = new Float32Array(VOCAB_SIZE);
  for (let i = 0; i < VOCAB_SIZE; i++) {
    let s = 0;
    const off = i * HIDDEN;
    for (let d = 0; d < HIDDEN; d++) {
      const v = fp32[off + d];
      s += v * v;
    }
    embeddingNorms[i] = Math.sqrt(s) || 1e-9;
  }
  return fp32;
}

/** Try to find a token id for a user-typed word. Tries (in order):
 *   1. " word" — leading-space (most common form in BPE)
 *   2. "word"  — no-space form (sentence-initial)
 *   3. capitalized variants
 *  Returns null if every variant maps to multi-token. */
export function findTokenId(word: string): number | null {
  if (!vocabIndexCache) return null;
  const w = word.trim();
  if (!w) return null;
  const candidates = [
    " " + w,
    w,
    " " + w.charAt(0).toUpperCase() + w.slice(1),
    w.charAt(0).toUpperCase() + w.slice(1),
    " " + w.toLowerCase(),
    w.toLowerCase(),
  ];
  for (const c of candidates) {
    const id = vocabIndexCache.get(c);
    if (id !== undefined) return id;
  }
  return null;
}

/** Get the displayable form of a token id. */
export function vocabAt(id: number): string {
  return vocabCache?.[id] ?? "";
}

/** Top-K nearest neighbors of a token id by cosine similarity in 768D.
 *  Skips the token itself unless `includeSelf` is true. */
export function nearestNeighbors(
  tokenId: number,
  k: number,
  includeSelf = false
): { id: number; sim: number }[] {
  if (!embeddingsCache || !embeddingNorms) return [];
  const oa = tokenId * HIDDEN;
  const queryNorm = embeddingNorms[tokenId];
  // Compute all 50257 cosine values, then partial-sort top-k.
  const sims = new Float32Array(VOCAB_SIZE);
  for (let i = 0; i < VOCAB_SIZE; i++) {
    if (!includeSelf && i === tokenId) {
      sims[i] = -Infinity;
      continue;
    }
    let dot = 0;
    const oi = i * HIDDEN;
    for (let d = 0; d < HIDDEN; d++) dot += embeddingsCache[oa + d] * embeddingsCache[oi + d];
    sims[i] = dot / (queryNorm * embeddingNorms[i]);
  }
  return topK(sims, k);
}

/** Vector arithmetic: returns top-K tokens nearest (a − b + c) by cosine.
 *  Skips a, b, c from results. */
export function vectorArithmetic(
  aId: number,
  bId: number,
  cId: number,
  k: number
): { id: number; sim: number }[] {
  if (!embeddingsCache || !embeddingNorms) return [];
  const target = new Float32Array(HIDDEN);
  const oa = aId * HIDDEN;
  const ob = bId * HIDDEN;
  const oc = cId * HIDDEN;
  for (let d = 0; d < HIDDEN; d++) {
    target[d] = embeddingsCache[oa + d] - embeddingsCache[ob + d] + embeddingsCache[oc + d];
  }
  let tNorm = 0;
  for (let d = 0; d < HIDDEN; d++) tNorm += target[d] * target[d];
  tNorm = Math.sqrt(tNorm) || 1e-9;

  const skip = new Set([aId, bId, cId]);
  const sims = new Float32Array(VOCAB_SIZE);
  for (let i = 0; i < VOCAB_SIZE; i++) {
    if (skip.has(i)) {
      sims[i] = -Infinity;
      continue;
    }
    let dot = 0;
    const oi = i * HIDDEN;
    for (let d = 0; d < HIDDEN; d++) dot += target[d] * embeddingsCache[oi + d];
    sims[i] = dot / (tNorm * embeddingNorms[i]);
  }
  return topK(sims, k);
}

/** Read PCA coordinates for a token. */
export function coordsFor(id: number): [number, number] {
  if (!coordsCache) return [0, 0];
  return [coordsCache[id * 2], coordsCache[id * 2 + 1]];
}

/** Bounds of the full PCA projection — used to scale the scatter plot. */
export function coordsBounds(): { xmin: number; xmax: number; ymin: number; ymax: number } {
  if (!coordsCache) return { xmin: 0, xmax: 1, ymin: 0, ymax: 1 };
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < VOCAB_SIZE; i++) {
    const x = coordsCache[i * 2];
    const y = coordsCache[i * 2 + 1];
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  return { xmin, xmax, ymin, ymax };
}

function topK(values: Float32Array, k: number): { id: number; sim: number }[] {
  // Simple full sort — k small, vocab fits in memory cheaply.
  const indexed = new Array<{ id: number; sim: number }>(values.length);
  for (let i = 0; i < values.length; i++) indexed[i] = { id: i, sim: values[i] };
  indexed.sort((a, b) => b.sim - a.sim);
  return indexed.slice(0, k);
}

/** Decode an IEEE 754 fp16 (uint16) to a JS number (fp32). */
function halfToFloat(h: number): number {
  const sign = (h >> 15) & 0x1;
  const exp = (h >> 10) & 0x1f;
  const frac = h & 0x3ff;
  if (exp === 0) {
    if (frac === 0) return sign ? -0 : 0;
    // subnormal
    const v = (frac / 1024) * Math.pow(2, -14);
    return sign ? -v : v;
  }
  if (exp === 0x1f) {
    if (frac === 0) return sign ? -Infinity : Infinity;
    return NaN;
  }
  const v = (1 + frac / 1024) * Math.pow(2, exp - 15);
  return sign ? -v : v;
}
