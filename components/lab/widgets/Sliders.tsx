"use client";

import { useEffect, useState } from "react";
import { usePublish } from "@/lib/lab/LabContext";

// Visual slider matched to design package's lab-session6.jsx Slider:
// label + value top row, then a track with a colored fill + a circular
// thumb, with a transparent native <input range> overlaid for interaction.

type ControlDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  color?: "lab-cyan" | "lab-warm" | "lab-teal";
  formatter?: "integer" | "fixed1" | "fixed2" | "fixed3" | "scientific";
  publishesAs?: string;
};

type ActionDef = {
  key: string;
  label: string;
  style?: "primary" | "secondary";
  publishesAs?: string;
};

type Props = {
  controls: ControlDef[];
  actions?: ActionDef[];
};

const fmt: Record<NonNullable<ControlDef["formatter"]>, (v: number) => string> = {
  integer:    (v) => Math.round(v).toString(),
  fixed1:     (v) => v.toFixed(1),
  fixed2:     (v) => v.toFixed(2),
  fixed3:     (v) => v.toFixed(3),
  scientific: (v) => v.toExponential(2),
};

export function SlidersWidget({ controls, actions = [] }: Props) {
  const pub = usePublish();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {controls.map((c) => {
        const { key, ...rest } = c;
        return (
          <SingleSlider
            key={key}
            controlKey={key}
            {...rest}
            onChange={(v) => c.publishesAs && pub.set(c.publishesAs, v)}
          />
        );
      })}
      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {actions.map((a) => (
            <button
              key={a.key}
              className={`btn ${a.style === "secondary" ? "btn-secondary" : "btn-primary"} btn-sm`}
              style={{ flex: 1 }}
              onClick={() => a.publishesAs && pub.pulse(a.publishesAs)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSlider({
  label,
  min,
  max,
  step,
  initial,
  color = "lab-cyan",
  formatter = "fixed3",
  publishesAs,
  controlKey,
  onChange,
}: Omit<ControlDef, "key"> & { controlKey: string; onChange: (v: number) => void }) {
  void controlKey; // reserved for future per-control persistence keys
  const [value, setValue] = useState(initial);

  // Push the initial value once so subscribers (e.g. the simulator) get it.
  useEffect(() => {
    if (publishesAs) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = ((value - min) / (max - min)) * 100;
  const swatch = `var(--${color})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-700)" }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--neutral-900)", fontWeight: 600 }}>
          {fmt[formatter](value)}
        </span>
      </div>
      <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "var(--neutral-200)", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 4, background: swatch, borderRadius: 2 }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setValue(v);
            onChange(v);
          }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            height: 18,
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: swatch,
            boxShadow: "0 0 0 2px var(--neutral-0), 0 1px 2px rgba(0,0,0,0.15)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
