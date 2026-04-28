"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  convolve,
  generateFilterLabImage,
  KERNEL_PRESETS,
  renderGrayToCanvas,
  traceConvolution,
  type FilterLabImageKind,
  type Kernel3x3,
} from "@/lib/simulations/cnn-core";

const IMAGE_SIZE = 128;
const DISPLAY_SCALE = 2; // 128px raw → 256px on screen

const IMAGE_OPTIONS: { kind: FilterLabImageKind; label: string }[] = [
  { kind: "face",    label: "Face" },
  { kind: "stripes", label: "Stripes" },
  { kind: "circle",  label: "Circle" },
  { kind: "seven",   label: "Number 7" },
];

export function FilterLab() {
  const [imageKind, setImageKind] = useState<FilterLabImageKind>("face");
  const [kernel, setKernel] = useState<Kernel3x3>(KERNEL_PRESETS[0].values.slice());
  const [activePresetIdx, setActivePresetIdx] = useState<number | null>(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const inputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate the input image when the kind changes.
  const image = useMemo(() => generateFilterLabImage(imageKind, IMAGE_SIZE), [imageKind]);

  // Convolve whenever the kernel or image changes.
  const output = useMemo(() => convolve(image, kernel), [image, kernel]);

  // Draw both canvases.
  useEffect(() => {
    renderGrayToCanvas(inputCanvasRef.current, image, "raw");
  }, [image]);

  useEffect(() => {
    // Use absolute-value rendering for the output so edge-detection kernels
    // (which produce negative values) display their full range.
    renderGrayToCanvas(outputCanvasRef.current, output, "abs");
  }, [output]);

  /* -------- Hover handler --------------------------------------------- */

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * IMAGE_SIZE;
    const py = ((e.clientY - rect.top) / rect.height) * IMAGE_SIZE;
    setHover({ x: Math.floor(px), y: Math.floor(py) });
  }

  function handleMouseLeave() {
    setHover(null);
  }

  /* -------- Kernel cell editing --------------------------------------- */

  function setCell(idx: number, value: number) {
    const next = kernel.slice();
    next[idx] = value;
    setKernel(next);
    setActivePresetIdx(null);
  }

  function applyPreset(idx: number) {
    setKernel(KERNEL_PRESETS[idx].values.slice());
    setActivePresetIdx(idx);
  }

  /* -------- Hover trace ----------------------------------------------- */

  const trace = useMemo(() => {
    if (!hover) return null;
    return traceConvolution(image, kernel, hover.x, hover.y);
  }, [image, kernel, hover]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Image picker row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={metaLabel}>IMAGE</span>
        <div style={{ display: "flex", gap: 8 }}>
          {IMAGE_OPTIONS.map((opt) => (
            <ImagePresetTile
              key={opt.kind}
              kind={opt.kind}
              label={opt.label}
              active={opt.kind === imageKind}
              onClick={() => setImageKind(opt.kind)}
            />
          ))}
        </div>
      </div>

      {/* Pipeline: input → kernel → output */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          gap: 24,
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 0",
        }}
      >
        {/* Input */}
        <Pane label="Input image">
          <canvas
            ref={inputCanvasRef}
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            style={{
              width: IMAGE_SIZE * DISPLAY_SCALE,
              height: IMAGE_SIZE * DISPLAY_SCALE,
              imageRendering: "pixelated",
              borderRadius: 8,
              border: "1px solid var(--neutral-200)",
              background: "var(--neutral-100)",
            }}
          />
        </Pane>

        {/* Kernel */}
        <Pane label="Kernel (3×3)">
          <KernelGrid kernel={kernel} onChange={setCell} />
        </Pane>

        {/* Output */}
        <Pane label="Output">
          <canvas
            ref={outputCanvasRef}
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              width: IMAGE_SIZE * DISPLAY_SCALE,
              height: IMAGE_SIZE * DISPLAY_SCALE,
              imageRendering: "pixelated",
              borderRadius: 8,
              border: "1px solid var(--neutral-200)",
              background: "var(--neutral-100)",
              cursor: "crosshair",
            }}
          />
        </Pane>
      </div>

      {/* Kernel preset row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={metaLabel}>KERNEL PRESET</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {KERNEL_PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(i)}
              className={`btn ${activePresetIdx === i ? "btn-primary" : "btn-secondary"} btn-sm`}
              style={{ minWidth: 90 }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hover info strip */}
      <HoverStrip hover={hover} trace={trace} kernel={kernel} />
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

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span style={metaLabel}>{label.toUpperCase()}</span>
      {children}
    </div>
  );
}

