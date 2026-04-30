"use client";

import { useEffect, useState } from "react";
import { useChannel } from "@/lib/lab/LabContext";
import { loss } from "@/lib/lab/sim/gradient-descent";

// Beat 7 phase 1 widget. Forces b = 0 (the line passes through the
// origin) and plots dots at (m, total error) as the student slides m.
// After enough unique buckets are visited, the dots trace out the
// underlying parabola - showing that "the bowl" is just this curve plus
// one extra dimension.

const W1_MIN = -0.5;
const W1_MAX = 1.5;
const N_BUCKETS = 30;
const BUCKET_WIDTH = (W1_MAX - W1_MIN) / N_BUCKETS;
const ENOUGH_BUCKETS = 10; // unlocks the "Reveal the bowl" button

const VB_W = 520;
const VB_H = 360;
const PAD_L = 50;
const PAD_R = 16;
const PAD_T = 28;
const PAD_B = 40;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

// Pre-sample the underlying parabola for the faint reference curve.
const SAMPLES: { w1: number; cost: number }[] = [];
for (let i = 0; i <= 100; i++) {
  const w1 = W1_MIN + (i / 100) * (W1_MAX - W1_MIN);
  SAMPLES.push({ w1, cost: loss(0, w1) });
}
const COST_MAX = Math.max(...SAMPLES.map((s) => s.cost));

function wToX(w1: number) {
  return PAD_L + ((w1 - W1_MIN) / (W1_MAX - W1_MIN)) * PLOT_W;
}
function costToY(cost: number) {
  return PAD_T + (1 - cost / COST_MAX) * PLOT_H;
}

type Pos = { w0: number; w1: number };

export function Parabola2D({ onAdvance }: { onAdvance?: () => void }) {
  const pos = useChannel<Pos>("w_position") ?? { w0: 0, w1: 0 };
  const [visited, setVisited] = useState<Set<number>>(new Set());

  useEffect(() => {
    const idx = Math.floor((pos.w1 - W1_MIN) / BUCKET_WIDTH);
    if (idx < 0 || idx >= N_BUCKETS) return;
    setVisited((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, [pos.w1]);

  // Reveal-curve path
  const pathD = SAMPLES.map((s, i) => {
    const x = wToX(s.w1);
    const y = costToY(s.cost);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const visitedDots = Array.from(visited).map((idx) => {
    const w1 = W1_MIN + (idx + 0.5) * BUCKET_WIDTH;
    return { x: wToX(w1), y: costToY(loss(0, w1)) };
  });

  const currentX = wToX(Math.max(W1_MIN, Math.min(W1_MAX, pos.w1)));
  const currentY = costToY(loss(0, Math.max(W1_MIN, Math.min(W1_MAX, pos.w1))));

  const enough = visited.size >= ENOUGH_BUCKETS;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 380,
        background: "var(--neutral-50)",
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ flex: 1 }}
      >
        {/* axes */}
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={PAD_T + PLOT_H}
          stroke="var(--neutral-300)"
          strokeWidth={1}
        />
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--neutral-300)"
          strokeWidth={1}
        />
        {/* axis labels */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={VB_H - 12}
          textAnchor="middle"
          fontSize={11}
          fontFamily="var(--font-mono)"
          fill="var(--neutral-500)"
        >
          m (slope) - b forced to 0
        </text>
        <text
          x={16}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          fontSize={11}
          fontFamily="var(--font-mono)"
          fill="var(--neutral-500)"
          transform={`rotate(-90, 16, ${PAD_T + PLOT_H / 2})`}
        >
          total error
        </text>
        {/* faint reference parabola - revealed as more dots accumulate */}
        <path
          d={pathD}
          stroke="var(--neutral-300)"
          strokeWidth={1}
          fill="none"
          strokeDasharray="3 4"
          opacity={0.4 + Math.min(0.4, visited.size * 0.04)}
        />
        {/* visited dots */}
        {visitedDots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={4}
            fill="var(--accent)"
            opacity={0.75}
          />
        ))}
        {/* current position - bigger ring */}
        <circle
          cx={currentX}
          cy={currentY}
          r={7}
          fill="var(--accent)"
          stroke="var(--neutral-0)"
          strokeWidth={2}
        />
      </svg>

      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--neutral-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flex: "none",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
          }}
        >
          {visited.size} / {ENOUGH_BUCKETS} positions explored
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={onAdvance}
          disabled={!enough}
          style={{ opacity: enough ? 1 : 0.5 }}
          title={
            enough
              ? "Unlock b - watch the parabola become a bowl"
              : `Slide m through at least ${ENOUGH_BUCKETS} different positions`
          }
        >
          Reveal the bowl →
        </button>
      </div>
    </div>
  );
}
