"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  convolve,
  generateFilterLabImage,
  KERNEL_PRESETS,
  renderGrayToCanvas,
  type FilterLabImageKind,
  type GrayImage,
  type Kernel3x3,
} from "@/lib/simulations/cnn-core";

// Filter Bank — bridges Filter Lab (one kernel) and Layer Explorer (a
// trained network's many learned kernels). Six 3×3 kernels run in
// parallel against the same input, producing six feature maps at once.

const IMAGE_SIZE = 128;
const INPUT_DISPLAY_PX = 200;
const OUTPUT_DISPLAY_PX = 140;

const IMAGE_OPTIONS: { kind: FilterLabImageKind; label: string }[] = [
  { kind: "face",    label: "Face" },
  { kind: "stripes", label: "Stripes" },
  { kind: "circle",  label: "Circle" },
  { kind: "seven",   label: "Number 7" },
];

// Preset indices in KERNEL_PRESETS:
//   0 Identity, 1 Sobel X, 2 Sobel Y, 3 Blur, 4 Sharpen, 5 Emboss.
// First-load order shows six visually distinct transforms side by side:
const DEFAULT_PRESET_INDICES = [1, 2, 3, 4, 5, 0];

export function FilterBank() {
  const [imageKind, setImageKind] = useState<FilterLabImageKind>("face");
  const [kernels, setKernels] = useState<Kernel3x3[]>(() =>
    DEFAULT_PRESET_INDICES.map((idx) => KERNEL_PRESETS[idx].values.slice())
  );
  // Per-filter active preset index, or null when the user has hand-edited.
  const [presetPerFilter, setPresetPerFilter] = useState<(number | null)[]>(() =>
    DEFAULT_PRESET_INDICES.slice()
  );

  const image = useMemo(
    () => generateFilterLabImage(imageKind, IMAGE_SIZE),
    [imageKind]
  );

  // All 6 outputs recomputed when the image OR the kernels array changes.
  // Editing one cell only mutates kernels[i], but useMemo's identity check
  // on the array still triggers — convolve calls for the unchanged kernels
  // are cheap on a 128×128 image.
  const outputs = useMemo(
    () => kernels.map((k) => convolve(image, k)),
    [image, kernels]
  );

  function setCell(filterIdx: number, cellIdx: number, value: number) {
    setKernels((prev) => {
      const next = prev.slice();
      const k = next[filterIdx].slice();
      k[cellIdx] = value;
      next[filterIdx] = k;
      return next;
    });
    setPresetPerFilter((prev) => {
      const next = prev.slice();
      next[filterIdx] = null;
      return next;
    });
  }

  function applyPreset(filterIdx: number, presetIdx: number) {
    setKernels((prev) => {
      const next = prev.slice();
      next[filterIdx] = KERNEL_PRESETS[presetIdx].values.slice();
      return next;
    });
    setPresetPerFilter((prev) => {
      const next = prev.slice();
      next[filterIdx] = presetIdx;
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Image picker */}
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

      {/* Center: input image (left) + 2×3 kernel grid (right) */}
      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "flex-start",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span style={metaLabel}>INPUT IMAGE</span>
          <InputCanvas image={image} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={metaLabel}>FILTERS — 6 KERNELS IN PARALLEL</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, auto)",
              gap: 16,
            }}
          >
            {kernels.map((kernel, i) => (
              <FilterPanel
                key={i}
                index={i}
                kernel={kernel}
                presetIdx={presetPerFilter[i]}
                onCellChange={(cellIdx, v) => setCell(i, cellIdx, v)}
                onPresetChange={(idx) => applyPreset(i, idx)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: 6 output canvases */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={metaLabel}>OUTPUTS — 6 FEATURE MAPS</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(3, ${OUTPUT_DISPLAY_PX}px)`,
            gap: 16,
            justifyContent: "center",
          }}
        >
          {outputs.map((out, i) => (
            <OutputTile key={i} index={i} image={out} />
          ))}
        </div>
      </div>
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

function InputCanvas({ image }: { image: GrayImage }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    renderGrayToCanvas(ref.current, image, "raw");
  }, [image]);
  return (
    <canvas
      ref={ref}
      width={image.width}
      height={image.height}
      style={{
        width: INPUT_DISPLAY_PX,
        height: INPUT_DISPLAY_PX,
        imageRendering: "pixelated",
        borderRadius: 8,
        border: "1px solid var(--neutral-200)",
        background: "var(--neutral-100)",
      }}
    />
  );
}

function FilterPanel({
  index,
  kernel,
  presetIdx,
  onCellChange,
  onPresetChange,
}: {
  index: number;
  kernel: Kernel3x3;
  presetIdx: number | null;
  onCellChange: (cellIdx: number, value: number) => void;
  onPresetChange: (presetIdx: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-900)" }}>
        Filter {index + 1}
      </span>
      <CompactKernelGrid kernel={kernel} onChange={onCellChange} />
      <PresetSelect value={presetIdx} onChange={onPresetChange} />
    </div>
  );
}

function CompactKernelGrid({
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
        gridTemplateColumns: "repeat(3, 38px)",
        gridTemplateRows: "repeat(3, 38px)",
        gap: 4,
        padding: 6,
        background: "var(--neutral-50)",
        borderRadius: 8,
        border: "1px solid var(--neutral-200)",
      }}
    >
      {kernel.map((v, i) => (
        <CompactKernelCell key={i} value={v} onChange={(nv) => onChange(i, nv)} />
      ))}
    </div>
  );
}

function CompactKernelCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  // Local string draft so the user can type intermediates like "-", ".5".
  const [draft, setDraft] = useState<string>(formatCell(value));
  const lastCommitted = useRef<number>(value);

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
        fontSize: 12,
        fontWeight: 600,
        color: "var(--neutral-900)",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 4,
        outline: "none",
        padding: 0,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
    />
  );
}

function PresetSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (presetIdx: number) => void;
}) {
  return (
    <select
      value={value === null ? "custom" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "custom") return;
        onChange(parseInt(v, 10));
      }}
      style={{
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        padding: "4px 8px",
        border: "1px solid var(--neutral-200)",
        borderRadius: 6,
        background: "var(--neutral-0)",
        color: "var(--neutral-700)",
        cursor: "pointer",
        outline: "none",
        minWidth: 124,
      }}
    >
      {KERNEL_PRESETS.map((p, i) => (
        <option key={p.name} value={i}>
          {p.name}
        </option>
      ))}
      {value === null && <option value="custom">Custom</option>}
    </select>
  );
}

function OutputTile({ index, image }: { index: number; image: GrayImage }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    // |value| rendering matches Filter Lab so negative-result kernels
    // (Sobel, Emboss) display their full range.
    renderGrayToCanvas(ref.current, image, "abs");
  }, [image]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <canvas
        ref={ref}
        width={image.width}
        height={image.height}
        style={{
          width: OUTPUT_DISPLAY_PX,
          height: OUTPUT_DISPLAY_PX,
          imageRendering: "pixelated",
          borderRadius: 8,
          border: "1px solid var(--neutral-200)",
          background: "var(--neutral-100)",
        }}
      />
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-700)" }}>
        Output {index + 1}
      </span>
    </div>
  );
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

function formatCell(v: number): string {
  const fixed = v.toFixed(3);
  return parseFloat(fixed).toString();
}
