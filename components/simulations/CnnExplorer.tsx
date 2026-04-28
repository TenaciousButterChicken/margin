"use client";

import { useState } from "react";
import { FilterLab } from "./cnn/FilterLab";
import { LayerExplorer } from "./cnn/LayerExplorer";

// CNN Explorer — top-level shell. Mode toggle (segmented control,
// matches the Classification/Regression toggle in NeuralNetPlayground)
// switches between two complementary views:
//   • Filter Lab    — manual 3×3 convolution kernel + grayscale demo image
//   • Layer Explorer — pretrained MobileNet feature maps on preset images

type Mode = "filter" | "layer";

export function CnnExplorer() {
  const [mode, setMode] = useState<Mode>("filter");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "filter" ? <FilterLab /> : <LayerExplorer />}
    </div>
  );
}

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
      <Segment active={mode === "filter"} onClick={() => onChange("filter")} label="Filter Lab" />
      <Segment active={mode === "layer"} onClick={() => onChange("layer")} label="Layer Explorer" />
    </div>
  );
}

function Segment({
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
