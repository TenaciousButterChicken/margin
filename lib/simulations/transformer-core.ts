// Transformer Explorer core — wraps @huggingface/transformers (which
// runs ONNX Runtime Web internally) for tokenization, GPT-2 small
// inference, and downstream math (softmax-with-temperature, sampling).
//
// Design:
//   • `loadModel` is invoked once at component mount via a progress
//     callback so the loading UI mirrors Layer Explorer's MobileNet
//     sequence ("Loading runtime…", "Downloading model…", "Initializing…").
//   • `runInference` returns tokens + logits + (when supported) per-layer
//     per-head attention. Standard Xenova/gpt2 ONNX exports do NOT
//     include attention as named outputs, so we always provide a fallback
//     attention matrix derived from the K tensors (which ARE exposed via
//     past_key_values). This is not exact softmax(Q·Kᵀ) — it's a
//     key-similarity heat we treat as a visualization proxy. Flagged
//     explicitly via `attentionSource` so the UI can be honest.
//   • Temperature math + sampling live here so the components stay thin.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProgressInfo } from "@huggingface/transformers";

export const MODEL_ID = "Xenova/gpt2";
export const NUM_LAYERS = 12;
export const NUM_HEADS = 12;
export const HEAD_DIM = 64; // 768 / 12

export type LoadProgress =
  | { stage: "runtime" }
  | { stage: "download"; pct: number; file?: string }
  | { stage: "initializing" }
  | { stage: "ready" };

export type AttentionSource = "model" | "key-similarity";

export type TokenInfo = {
  id: number;
  text: string; // human-readable (with leading-space marker resolved)
};

export type InferenceResult = {
  tokens: TokenInfo[];
  // Logits for the LAST token only — that's what predictions need.
  // Float32, length = vocab size.
  lastLogits: Float32Array;
  // attentions[layer][head] is a Float32Array of length seq * seq,
  // row-major: attn[i, j] = attentions[layer][head][i * seq + j].
  // i = "from" token (querying), j = "to" token (being attended to).
  // Causally masked (j > i is 0).
  attentions: Float32Array[][];
  attentionSource: AttentionSource;
  vocabSize: number;
};

let cached: {
  tokenizer: any;
  model: any;
  attentionSupported: boolean | null; // discovered on first run
} | null = null;

export async function loadModel(
  onProgress: (p: LoadProgress) => void
): Promise<void> {
  if (cached) {
    onProgress({ stage: "ready" });
    return;
  }

  onProgress({ stage: "runtime" });
  // Load transformers.js directly from a CDN as native browser ESM. We
  // tried bundling via webpack alias to `transformers.web.js`, but
  // Next.js's SWC loader runs before our `javascript/esm` rule and bails
  // on `import.meta` in the package. The `webpackIgnore` magic comment
  // tells webpack to leave this dynamic import alone and emit it
  // verbatim — the browser handles it natively. Same package, same
  // version we have in node_modules for type-checking.
  const transformersUrl =
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";
  const transformers = await import(/* webpackIgnore: true */ transformersUrl);
  const { AutoTokenizer, AutoModelForCausalLM, env } = transformers as any;

  // Force browser-cache; never look for local model files.
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  onProgress({ stage: "download", pct: 0 });

  const progressCallback = (info: ProgressInfo) => {
    // info: { status: 'downloading' | 'progress' | 'done' | 'ready' | 'initiate', file, progress (0-100) }
    const anyInfo = info as any;
    if (anyInfo.status === "progress" || anyInfo.status === "downloading") {
      onProgress({
        stage: "download",
        pct: typeof anyInfo.progress === "number" ? anyInfo.progress : 0,
        file: anyInfo.file,
      });
    } else if (anyInfo.status === "ready") {
      onProgress({ stage: "initializing" });
    }
  };

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
    progress_callback: progressCallback,
  });
  // Use the fp16 variant (`model_fp16.onnx`, ~250 MB). The q8/quantized
  // variant trips an ORT-Web optimizer bug for MatMulNBits; fp16 takes a
  // different code path and runs cleanly. Larger than our 125 MB target,
  // but the browser caches it after first load and the runtime still
  // executes on CPU/WASM.
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp16",
    device: "wasm",
    progress_callback: progressCallback,
  });

  cached = { tokenizer, model, attentionSupported: null };
  onProgress({ stage: "ready" });
}

/** Tokenize, run a single forward pass, return tokens + last-token logits
 *  + attention (real or proxy). */
