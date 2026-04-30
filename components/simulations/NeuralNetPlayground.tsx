"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  classificationToSamples,
  CLASSIFICATION_INPUT_DOMAIN,
  generateClassificationDataset,
  generateRegressionDataset,
  loss as computeLoss,
  Network,
  REGRESSION_INPUT_DOMAIN,
  REGRESSION_Y_DOMAIN,
  regressionToSamples,
  sampleBatch,
  type ActivationKind,
  type ClassificationDatasetKind,
  type ClassificationPoint,
  type NetSample,
  type RegressionDatasetKind,
  type RegressionPoint,
} from "@/lib/simulations/nn-core";

/* =====================================================================
   Constants
   ===================================================================== */

const PLOT_PX = 420;
const BOUNDARY_RES_PLAY = 50;
const BOUNDARY_RES_PAUSED = 100;
const THUMB_2D_RES = 16;            // classification: 16x16 heatmap
const THUMB_1D_SAMPLES = 32;        // regression: 32 points along x
const BATCH_SIZE = 16;
const TICK_MS = 33;
const THUMB_UPDATE_EVERY = 5;
const STATE_UPDATE_EVERY = 3;

const MAX_LAYERS = 4;
const MIN_LAYERS = 1;
const MAX_NEURONS_PER_LAYER = 8;
const MIN_NEURONS_PER_LAYER = 1;

type Mode = "classification" | "regression";

const CLASSIFICATION_DATASETS: { kind: ClassificationDatasetKind; label: string }[] = [
  { kind: "clusters", label: "Clusters" },
  { kind: "circles", label: "Circles" },
  { kind: "spirals", label: "Spirals" },
  { kind: "xor", label: "XOR" },
];

const REGRESSION_DATASETS: { kind: RegressionDatasetKind; label: string }[] = [
  { kind: "sine", label: "Sine" },
  { kind: "step", label: "Step" },
  { kind: "sawtooth", label: "Sawtooth" },
  { kind: "bump", label: "Bump" },
];

const ORANGE: [number, number, number] = [181, 83, 42]; // --accent
const BLUE: [number, number, number] = [8, 145, 178]; // --lab-cyan

/* =====================================================================
   Top-level component
   ===================================================================== */

