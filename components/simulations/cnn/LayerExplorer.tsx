"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateLayerExplorerImage,
  LAYER_EXPLORER_IMAGES,
  renderHeatmap,
  type LayerExplorerImageKind,
} from "@/lib/simulations/cnn-core";

// Layer Explorer — runs MobileNet (TF.js) on a chosen image and shows
// activations from 4 representative intermediate layers, plus the top-3
// final classification predictions.

const NUM_FEATURE_MAPS_PER_LAYER = 16; // first N channels per layer
const FEATURE_MAP_PX = 60;             // small thumbnail size in CSS px
const FEATURE_GRID_COLS = 4;           // 4×4 grid of mini heatmaps
const SELECTED_IMAGE_PX = 200;
const NUM_LAYERS_TO_SHOW = 4;
const TOP_K_PREDICTIONS = 3;

type ModelState = "idle" | "loading" | "ready" | "error";

// Lazy types — only imported at runtime when this component mounts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tf = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MobileNetInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeatureModel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tensor = any;

type LayerActivation = {
  layerName: string;
  height: number;
  width: number;
  channels: number;
  // Per-channel 2D arrays, length = NUM_FEATURE_MAPS_PER_LAYER.
  // Each entry is a Float32Array of size height*width.
  maps: Float32Array[];
};

type Prediction = { className: string; probability: number };