function KernelGrid({
  kernel,
  onChange,
}: {
  kernel: Kernel3x3;
  onChange: (idx: number, value: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 64px)",
        gridTemplateRows: "repeat(3, 64px)",
        gap: 6,
        padding: 10,
        background: "var(--neutral-50)",
        borderRadius: 10,
        border: "1px solid var(--neutral-200)",
      }}
    >
      {kernel.map((v, i) => (
        <KernelCell key={i} value={v} onChange={(nv) => onChange(i, nv)} />
      ))}
    </div>
  );
}

function KernelCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  // Local string state so the user can type intermediate forms like "-",
  // ".5", "1." without losing focus.
  const [draft, setDraft] = useState<string>(formatCell(value));
  const lastCommitted = useRef<number>(value);

  // Sync down when an external change (preset click) updates the value.
  useEffect(() => {
    if (Math.abs(value - lastCommitted.current) > 1e-9) {
      setDraft(formatCell(value));
      lastCommitted.current = value;
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value;
    setDraft(s);
    const n = parseFloat(s);
    if (!isNaN(n) && isFinite(n)) {
      const clamped = Math.max(-5, Math.min(5, n));
      lastCommitted.current = clamped;
      onChange(clamped);
    }
  }

  function handleBlur() {
    setDraft(formatCell(lastCommitted.current));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{
        width: "100%",
        height: "100%",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--neutral-900)",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 6,
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
    />
  );
}

function formatCell(v: number): string {
  // Compact: drop trailing zeros, show up to 3 decimals
  const fixed = v.toFixed(3);
  return parseFloat(fixed).toString();
}

function ImagePresetTile({
  kind,
  label,
  active,
  onClick,
}: {
  kind: FilterLabImageKind;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const img = generateFilterLabImage(kind, 64);
    renderGrayToCanvas(canvasRef.current, img, "raw");
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
        width={64}
        height={64}
        style={{
          width: 64,
          height: 64,
          imageRendering: "pixelated",
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

function HoverStrip({
  hover,
  trace,
  kernel,
}: {
  hover: { x: number; y: number } | null;
  trace: ReturnType<typeof traceConvolution> | null;
  kernel: Kernel3x3;
}) {
  if (!hover || !trace) {
    return (
      <div
        style={{
          padding: "14px 18px",
          background: "var(--neutral-50)",
          borderRadius: 10,
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
          textAlign: "center",
        }}
      >
        hover the output image to see the convolution math for that pixel
      </div>
    );
  }

  // Render the 9 terms in a clean grid mirroring the kernel layout.
  return (
    <div
      style={{
        padding: "14px 18px",
        background: "var(--neutral-50)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-700)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>
          output[{hover.x}, {hover.y}] = Σ (kernel × image patch)
        </span>
        <span style={{ color: "var(--neutral-900)", fontWeight: 700 }}>
          = {trace.sum.toFixed(3)}
        </span>
      </div>

      {/* The 9 multiplications, in grid form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          fontSize: 12,
        }}
      >
        {trace.terms.map((t, i) => (
          <div
            key={i}
            style={{
              padding: "6px 8px",
              background: "var(--neutral-0)",
              border: "1px solid var(--neutral-200)",
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--neutral-500)" }}>
              {fmt(kernel[i])}
              <span style={{ color: "var(--neutral-400)" }}> × </span>
              {fmt(trace.patch[i])}
            </span>
            <span style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
              = {fmt(t)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(v: number): string {
  if (Math.abs(v) < 0.001) return "0";
  return v.toFixed(2);
}