export function NeuralNetPlayground() {
  const [mode, setMode] = useState<Mode>("classification");
  const [classificationKind, setClassificationKind] = useState<ClassificationDatasetKind>("spirals");
  const [regressionKind, setRegressionKind] = useState<RegressionDatasetKind>("sine");
  const [hiddenSizes, setHiddenSizes] = useState<number[]>([4, 4]);
  const [activation, setActivation] = useState<ActivationKind>("tanh");
  const [learningRate, setLearningRate] = useState(0.03);
  const [isPlaying, setIsPlaying] = useState(false);

  const [epochDisplay, setEpochDisplay] = useState(0);
  const [lossDisplay, setLossDisplay] = useState(NaN);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  // Network - synchronously rebuilt on architecture/activation/mode change.
  const network = useMemo(
    () =>
      new Network(
        hiddenSizes,
        activation,
        mode === "regression"
          ? { numInputs: 1, outputKind: "linear" }
          : { numInputs: 2, outputKind: "tanh" }
      ),
    [hiddenSizes, activation, mode]
  );
  const networkRef = useRef<Network>(network);
  networkRef.current = network;

  // Active dataset (typed) + samples for training.
  const [classificationData, setClassificationData] = useState<ClassificationPoint[]>([]);
  const [regressionData, setRegressionData] = useState<RegressionPoint[]>([]);

  const samples: NetSample[] = useMemo(
    () =>
      mode === "classification"
        ? classificationToSamples(classificationData)
        : regressionToSamples(regressionData),
    [mode, classificationData, regressionData]
  );
  const samplesRef = useRef<NetSample[]>(samples);
  samplesRef.current = samples;

  // Regenerate dataset when mode or kind changes.
  useEffect(() => {
    if (mode === "classification") {
      setClassificationData(generateClassificationDataset(classificationKind));
    } else {
      setRegressionData(generateRegressionDataset(regressionKind));
    }
    setIsPlaying(false);
  }, [mode, classificationKind, regressionKind]);

  // Reset training state on network rebuild.
  const epochRef = useRef(0);
  const tickCountRef = useRef(0);
  const learningRateRef = useRef(learningRate);
  useEffect(() => {
    learningRateRef.current = learningRate;
  }, [learningRate]);

  useEffect(() => {
    epochRef.current = 0;
    tickCountRef.current = 0;
    setEpochDisplay(0);
    setLossDisplay(NaN);
    setLossHistory([]);
    setIsPlaying(false);
  }, [network]);

  // Imperative-render targets
  const boundaryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const regressionPathRef = useRef<SVGPathElement | null>(null);

  /* -------- Training loop -------------------------------------------- */

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(runOneStep, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, mode]);

  function runOneStep() {
    const net = networkRef.current;
    const data = samplesRef.current;
    if (!net || data.length === 0) return;

    const batch = sampleBatch(data, BATCH_SIZE);
    net.train(batch, learningRateRef.current);
    epochRef.current++;
    tickCountRef.current++;

    // Imperative redraw of the plot
    if (mode === "classification") {
      drawDecisionBoundary(boundaryCanvasRef.current, net, BOUNDARY_RES_PLAY);
    } else {
      drawRegressionCurve(regressionPathRef.current, net);
    }

    // Thumbnails - every N ticks
    if (tickCountRef.current % THUMB_UPDATE_EVERY === 0) {
      setThumbnailUrls(generateThumbnailUrls(net, mode));
    }

    // React state - throttled
    if (tickCountRef.current % STATE_UPDATE_EVERY === 0) {
      const l = computeLoss(net, data);
      setEpochDisplay(epochRef.current);
      setLossDisplay(l);
      setLossHistory((h) => [...h, l].slice(-120));
    }
  }

  function stepOnce() {
    const net = networkRef.current;
    const data = samplesRef.current;
    if (!net || data.length === 0) return;
    const batch = sampleBatch(data, BATCH_SIZE);
    net.train(batch, learningRateRef.current);
    epochRef.current++;

    if (mode === "classification") {
      drawDecisionBoundary(boundaryCanvasRef.current, net, BOUNDARY_RES_PAUSED);
    } else {
      drawRegressionCurve(regressionPathRef.current, net);
    }
    setThumbnailUrls(generateThumbnailUrls(net, mode));
    const l = computeLoss(net, data);
    setEpochDisplay(epochRef.current);
    setLossDisplay(l);
    setLossHistory((h) => [...h, l].slice(-120));
  }

  function reset() {
    setIsPlaying(false);
    network.build();
    epochRef.current = 0;
    tickCountRef.current = 0;
    setEpochDisplay(0);
    setLossDisplay(NaN);
    setLossHistory([]);
    setTimeout(() => {
      if (mode === "classification") {
        drawDecisionBoundary(boundaryCanvasRef.current, network, BOUNDARY_RES_PAUSED);
      } else {
        drawRegressionCurve(regressionPathRef.current, network);
      }
      setThumbnailUrls(generateThumbnailUrls(network, mode));
    }, 0);
  }

  /* -------- Architecture controls ------------------------------------ */

  function addLayer() {
    if (hiddenSizes.length >= MAX_LAYERS) return;
    setIsPlaying(false);
    setHiddenSizes((prev) => [...prev, 4]);
  }
  function removeLayer() {
    if (hiddenSizes.length <= MIN_LAYERS) return;
    setIsPlaying(false);
    setHiddenSizes((prev) => prev.slice(0, -1));
  }
  function addNeuron(layerIdx: number) {
    setIsPlaying(false);
    setHiddenSizes((prev) =>
      prev.map((sz, i) => (i === layerIdx ? Math.min(MAX_NEURONS_PER_LAYER, sz + 1) : sz))
    );
  }
  function removeNeuron(layerIdx: number) {
    setIsPlaying(false);
    setHiddenSizes((prev) =>
      prev.map((sz, i) => (i === layerIdx ? Math.max(MIN_NEURONS_PER_LAYER, sz - 1) : sz))
    );
  }

  /* -------- Redraw on structural / mode change ----------------------- */

  useEffect(() => {
    const id = setTimeout(() => {
      if (mode === "classification") {
        drawDecisionBoundary(boundaryCanvasRef.current, network, BOUNDARY_RES_PAUSED);
      } else {
        drawRegressionCurve(regressionPathRef.current, network);
      }
      setThumbnailUrls(generateThumbnailUrls(network, mode));
    }, 0);
    return () => clearTimeout(id);
  }, [network, mode, classificationData, regressionData]);

  useEffect(() => {
    if (isPlaying) return;
    const id = setTimeout(() => {
      if (mode === "classification") {
        drawDecisionBoundary(boundaryCanvasRef.current, network, BOUNDARY_RES_PAUSED);
      } else {
        drawRegressionCurve(regressionPathRef.current, network);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [isPlaying, network, mode]);

  /* -------- Caption logic -------------------------------------------- */

  const caption = useMemo(() => {
    if (!isPlaying && epochRef.current === 0) {
      return mode === "classification"
        ? "Click ▶ Play to start training. The decision boundary on the left and the neuron thumbnails on the right will update in real time."
        : "Click ▶ Play to start training. The fitted curve on the left and the neuron activation curves on the right will update in real time.";
    }
    if (isPlaying) {
      const l = isFinite(lossDisplay) ? lossDisplay.toFixed(3) : "-";
      return `Training… epoch ${epochDisplay}, loss ${l}.`;
    }
    if (epochDisplay >= 200 && lossDisplay > 0.3) {
      return "This network can't seem to learn this pattern. Try adding a layer, more neurons, or a different activation function.";
    }
    if (lossDisplay < 0.05 && lossHistory.length > 30) {
      const recent = lossHistory.slice(-20);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (avg < 0.05) {
        return "Converged. The network has learned the pattern.";
      }
    }
    return `Paused at epoch ${epochDisplay}. Click ▶ Play to continue.`;
  }, [isPlaying, epochDisplay, lossDisplay, lossHistory, mode]);

  /* -------- Render ---------------------------------------------------- */

  const datasetOptions =
    mode === "classification" ? CLASSIFICATION_DATASETS : REGRESSION_DATASETS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Mode toggle - top-right */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Top stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "12px 20px",
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
          <Stat
            label="LOSS"
            value={isFinite(lossDisplay) ? lossDisplay.toFixed(3) : "-"}
            accent={lossDisplay < 0.05 ? "var(--success)" : "var(--neutral-900)"}
          />
          <Stat label="EPOCH" value={epochDisplay.toString()} />
        </div>
        <Sparkline values={lossHistory} />
      </div>

      {/* Plot + Network */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${PLOT_PX}px 1fr`,
          gap: 24,
          alignItems: "start",
        }}
      >
        {mode === "classification" ? (
          <ClassificationPlot
            data={classificationData}
            boundaryCanvasRef={boundaryCanvasRef}
          />
        ) : (
          <RegressionPlot data={regressionData} pathRef={regressionPathRef} />
        )}

        <NetworkDiagram
          mode={mode}
          hiddenSizes={hiddenSizes}
          network={network}
          thumbnailUrls={thumbnailUrls}
          onAddLayer={addLayer}
          onRemoveLayer={removeLayer}
          onAddNeuron={addNeuron}
          onRemoveNeuron={removeNeuron}
        />
      </div>

      {/* Caption */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--neutral-50)",
          borderRadius: 8,
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--neutral-700)",
          textAlign: "center",
        }}
      >
        {caption}
      </div>

      {/* Datasets row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            letterSpacing: 0.6,
          }}
        >
          DATASET
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {datasetOptions.map((opt) =>
            mode === "classification" ? (
              <ClassificationDatasetTile
                key={opt.kind as string}
                kind={opt.kind as ClassificationDatasetKind}
                label={opt.label}
                active={opt.kind === classificationKind}
                onClick={() => setClassificationKind(opt.kind as ClassificationDatasetKind)}
              />
            ) : (
              <RegressionDatasetTile
                key={opt.kind as string}
                kind={opt.kind as RegressionDatasetKind}
                label={opt.label}
                active={opt.kind === regressionKind}
                onClick={() => setRegressionKind(opt.kind as RegressionDatasetKind)}
              />
            )
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 1fr",
          gap: 24,
          padding: "16px 20px",
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsPlaying((p) => !p)}
            style={{ minWidth: 110 }}
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={stepOnce} disabled={isPlaying}>
            Step
          </button>
          <button className="btn btn-secondary btn-sm" onClick={reset}>
            ↻ Reset
          </button>
        </div>
        <LearningRateSlider value={learningRate} onChange={setLearningRate} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)", letterSpacing: 0.5 }}>
            ACTIVATION
          </span>
          <select
            value={activation}
            onChange={(e) => setActivation(e.target.value as ActivationKind)}
            className="input"
            style={{ height: 36, padding: "0 10px", fontSize: 13 }}
          >
            <option value="tanh">Tanh</option>
            <option value="relu">ReLU</option>
            <option value="sigmoid">Sigmoid</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Mode toggle
   ===================================================================== */

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--neutral-100)",
        borderRadius: 8,
        padding: 3,
        border: "1px solid var(--neutral-200)",
      }}
    >
      <ToggleSegment
        active={mode === "classification"}
        onClick={() => onChange("classification")}
        label="Classification"
      />
      <ToggleSegment
        active={mode === "regression"}
        onClick={() => onChange("regression")}
        label="Regression"
      />
    </div>
  );
}

function ToggleSegment({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--neutral-0)" : "transparent",
        border: "none",
        padding: "6px 14px",
        borderRadius: 6,
        cursor: "pointer",
        font: "inherit",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--neutral-900)" : "var(--neutral-500)",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
        transition: "background 120ms, color 120ms",
      }}
    >
      {label}
    </button>
  );
}

/* =====================================================================
   Stat / Sparkline (unchanged from before)
   ===================================================================== */

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--neutral-500)", letterSpacing: 0.6 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 22,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          color: accent ?? "var(--neutral-900)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div
        style={{
          width: 200,
          height: 40,
          color: "var(--neutral-400)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        loss curve appears once training starts
      </div>
    );
  }
  const W = 200;
  const H = 40;
  const max = Math.max(0.1, ...values);
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--lab-cyan)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =====================================================================
   Classification plot - canvas boundary + SVG dots overlay
   ===================================================================== */

function ClassificationPlot({
  data,
  boundaryCanvasRef,
}: {
  data: ClassificationPoint[];
  boundaryCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  return (
    <div
      style={{
        width: PLOT_PX,
        height: PLOT_PX,
        position: "relative",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={boundaryCanvasRef}
        width={PLOT_PX}
        height={PLOT_PX}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <svg
        viewBox={`0 0 ${PLOT_PX} ${PLOT_PX}`}
        width={PLOT_PX}
        height={PLOT_PX}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {data.map((p, i) => {
          const sx = ((p.x + CLASSIFICATION_INPUT_DOMAIN) / (2 * CLASSIFICATION_INPUT_DOMAIN)) * PLOT_PX;
          const sy = (1 - (p.y + CLASSIFICATION_INPUT_DOMAIN) / (2 * CLASSIFICATION_INPUT_DOMAIN)) * PLOT_PX;
          const fill = p.label === 1 ? "rgb(8,145,178)" : "rgb(181,83,42)";
          return (
            <circle key={i} cx={sx} cy={sy} r="3.5" fill={fill} stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
          );
        })}
      </svg>
    </div>
  );
}

/* =====================================================================
   Regression plot - SVG with axes, data dots, fitted curve
   ===================================================================== */

const REG_PAD_L = 36;
const REG_PAD_R = 14;
const REG_PAD_T = 14;
const REG_PAD_B = 28;
const REG_PLOT_W = PLOT_PX - REG_PAD_L - REG_PAD_R;
const REG_PLOT_H = PLOT_PX - REG_PAD_T - REG_PAD_B;

function regXToScreen(x: number): number {
  const D = REGRESSION_INPUT_DOMAIN;
  return REG_PAD_L + ((x + D) / (2 * D)) * REG_PLOT_W;
}
function regYToScreen(y: number): number {
  const [lo, hi] = REGRESSION_Y_DOMAIN;
  const t = (y - lo) / (hi - lo);
  return REG_PAD_T + (1 - t) * REG_PLOT_H;
}

function RegressionPlot({
  data,
  pathRef,
}: {
  data: RegressionPoint[];
  pathRef: React.MutableRefObject<SVGPathElement | null>;
}) {
  return (
    <div
      style={{
        width: PLOT_PX,
        height: PLOT_PX,
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <svg viewBox={`0 0 ${PLOT_PX} ${PLOT_PX}`} width={PLOT_PX} height={PLOT_PX} style={{ display: "block" }}>
        {/* grid */}
        <g style={{ pointerEvents: "none" }}>
          {[-2, -1, 0, 1, 2].map((x) => (
            <line
              key={`gx${x}`}
              x1={regXToScreen(x)}
              y1={REG_PAD_T}
              x2={regXToScreen(x)}
              y2={REG_PAD_T + REG_PLOT_H}
              stroke={x === 0 ? "var(--neutral-300)" : "var(--neutral-200)"}
              strokeWidth="1"
            />
          ))}
          {[-1, -0.5, 0, 0.5, 1, 1.5].map((y) => (
            <line
              key={`gy${y}`}
              x1={REG_PAD_L}
              y1={regYToScreen(y)}
              x2={REG_PAD_L + REG_PLOT_W}
              y2={regYToScreen(y)}
              stroke={y === 0 ? "var(--neutral-300)" : "var(--neutral-200)"}
              strokeWidth="1"
            />
          ))}
        </g>

        {/* axis labels */}
        <g style={{ pointerEvents: "none" }}>
          {[-2, -1, 0, 1, 2].map((x) => (
            <text
              key={`xt${x}`}
              x={regXToScreen(x)}
              y={REG_PAD_T + REG_PLOT_H + 16}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--neutral-500)"
              textAnchor="middle"
            >
              {x}
            </text>
          ))}
          {[-1, 0, 1].map((y) => (
            <text
              key={`yt${y}`}
              x={REG_PAD_L - 6}
              y={regYToScreen(y) + 3}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--neutral-500)"
              textAnchor="end"
            >
              {y}
            </text>
          ))}
          <text
            x={REG_PAD_L + REG_PLOT_W / 2}
            y={PLOT_PX - 6}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--neutral-500)"
            textAnchor="middle"
          >
            x
          </text>
          <text
            x={12}
            y={REG_PAD_T + REG_PLOT_H / 2}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--neutral-500)"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${REG_PAD_T + REG_PLOT_H / 2})`}
          >
            y
          </text>
        </g>

        {/* fitted curve - d attribute updated imperatively each step */}
        <path
          ref={pathRef}
          fill="none"
          stroke="rgb(181,83,42)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />

        {/* data dots */}
        {data.map((p, i) => {
          const sx = regXToScreen(p.x);
          const sy = regYToScreen(p.y);
          if (sy < REG_PAD_T - 2 || sy > REG_PAD_T + REG_PLOT_H + 2) return null;
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r="3"
              fill="rgb(181,83,42)"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* =====================================================================
   Dataset tiles (one per mode, sharing a base style)
   ===================================================================== */

function ClassificationDatasetTile({
  kind,
  label,
  active,
  onClick,
}: {
  kind: ClassificationDatasetKind;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const data = generateClassificationDataset(kind, 60);
    for (const p of data) {
      const sx = ((p.x + CLASSIFICATION_INPUT_DOMAIN) / (2 * CLASSIFICATION_INPUT_DOMAIN)) * W;
      const sy = (1 - (p.y + CLASSIFICATION_INPUT_DOMAIN) / (2 * CLASSIFICATION_INPUT_DOMAIN)) * H;
      ctx.fillStyle = p.label === 1 ? "rgb(8,145,178)" : "rgb(181,83,42)";
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [kind]);
  return <DatasetTileFrame canvasRef={canvasRef} label={label} active={active} onClick={onClick} />;
}

function RegressionDatasetTile({
  kind,
  label,
  active,
  onClick,
}: {
  kind: RegressionDatasetKind;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // Soft grid baseline
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    const data = generateRegressionDataset(kind, 50);
    ctx.fillStyle = "rgb(181,83,42)";
    for (const p of data) {
      const sx = ((p.x + REGRESSION_INPUT_DOMAIN) / (2 * REGRESSION_INPUT_DOMAIN)) * W;
      const t = (p.y - REGRESSION_Y_DOMAIN[0]) / (REGRESSION_Y_DOMAIN[1] - REGRESSION_Y_DOMAIN[0]);
      const sy = (1 - t) * H;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [kind]);
  return <DatasetTileFrame canvasRef={canvasRef} label={label} active={active} onClick={onClick} />;
}

function DatasetTileFrame({
  canvasRef,
  label,
  active,
  onClick,
}: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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

/* =====================================================================
   Network diagram
   ===================================================================== */

const COL_GAP = 92;
const ROW_GAP = 14;
const NEURON_R = 22;

function NetworkDiagram({
  mode,
  hiddenSizes,
  network,
  thumbnailUrls,
  onAddLayer,
  onRemoveLayer,
  onAddNeuron,
  onRemoveNeuron,
}: {
  mode: Mode;
  hiddenSizes: number[];
  network: Network | null;
  thumbnailUrls: Record<string, string>;
  onAddLayer: () => void;
  onRemoveLayer: () => void;
  onAddNeuron: (layerIdx: number) => void;
  onRemoveNeuron: (layerIdx: number) => void;
}) {
  const numInputs = network ? network.numInputs : mode === "regression" ? 1 : 2;
  const hiddenCols = network ? network.layers.slice(0, -1).map((l) => l.length) : hiddenSizes;
  const cols = [numInputs, ...hiddenCols, 1];
  const maxNeurons = Math.max(...cols);
  const totalH = maxNeurons * (NEURON_R * 2 + ROW_GAP) - ROW_GAP + 60;

  const xs = cols.map((_, i) => 40 + i * (COL_GAP + NEURON_R * 2));
  const totalW = xs[xs.length - 1] + NEURON_R * 2 + 40;

  const ysPerCol = cols.map((count) => {
    const colHeight = count * (NEURON_R * 2 + ROW_GAP) - ROW_GAP;
    const startY = 40 + (totalH - 60 - colHeight) / 2;
    return Array.from({ length: count }, (_, n) => startY + n * (NEURON_R * 2 + ROW_GAP));
  });

  const inputLabels = numInputs === 1 ? ["x"] : ["x", "y"];

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            letterSpacing: 0.6,
          }}
        >
          NETWORK ARCHITECTURE
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--neutral-500)",
              marginRight: 8,
            }}
          >
            {hiddenSizes.length} hidden {hiddenSizes.length === 1 ? "layer" : "layers"}
          </span>
          <SmallButton onClick={onRemoveLayer} disabled={hiddenSizes.length <= MIN_LAYERS}>
            − Layer
          </SmallButton>
          <SmallButton onClick={onAddLayer} disabled={hiddenSizes.length >= MAX_LAYERS}>
            + Layer
          </SmallButton>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${totalW} ${totalH + 40}`}
        width="100%"
        style={{ display: "block", maxHeight: 420 }}
      >
        <defs>
          <clipPath id="nnpgThumbClip" clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>

        {/* Connections */}
        {network &&
          network.layers.map((layer, layerIdx) => {
            const fromCol = layerIdx;
            const toCol = layerIdx + 1;
            const fromYs = ysPerCol[fromCol];
            const toYs = ysPerCol[toCol];
            if (!fromYs || !toYs) return null;
            const fromX = xs[fromCol] + NEURON_R;
            const toX = xs[toCol] + NEURON_R;
            return layer.flatMap((neuron, n) =>
              neuron.weights.map((w, i) => {
                const absW = Math.min(Math.abs(w), 4);
                const stroke = w >= 0 ? "rgb(8,145,178)" : "rgb(181,83,42)";
                const opacity = 0.2 + 0.7 * (absW / 4);
                const width = 0.6 + 1.8 * (absW / 4);
                return (
                  <line
                    key={`l${layerIdx}-${n}-${i}`}
                    x1={fromX + NEURON_R}
                    y1={fromYs[i] + NEURON_R}
                    x2={toX - NEURON_R}
                    y2={toYs[n] + NEURON_R}
                    stroke={stroke}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                  />
                );
              })
            );
          })}

        {cols.map((count, colIdx) => {
          const isInput = colIdx === 0;
          const isOutput = colIdx === cols.length - 1;
          const isHidden = !isInput && !isOutput;
          const ys = ysPerCol[colIdx];
          const x = xs[colIdx];
          return (
            <g key={`col${colIdx}`}>
              {isHidden && (
                <foreignObject x={x - 4} y={4} width={NEURON_R * 2 + 8} height={28}>
                  <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    <SmallButton
                      onClick={() => onRemoveNeuron(colIdx - 1)}
                      disabled={count <= MIN_NEURONS_PER_LAYER}
                      tight
                    >
                      −
                    </SmallButton>
                    <SmallButton
                      onClick={() => onAddNeuron(colIdx - 1)}
                      disabled={count >= MAX_NEURONS_PER_LAYER}
                      tight
                    >
                      +
                    </SmallButton>
                  </div>
                </foreignObject>
              )}

              {ys.map((y, n) => {
                const cx0 = x + NEURON_R;
                const cy0 = y + NEURON_R;
                if (isInput) {
                  const label = inputLabels[n] ?? "x";
                  return (
                    <g key={`in${n}`}>
                      <circle
                        cx={cx0}
                        cy={cy0}
                        r={NEURON_R}
                        fill="var(--neutral-100)"
                        stroke="var(--neutral-400)"
                        strokeWidth="1"
                      />
                      <text
                        x={cx0}
                        y={cy0 + 4}
                        fontSize="14"
                        fontFamily="var(--font-mono)"
                        fontWeight={600}
                        fill="var(--neutral-700)"
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    </g>
                  );
                }
                if (isOutput) {
                  return (
                    <g key={`out`}>
                      <circle
                        cx={cx0}
                        cy={cy0}
                        r={NEURON_R}
                        fill="var(--neutral-50)"
                        stroke="var(--neutral-700)"
                        strokeWidth="1.25"
                      />
                      <text
                        x={cx0}
                        y={cy0 + 4}
                        fontSize="11"
                        fontFamily="var(--font-mono)"
                        fontWeight={600}
                        fill="var(--neutral-700)"
                        textAnchor="middle"
                      >
                        ŷ
                      </text>
                    </g>
                  );
                }
                const thumbKey = `${colIdx - 1}:${n}`;
                const thumbUrl = thumbnailUrls[thumbKey];
                const imgR = NEURON_R - 2;
                return (
                  <g key={`h${colIdx}-${n}`}>
                    <circle cx={cx0} cy={cy0} r={NEURON_R} fill="var(--neutral-0)" />
                    {thumbUrl && (
                      <image
                        href={thumbUrl}
                        x={cx0 - imgR}
                        y={cy0 - imgR}
                        width={imgR * 2}
                        height={imgR * 2}
                        clipPath="url(#nnpgThumbClip)"
                        preserveAspectRatio="none"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                    <circle
                      cx={cx0}
                      cy={cy0}
                      r={NEURON_R}
                      fill="none"
                      stroke="var(--neutral-700)"
                      strokeWidth="1.25"
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SmallButton({
  onClick,
  disabled,
  tight,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: tight ? 22 : 26,
        padding: tight ? "0 6px" : "0 10px",
        fontSize: tight ? 12 : 11,
        fontFamily: tight ? "var(--font-mono)" : "var(--font-sans)",
        fontWeight: 600,
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        color: disabled ? "var(--neutral-400)" : "var(--neutral-700)",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

/* =====================================================================
   Learning rate slider
   ===================================================================== */

const LR_MIN = 0.001;
const LR_MAX = 1.0;
const LOG_LR_MIN = Math.log10(LR_MIN);
const LOG_LR_MAX = Math.log10(LR_MAX);

function LearningRateSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pos = (Math.log10(value) - LOG_LR_MIN) / (LOG_LR_MAX - LOG_LR_MIN);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            letterSpacing: 0.5,
          }}
        >
          LEARNING RATE
        </span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--neutral-900)" }}>
          {value < 0.01 ? value.toFixed(4) : value.toFixed(3)}
        </span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "var(--neutral-200)", borderRadius: 2 }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${pos * 100}%`,
            height: 4,
            background: "var(--lab-cyan)",
            borderRadius: 2,
          }}
        />
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(pos * 1000)}
          onChange={(e) => {
            const p = parseInt(e.target.value, 10) / 1000;
            const log = LOG_LR_MIN + p * (LOG_LR_MAX - LOG_LR_MIN);
            onChange(Math.pow(10, log));
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pos * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--lab-cyan)",
            boxShadow: "0 0 0 2px var(--neutral-0), 0 1px 2px rgba(0,0,0,0.15)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-400)",
        }}
      >
        <span>0.001</span>
        <span>0.01</span>
        <span>0.1</span>
        <span>1</span>
      </div>
    </div>
  );
}

