"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = { data: { label: string; count: number }[] };

export function Histogram({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div
        style={{
          padding: "32px 16px",
          background: "var(--neutral-0)",
          border: "1px dashed var(--neutral-300)",
          borderRadius: 8,
          textAlign: "center",
          fontSize: 14,
          color: "var(--neutral-500)",
        }}
      >
        No time data yet for this session.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        padding: 24,
        height: 280,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--neutral-500)" }}
            axisLine={{ stroke: "var(--neutral-300)" }}
            tickLine={false}
            label={{ value: "minutes", position: "insideBottom", offset: -4, fontSize: 12, fill: "var(--neutral-500)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--neutral-500)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--neutral-100)" }}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--neutral-200)" }}
            formatter={(v: number) => [`${v} ${v === 1 ? "student" : "students"}`, "count"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--accent)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