export async function runInference(text: string): Promise<InferenceResult> {
  if (!cached) throw new Error("model not loaded");
  const { tokenizer, model } = cached;

  // Tokenize. transformers.js tokenizer call returns { input_ids, attention_mask }.
  const enc = await tokenizer(text, { return_tensor: true });
  const input_ids = enc.input_ids;
  const attention_mask = enc.attention_mask;

  // Pull the token IDs as a JS array for display.
  const ids: number[] = Array.from(input_ids.data as BigInt64Array, (b) => Number(b));
  const tokens: TokenInfo[] = ids.map((id) => ({
    id,
    text: prettyToken(tokenizer.decode([id], { skip_special_tokens: false })),
  }));

  // Forward pass with attention requested. Even if the ONNX doesn't
  // expose attention nodes, we ALWAYS get back logits + past_key_values.
  const outputs: any = await model({
    input_ids,
    attention_mask,
    output_attentions: true,
  });

  const seq = ids.length;
  const vocab = outputs.logits.dims[2] as number;

  // Last-token logits, shape [1, seq, vocab] → grab row seq-1.
  const logitsData = outputs.logits.data as Float32Array;
  const lastLogits = new Float32Array(vocab);
  const offset = (seq - 1) * vocab;
  for (let i = 0; i < vocab; i++) lastLogits[i] = logitsData[offset + i];

  // ---- Attention extraction ----
  const attentionMatrices = extractAttentions(outputs, seq);
  let attentions: Float32Array[][];
  let attentionSource: AttentionSource;
  if (attentionMatrices) {
    attentions = attentionMatrices;
    attentionSource = "model";
    if (cached.attentionSupported === null) cached.attentionSupported = true;
  } else {
    // Fallback: compute key-similarity from past_key_values (shape per
    // layer: [1, num_heads, seq, head_dim]). We compute K·Kᵀ / √d, mask
    // causally, and softmax-normalize per row. This isn't real softmax(QKᵀ)
    // — it's a key-key affinity that uses real GPT-2 internal state and
    // gives a meaningful per-head visualization while we wait for a custom
    // ONNX export that exposes the true attention tensors.
    attentions = computeKeySimilarityAttentions(outputs, seq);
    attentionSource = "key-similarity";
    if (cached.attentionSupported === null) cached.attentionSupported = false;
  }

  return {
    tokens,
    lastLogits,
    attentions,
    attentionSource,
    vocabSize: vocab,
  };
}

/** Look for `decoder_attentions` / `attentions` in the model output —
 *  transformers.js (and the underlying ONNX graph) may or may not include
 *  them depending on how the model was exported. */
function extractAttentions(outputs: any, seq: number): Float32Array[][] | null {
  // transformers.js's getAttentions() puts these under `decoder_attentions`
  // when present. Also accept flat names `attentions.X` just in case.
  let raw: any[] | null = null;
  if (Array.isArray(outputs.decoder_attentions)) {
    raw = outputs.decoder_attentions;
  } else if (Array.isArray(outputs.attentions)) {
    raw = outputs.attentions;
  } else {
    // Look for keys like 'present.0.attentions' as a long-shot.
    const keys = Object.keys(outputs).filter((k) =>
      /attentions?\.?\d+/.test(k) || k.endsWith("_attentions")
    );
    if (keys.length === 0) return null;
    // Sort numerically by the digit found in the key.
    keys.sort((a, b) => {
      const aN = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const bN = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return aN - bN;
    });
    raw = keys.map((k) => outputs[k]);
  }
  if (!raw || raw.length === 0) return null;

  // Each entry is a Tensor of shape [batch=1, heads, seq, seq].
  const layers: Float32Array[][] = [];
  for (const t of raw) {
    if (!t || !t.dims || !t.data) return null;
    const dims = t.dims as number[];
    if (dims.length !== 4) return null;
    const heads = dims[1];
    const data = t.data as Float32Array;
    const headBlocks: Float32Array[] = [];
    for (let h = 0; h < heads; h++) {
      const out = new Float32Array(seq * seq);
      // tensor stride: batch*heads*seq*seq with batch=1
      const headOff = h * seq * seq;
      for (let i = 0; i < seq * seq; i++) out[i] = data[headOff + i];
      headBlocks.push(out);
    }
    layers.push(headBlocks);
  }
  return layers;
}

/** Fallback attention approximation using K·Kᵀ from past_key_values.
 *  Returns a 12×12 array of [seq*seq] matrices, normalized per row with
 *  causal masking — same shape contract as real attention so the UI is
 *  oblivious. */
