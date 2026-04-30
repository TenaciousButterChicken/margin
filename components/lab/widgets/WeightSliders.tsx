"use client";

import { useChannel, usePublish } from "@/lib/lab/LabContext";

// Beat 7 controls. Two sliders, written in standardized space:
//   - m (slope, w1)   always active
//   - b (intercept, w0)   gated by `bUnlocked`
// In phase 1, b is locked to 0 - any external publish that sets w0 != 0
// is overridden on the next slider move. (We don't fight the channel
// continuously; the slider only WRITES, so as long as the user is
// driving via the slider, w0 stays where the slider says.)
//
// Standardized ranges chosen to span the data: w1 ∈ [-0.5, 1.5] is
// where the parabola lives; w0 ∈ [-1, 1] covers the bowl in 3D.

type Pos = { w0: number; w1: number };

export function WeightSliders({ bUnlocked }: { bUnlocked: boolean }) {
  const pos = useChannel<Pos>("w_position") ?? { w0: 0, w1: 0 };
  const pub = usePublish();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 16px",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
      }}
    >
      <SliderRow
        label="m"
        sublabel="slope"
        accent="var(--lab-cyan)"
        value={pos.w1}
        min={-0.5}
        max={1.5}
        onChange={(v) =>
          pub.set("w_position", { w0: bUnlocked ? pos.w0 : 0, w1: v })
        }
      />
      <SliderRow
        label="b"
        sublabel={bUnlocked ? "intercept" : "locked at 0"}
        accent="var(--lab-warm)"
        value={pos.w0}
        min={-1}
        max={1}
        disabled={!bUnlocked}
        onChange={(v) => pub.set("w_position", { w0: v, w1: pos.w1 })}
      />
    </div>
  );
}

function SliderRow({
  label,
  sublabel,
  accent,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: {
  label: string;
  sublabel: string;
  accent: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontFamily: "var(--font-mono)",
          color: accent,
          fontWeight: 700,
          width: 24,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
          width: 80,
        }}
      >
        {sublabel}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ flex: 1, cursor: disabled ? "not-allowed" : "pointer" }}
      />
      <span
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-700)",
          width: 50,
          textAlign: "right",
        }}
      >
        {value.toFixed(2)}
      </span>
    </div>
  );
}