/* =====================================================================
   Canvas + path drawing helpers
   ===================================================================== */

function outputToColor(out: number): [number, number, number, number] {
  const clipped = Math.max(-1, Math.min(1, out));
  const a = 80 + Math.min(1, Math.abs(clipped)) * 120;
  if (clipped >= 0) return [BLUE[0], BLUE[1], BLUE[2], a];
  return [ORANGE[0], ORANGE[1], ORANGE[2], a];
}

function drawDecisionBoundary(
  canvas: HTMLCanvasElement | null,
  net: Network | null,
  resolution: number
) {
  if (!canvas || !net || net.numInputs !== 2) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const D = CLASSIFICATION_INPUT_DOMAIN;
  const cellOutputs: number[] = new Array(resolution * resolution);
  for (let cy = 0; cy < resolution; cy++) {
    const py = ((cy + 0.5) / resolution) * H;
    const dataY = -((py / H) * 2 * D - D);
    for (let cx = 0; cx < resolution; cx++) {
      const px = ((cx + 0.5) / resolution) * W;
      const dataX = (px / W) * 2 * D - D;
      cellOutputs[cy * resolution + cx] = net.forward([dataX, dataY]);
    }
  }
  const img = ctx.createImageData(W, H);
  const arr = img.data;
  for (let py = 0; py < H; py++) {
    const cy = Math.min(resolution - 1, Math.floor((py / H) * resolution));
    for (let px = 0; px < W; px++) {
      const cx = Math.min(resolution - 1, Math.floor((px / W) * resolution));
      const out = cellOutputs[cy * resolution + cx];
      const [r, g, b, a] = outputToColor(out);
      const idx = (py * W + px) * 4;
      arr[idx] = r;
      arr[idx + 1] = g;
      arr[idx + 2] = b;
      arr[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawRegressionCurve(path: SVGPathElement | null, net: Network | null) {
  if (!path || !net || net.numInputs !== 1) return;
  const D = REGRESSION_INPUT_DOMAIN;
  const samples = 200;
  let d = "";
  for (let i = 0; i <= samples; i++) {
    const x = -D + (i / samples) * 2 * D;
    let y = net.forward([x]);
    // Soft-clip to ±5 so the path doesn't blow out the SVG renderer.
    if (!isFinite(y)) y = 0;
    y = Math.max(-5, Math.min(5, y));
    const sx = regXToScreen(x);
    const sy = regYToScreen(y);
    d += (i === 0 ? "M " : "L ") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
  }
  path.setAttribute("d", d);
}

/* =====================================================================
   Thumbnail generation - mode-aware
   ===================================================================== */

function generateThumbnailUrls(net: Network | null, mode: Mode): Record<string, string> {
  if (!net) return {};
  return mode === "classification"
    ? generate2DThumbnailUrls(net)
    : generate1DThumbnailUrls(net);
}

function generate2DThumbnailUrls(net: Network): Record<string, string> {
  const D = CLASSIFICATION_INPUT_DOMAIN;
  const numHidden = net.layers.length - 1;
  if (numHidden === 0 || net.numInputs !== 2) return {};

  const grids: number[][][] = [];
  for (let l = 0; l < numHidden; l++) {
    const layerSize = net.layers[l].length;
    grids.push(Array.from({ length: layerSize }, () => new Array(THUMB_2D_RES * THUMB_2D_RES)));
  }

  for (let cy = 0; cy < THUMB_2D_RES; cy++) {
    const dataY = -(((cy + 0.5) / THUMB_2D_RES) * 2 * D - D);
    for (let cx = 0; cx < THUMB_2D_RES; cx++) {
      const dataX = ((cx + 0.5) / THUMB_2D_RES) * 2 * D - D;
      net.forward([dataX, dataY]);
      const idx = cy * THUMB_2D_RES + cx;
      for (let l = 0; l < numHidden; l++) {
        const layer = net.layers[l];
        for (let n = 0; n < layer.length; n++) grids[l][n][idx] = layer[n].output;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = THUMB_2D_RES;
  canvas.height = THUMB_2D_RES;
  const ctx = canvas.getContext("2d");
  if (!ctx) return {};

  const out: Record<string, string> = {};
  for (let l = 0; l < numHidden; l++) {
    for (let n = 0; n < grids[l].length; n++) {
      const img = ctx.createImageData(THUMB_2D_RES, THUMB_2D_RES);
      const arr = img.data;
      const grid = grids[l][n];
      for (let i = 0; i < grid.length; i++) {
        const [r, g, b, a] = outputToColor(grid[i]);
        arr[i * 4] = r;
        arr[i * 4 + 1] = g;
        arr[i * 4 + 2] = b;
        arr[i * 4 + 3] = Math.max(140, a);
      }
      ctx.putImageData(img, 0, 0);
      out[`${l}:${n}`] = canvas.toDataURL("image/png");
    }
  }
  return out;
}

function generate1DThumbnailUrls(net: Network): Record<string, string> {
  // For each hidden neuron, render its activation as a function of x.
  const D = REGRESSION_INPUT_DOMAIN;
  const samples = THUMB_1D_SAMPLES;
  const numHidden = net.layers.length - 1;
  if (numHidden === 0 || net.numInputs !== 1) return {};

  const grids: number[][][] = [];
  for (let l = 0; l < numHidden; l++) {
    grids.push(Array.from({ length: net.layers[l].length }, () => new Array<number>(samples)));
  }

  for (let i = 0; i < samples; i++) {
    const x = -D + (i / (samples - 1)) * 2 * D;
    net.forward([x]);
    for (let l = 0; l < numHidden; l++) {
      const layer = net.layers[l];
      for (let n = 0; n < layer.length; n++) grids[l][n][i] = layer[n].output;
    }
  }

  // Render each curve to a small canvas - big enough that the curve looks
  // crisp when scaled down inside the neuron circle.
  const W = 96;
  const H = 96;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return {};

  const out: Record<string, string> = {};
  for (let l = 0; l < numHidden; l++) {
    for (let n = 0; n < grids[l].length; n++) {
      // White-ish background so the line reads cleanly against the bowl
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(0, 0, W, H);

      const vals = grids[l][n];
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of vals) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      // Pad - and if completely flat (e.g. pre-training), give a sensible window
      if (hi - lo < 0.05) {
        lo -= 0.5;
        hi += 0.5;
      } else {
        const pad = (hi - lo) * 0.12;
        lo -= pad;
        hi += pad;
      }

      // Baseline at y=0 (if visible) - quiet gray
      if (lo <= 0 && hi >= 0) {
        const baseY = H * (1 - (0 - lo) / (hi - lo));
        ctx.strokeStyle = "rgba(120,120,120,0.32)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.lineTo(W, baseY);
        ctx.stroke();
      }

      // Curve - accent color, thick, rounded joins
      ctx.strokeStyle = "rgb(181,83,42)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < vals.length; i++) {
        const x = (i / (vals.length - 1)) * W;
        const y = H * (1 - (vals[i] - lo) / (hi - lo));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      out[`${l}:${n}`] = canvas.toDataURL("image/png");
    }
  }
  return out;
}