export function LayerExplorer() {
  const [imageKind, setImageKind] = useState<LayerExplorerImageKind>("face-stylized");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelProgress, setModelProgress] = useState<string>("");
  const [activations, setActivations] = useState<LayerActivation[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [expanded, setExpanded] = useState<{ layerIdx: number; channelIdx: number } | null>(null);

  const tfRef = useRef<Tf | null>(null);
  const modelRef = useRef<MobileNetInstance | null>(null);
  const featureModelRef = useRef<FeatureModel | null>(null);
  const layerNamesRef = useRef<string[]>([]);

  const selectedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /* -------- Load MobileNet (lazily, on mount) -----------------------
   *
   * Two parallel loads:
   *   • @tensorflow-models/mobilenet — wraps a GraphModel that has
   *     classify() with built-in ImageNet labels. We only use it for
   *     top-K predictions.
   *   • tf.loadLayersModel(...)      — a LayersModel of MobileNet v1
   *     1.0 224. Same weights as the wrapper, different format. Layers
   *     models expose an array of named layers with .output symbolic
   *     tensors, which is what we need to construct an intermediate-
   *     activation extractor via tf.model({ inputs, outputs }).
   *
   * The two downloads run in parallel via Promise.all, so wall-clock
   * is roughly one model load.
   */

  useEffect(() => {
    let cancelled = false;
    setModelState("loading");
    setModelProgress("loading TensorFlow.js…");

    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        if (cancelled) return;

        setModelProgress("loading MobileNet (~17 MB, one-time)…");
        const mobilenet = await import("@tensorflow-models/mobilenet");

        const [classifierWrapper, layersModel] = await Promise.all([
          mobilenet.load({ version: 1, alpha: 1.0 }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (tf as any).loadLayersModel(
            "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json"
          ),
        ]);
        if (cancelled) return;

        // Walk the LayersModel's layer list and pick four 4D-output
        // layers spanning early → late.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layers = (layersModel as any).layers as Array<{
          name: string;
          outputShape: unknown;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output: any;
        }>;

        if (!Array.isArray(layers) || layers.length === 0) {
          throw new Error("LayersModel has no .layers array");
        }

        const candidates = layers.filter((l) => {
          const s = l.outputShape;
          return (
            Array.isArray(s) &&
            s.length === 4 &&
            typeof s[3] === "number" &&
            (s[3] as number) >= 16
          );
        });

        if (candidates.length < NUM_LAYERS_TO_SHOW) {
          throw new Error(
            `expected ≥${NUM_LAYERS_TO_SHOW} conv-shaped layers, got ${candidates.length}`
          );
        }

        const picks: typeof candidates = [];
        const fractions = [0.04, 0.30, 0.65, 0.95];
        for (const f of fractions) {
          const idx = Math.min(candidates.length - 1, Math.floor(candidates.length * f));
          picks.push(candidates[idx]);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const featureModel = (tf as any).model({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputs: (layersModel as any).inputs,
          outputs: picks.map((l) => l.output),
        });

        if (cancelled) return;

        tfRef.current = tf;
        modelRef.current = classifierWrapper;
        featureModelRef.current = featureModel;
        layerNamesRef.current = picks.map((l) => prettyLayerName(l.name));
        setModelState("ready");
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error("[LayerExplorer] model load failed", err);
          setModelState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Render the selected image to its preview canvas -------- */

  useEffect(() => {
    const target = selectedCanvasRef.current;
    if (!target) return;
    const src = generateLayerExplorerImage(imageKind, 224);
    target.width = SELECTED_IMAGE_PX;
    target.height = SELECTED_IMAGE_PX;
    const ctx = target.getContext("2d");
    if (ctx) {
      ctx.drawImage(src, 0, 0, SELECTED_IMAGE_PX, SELECTED_IMAGE_PX);
    }
  }, [imageKind]);

  /* -------- Run inference whenever ready + image is selected -------- */

  useEffect(() => {
    if (modelState !== "ready") return;
    let cancelled = false;
    setExpanded(null);

    (async () => {
      const tf = tfRef.current;
      const model = modelRef.current;
      const featureModel = featureModelRef.current;
      if (!tf || !model || !featureModel) return;

      // Render the chosen preset image to a 224×224 canvas, then feed it
      // to MobileNet. Each call disposes its tensors — TF.js is leaky
      // otherwise.
      const sourceCanvas = generateLayerExplorerImage(imageKind, 224);

      const inputTensor = tf.tidy(() => {
        const t = tf.browser.fromPixels(sourceCanvas);
        const resized = tf.image.resizeBilinear(t, [224, 224]);
        // MobileNet preprocessing: scale to [-1, 1]
        const normalized = resized.toFloat().div(127.5).sub(1);
        return normalized.expandDims(0);
      });

      try {
        // 1. Top-K classification using the model's own helper
        const preds = await model.classify(sourceCanvas, TOP_K_PREDICTIONS);
        if (cancelled) {
          inputTensor.dispose();
          return;
        }
        setPredictions(preds);

        // 2. Feature maps via the multi-output extractor
        const acts = featureModel.predict(inputTensor) as Tensor[];
        const layerData: LayerActivation[] = [];
        for (let i = 0; i < acts.length; i++) {
          const t: Tensor = acts[i];
          const shape = t.shape as number[]; // [1, H, W, C]
          const H = shape[1];
          const W = shape[2];
          const C = shape[3];
          const data = (await t.data()) as Float32Array;
          // Slice into per-channel 2D arrays for the first N channels.
          const channels = Math.min(C, NUM_FEATURE_MAPS_PER_LAYER);
          const maps: Float32Array[] = [];
          for (let c = 0; c < channels; c++) {
            const arr = new Float32Array(H * W);
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                // tensor data is in NHWC order: index = y*W*C + x*C + c
                arr[y * W + x] = data[y * W * C + x * C + c];
              }
            }
            maps.push(arr);
          }
          layerData.push({
            layerName: layerNamesRef.current[i] ?? `Layer ${i + 1}`,
            height: H,
            width: W,
            channels: C,
            maps,
          });
        }

        // Cleanup
        for (const t of acts) t.dispose();
        inputTensor.dispose();

        if (!cancelled) setActivations(layerData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[LayerExplorer] inference error", err);
        inputTensor.dispose();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageKind, modelState]);

  /* -------- Render --------------------------------------------------- */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Image picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={metaLabel}>IMAGE</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LAYER_EXPLORER_IMAGES.map((opt) => (
            <ImageThumbnailTile
              key={opt.kind}
              kind={opt.kind}
              label={opt.label}
              active={opt.kind === imageKind}
              onClick={() => setImageKind(opt.kind)}
            />
          ))}
        </div>
      </div>

      {/* Selected image + state */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: SELECTED_IMAGE_PX,
            height: SELECTED_IMAGE_PX,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--neutral-200)",
            background: "var(--neutral-100)",
            position: "relative",
          }}
        >
          <canvas
            ref={selectedCanvasRef}
            width={SELECTED_IMAGE_PX}
            height={SELECTED_IMAGE_PX}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Model state banner */}
      {modelState !== "ready" && <ModelBanner state={modelState} progress={modelProgress} />}

      {/* Layer cards */}
      {modelState === "ready" && activations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={metaLabel}>FEATURE MAPS — first {NUM_FEATURE_MAPS_PER_LAYER} channels per layer</span>
          {expanded === null ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${NUM_LAYERS_TO_SHOW}, 1fr)`,
                gap: 12,
              }}
            >
              {activations.map((layer, layerIdx) => (
                <LayerCard
                  key={layerIdx}
                  layer={layer}
                  layerIdx={layerIdx}
                  onChannelClick={(channelIdx) => setExpanded({ layerIdx, channelIdx })}
                />
              ))}
            </div>
          ) : (
            <ExpandedView
              layer={activations[expanded.layerIdx]}
              layerIdx={expanded.layerIdx}
              channelIdx={expanded.channelIdx}
              onClose={() => setExpanded(null)}
              onPickChannel={(channelIdx) => setExpanded({ ...expanded, channelIdx })}
            />
          )}
        </div>
      )}

      {/* Predictions */}
      {modelState === "ready" && predictions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={metaLabel}>TOP-{predictions.length} PREDICTION (MOBILENET)</span>
          <PredictionBars predictions={predictions} />
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Subcomponents
   ===================================================================== */

const metaLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--neutral-500)",
  letterSpacing: 0.6,
};

function ModelBanner({ state, progress }: { state: ModelState; progress: string }) {
  if (state === "error") {
    return (
      <div
        style={{
          padding: "14px 18px",
          background: "var(--accent-subtle)",
          border: "1px solid var(--accent)",
          borderRadius: 10,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--neutral-900)",
          textAlign: "center",
        }}
      >
        Couldn&rsquo;t load MobileNet. Check your network connection and reload the page.
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--neutral-50)",
        border: "1px dashed var(--neutral-300)",
        borderRadius: 10,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-700)",
        textAlign: "center",
      }}
    >
      {progress}
    </div>
  );
}

function ImageThumbnailTile({
  kind,
  label,
  active,
  onClick,
}: {
  kind: LayerExplorerImageKind;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const src = generateLayerExplorerImage(kind, 96);
    const target = canvasRef.current;
    if (!target) return;
    target.width = 72;
    target.height = 72;
    const ctx = target.getContext("2d");
    if (ctx) ctx.drawImage(src, 0, 0, 72, 72);
  }, [kind]);
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--neutral-0)" : "var(--neutral-50)",
        border: "1px solid",
        borderColor: active ? "var(--accent)" : "var(--neutral-200)",
        borderRadius: 8,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        cursor: "pointer",
        transition: "border-color 120ms",
      }}
    >
      <canvas
        ref={canvasRef}
        width={72}
        height={72}
        style={{
          width: 72,
          height: 72,
          borderRadius: 4,
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          fontWeight: active ? 600 : 400,
          color: active ? "var(--accent)" : "var(--neutral-700)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function LayerCard({
  layer,
  layerIdx,
  onChannelClick,
}: {
  layer: LayerActivation;
  layerIdx: number;
  onChannelClick: (channelIdx: number) => void;
}) {
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-900)" }}>
          Layer {layerIdx + 1}
        </span>
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          {layer.layerName} · {layer.height}×{layer.width}×{layer.channels}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${FEATURE_GRID_COLS}, 1fr)`,
          gap: 4,
        }}
      >
        {layer.maps.map((map, c) => (
          <FeatureMapMini
            key={c}
            data={map}
            width={layer.width}
            height={layer.height}
            onClick={() => onChannelClick(c)}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureMapMini({
  data,
  width,
  height,
  onClick,
}: {
  data: Float32Array;
  width: number;
  height: number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    renderHeatmap(ref.current, data, width, height);
  }, [data, width, height]);
  return (
    <button
      onClick={onClick}
      style={{
        padding: 0,
        background: "none",
        border: "1px solid var(--neutral-200)",
        borderRadius: 4,
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 120ms, transform 120ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
    >
      <canvas
        ref={ref}
        width={width}
        height={height}
        style={{
          display: "block",
          width: FEATURE_MAP_PX,
          height: FEATURE_MAP_PX,
          imageRendering: "pixelated",
        }}
      />
    </button>
  );
}

function ExpandedView({
  layer,
  layerIdx,
  channelIdx,
  onClose,
  onPickChannel,
}: {
  layer: LayerActivation;
  layerIdx: number;
  channelIdx: number;
  onClose: () => void;
  onPickChannel: (i: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    renderHeatmap(ref.current, layer.maps[channelIdx], layer.width, layer.height);
  }, [layer, channelIdx]);

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
            Layer {layerIdx + 1} · channel {channelIdx}
          </span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            {layer.layerName} · {layer.height}×{layer.width} per channel
          </span>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          ← back to grid
        </button>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <canvas
          ref={ref}
          width={layer.width}
          height={layer.height}
          style={{
            width: 280,
            height: 280,
            imageRendering: "pixelated",
            borderRadius: 8,
            border: "1px solid var(--neutral-200)",
          }}
        />
        {/* Mini-grid of all channels for quick switching */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${FEATURE_GRID_COLS}, 1fr)`,
            gap: 4,
          }}
        >
          {layer.maps.map((map, c) => (
            <FeatureMapMini
              key={c}
              data={map}
              width={layer.width}
              height={layer.height}
              onClick={() => onPickChannel(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PredictionBars({ predictions }: { predictions: Prediction[] }) {
  const max = Math.max(...predictions.map((p) => p.probability), 0.01);
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {predictions.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? "var(--neutral-900)" : "var(--neutral-700)",
              minWidth: 200,
            }}
          >
            {p.className}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: "var(--neutral-100)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(p.probability / max) * 100}%`,
                background: i === 0 ? "var(--accent)" : "var(--lab-cyan)",
                borderRadius: 4,
                transition: "width 200ms ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? "var(--accent)" : "var(--neutral-500)",
              minWidth: 50,
              textAlign: "right",
            }}
          >
            {(p.probability * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function prettyLayerName(name: string): string {
  // Most MobileNet layer names are like "expanded_conv_3_project_BN" or
  // "Conv1_relu" — keep them but trim some suffixes.
  return name
    .replace(/_BN$/i, "")
    .replace(/_project$/i, "")
    .replace(/_/g, " ");
}
