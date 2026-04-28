"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { useChannel } from "@/lib/lab/LabContext";

// Loss curve over training steps. Uses the lab-cyan token. Y-axis auto-
// scales when loss diverges. No gridlines, minimal chrome — matches the
// design package's stylized look.

type HistoryPt = { w0: number; w1: number; loss: number };

export function LossCurve() {
  const history = useChannel<HistoryPt[]>("w_history") ?? [];
  const data = history.map((p, i) => ({ step: i, loss: p.loss }));
  const lastLoss = data[data.length - 1]?.loss;

  return (
    <div style={{ width: "100%", height: 140, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="step"
            tick={{ fill: "var(--neutral-500)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            stroke="var(--neutral-300)"
            tickLine={false}
            axisLine={{ stroke: "var(--neutral-300)" }}
          />
          <YAxis
            tick={{ fill: "var(--neutral-500)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            stroke="var(--neutral-300)"
            tickLine={false}
            axisLine={{ stroke: "var(--neutral-300)" }}
            domain={[0, "auto"]}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--neutral-0)",
              border: "1px solid var(--neutral-200)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              padding: "6px 10px",
            }}
            formatter={(v: number) => [v.toFixed(4), "loss"]}
          />
          <ReferenceLine y={0} stroke="var(--neutral-300)" />
          <Line
            type="monotone"
            dataKey="loss"
            stroke="var(--lab-cyan)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {lastLoss !== undefined && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 12,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--lab-cyan)",
            fontWeight: 600,
          }}
        >
          loss = {lastLoss.toFixed(4)}
        </span>
      )}
    </div>
  );
}