function computeKeySimilarityAttentions(outputs: any, seq: number): Float32Array[][] {
  const layers: Float32Array[][] = [];
  // past_key_values may be a DynamicCache wrapper or a flat object.
  const pkv = outputs.past_key_values;
  for (let li = 0; li < NUM_LAYERS; li++) {
    const headBlocks: Float32Array[] = [];
    const kTensor = pickKeyTensor(pkv, outputs, li);
    if (!kTensor) {
      // No key tensor available — emit zeros so the graph still has shape
      // and the UI shows "no attention" gracefully.
      for (let h = 0; h < NUM_HEADS; h++) {
        headBlocks.push(new Float32Array(seq * seq));
      }
      layers.push(headBlocks);
      continue;
    }
    const kData = kTensor.data as Float32Array;
    const kDims = kTensor.dims as number[]; // expected [1, heads, seq, head_dim]
    const heads = kDims[1];
    const sLen = kDims[2];
    const dHead = kDims[3];
    const scale = 1 / Math.sqrt(dHead);

    for (let h = 0; h < heads; h++) {
      const out = new Float32Array(seq * seq);
      // k[h, i, :] dot k[h, j, :], for i, j in [0, sLen)
      // Row indexing: head h, position i, dim d
      // offset = ((0 * heads + h) * sLen + i) * dHead + d
      for (let i = 0; i < seq; i++) {
        // Causal: only positions 0..i can be attended to.
        let rowSum = 0;
        const scores: number[] = new Array(seq).fill(-Infinity);
        const iOff = (h * sLen + i) * dHead;
        for (let j = 0; j <= i; j++) {
          const jOff = (h * sLen + j) * dHead;
          let dot = 0;
          for (let d = 0; d < dHead; d++) dot += kData[iOff + d] * kData[jOff + d];
          scores[j] = dot * scale;
        }
        // Softmax over scores (only the first i+1 are finite).
        let max = -Infinity;
        for (let j = 0; j <= i; j++) if (scores[j] > max) max = scores[j];
        for (let j = 0; j <= i; j++) {
          const e = Math.exp(scores[j] - max);
          scores[j] = e;
          rowSum += e;
        }
        if (rowSum > 0) {
          for (let j = 0; j <= i; j++) out[i * seq + j] = scores[j] / rowSum;
        } else if (i >= 0) {
          out[i * seq + i] = 1; // degenerate row → self-attend
        }
      }
      headBlocks.push(out);
    }
    layers.push(headBlocks);
  }
  return layers;
}

/** Past-key-values come back in different shapes depending on how
 *  transformers.js packaged them. Try the common layouts. */
function pickKeyTensor(pkv: any, outputs: any, layer: number): any | null {
  if (!pkv) {
    // Maybe flat under outputs as 'present.X.key'
    const k = outputs[`present.${layer}.key`];
    return k ?? null;
  }
  // DynamicCache: pkv.key_cache?.[layer]
  if (pkv.key_cache && pkv.key_cache[layer]) return pkv.key_cache[layer];
  // Tuple of tuples: pkv[layer]?.[0] is K
  if (Array.isArray(pkv) && pkv[layer]) return pkv[layer][0] ?? null;
  // Flat: pkv[`past_key_values.X.key`]
  const flat = pkv[`past_key_values.${layer}.key`];
  if (flat) return flat;
  return null;
}

/** GPT-2 BPE tokens use leading "Ġ" to mark word-initial space. Translate
 *  for display so users see "the" with a leading space rather than "Ġthe". */
export function prettyToken(raw: string): string {
  // The decode() path usually already converts Ġ to a space, but in case
  // the tokenizer hands us raw BPE we normalize here.
  return raw
    .replace(/^Ġ/, " ")
    .replace(/^Ċ/, "\n")
    .replace(/Ġ/g, " ")
    .replace(/Ċ/g, "\n");
}

/* =====================================================================
   Probability math
   ===================================================================== */

/** softmax(logits / T). Returns a new Float32Array of the same length. */
export function softmaxWithTemperature(logits: Float32Array, T: number): Float32Array {
  const safeT = Math.max(T, 1e-3);
  const out = new Float32Array(logits.length);
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    const v = logits[i] / safeT;
    if (v > max) max = v;
  }
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] / safeT - max);
    out[i] = e;
    sum += e;
  }
  if (sum > 0) {
    for (let i = 0; i < logits.length; i++) out[i] /= sum;
  }
  return out;
}

/** Top-K indices + their probabilities, sorted descending. */
export function topK(probs: Float32Array, k: number): { index: number; prob: number }[] {
  // Simple partial sort: walk once and maintain a heap-of-size-k. For
  // GPT-2's 50257 vocab and k=10 a full sort is fine and clearer.
  const indexed: { index: number; prob: number }[] = new Array(probs.length);
  for (let i = 0; i < probs.length; i++) indexed[i] = { index: i, prob: probs[i] };
  indexed.sort((a, b) => b.prob - a.prob);
  return indexed.slice(0, k);
}

/** Sample a single index from a probability distribution. */
export function sampleFromDistribution(probs: Float32Array): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return probs.length - 1;
}

/** Decode a single token id to its text via the cached tokenizer. */
export async function decodeTokenId(id: number): Promise<string> {
  if (!cached) throw new Error("model not loaded");
  const raw = cached.tokenizer.decode([id], { skip_special_tokens: false });
  return prettyToken(raw);
}
