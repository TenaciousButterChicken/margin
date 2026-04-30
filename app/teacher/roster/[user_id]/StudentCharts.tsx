"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

type SessionMinute = {
  n: number;
  slug: string;
  title: string;
  minutes: number;
  completed: boolean;
};

export function PerSessionMinutesChart({ data }: { data: SessionMinute[] }) {
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Minutes per session</h3>
        <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>{total} min total</span>
      </div>
      {total === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            background: "var(--neutral-50)",
            border: "1px dashed var(--neutral-300)",
            borderRadius: 6,
            textAlign: "center",
            fontSize: 13,
            color: "var(--neutral-500)",
          }}
        >
          This student hasn&apos;t opened any sessions yet.
        </div>
      ) : (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--neutral-100)" vertical={false} />
              <XAxis
                dataKey="n"
                tick={{ fontSize: 11, fill: "var(--neutral-500)" }}
                axisLine={{ stroke: "var(--neutral-300)" }}
                tickLine={false}
                tickFormatter={(n) => String(n).padStart(2, "0")}
                label={{
                  value: "session",
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 11,
                  fill: "var(--neutral-500)",
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--neutral-500)" }}
                axisLine={false}
                tickLine={false}
                width={32}
                label={{
                  value: "min",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 11,
                  fill: "var(--neutral-500)",
                }}
              />
              <Tooltip
                cursor={{ fill: "var(--neutral-100)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--neutral-200)",
                  padding: "6px 10px",
                }}
                formatter={(v: number) => [`${v} min`, "time"]}
                labelFormatter={(_, payload) => {
                  const d = payload?.[0]?.payload as SessionMinute | undefined;
                  return d ? `${String(d.n).padStart(2, "0")} · ${d.title}` : "";
                }}
              />
              <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.completed ? "var(--accent)" : "var(--neutral-300)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "var(--neutral-500)" }}>
        <LegendDot color="var(--accent)" label="Completed" />
        <LegendDot color="var(--neutral-300)" label="Visited but not completed" />
      </div>
    </div>
  );
}

export function DailyActivityChart({
  data,
}: {
  data: Array<{ date: string; minutes: number }>;
}) {
  const total = data.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Daily activity (last 30 days)</h3>
        <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
          {activeDays} active {activeDays === 1 ? "day" : "days"} · {total} min
        </span>
      </div>
      {total === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            background: "var(--neutral-50)",
            border: "1px dashed var(--neutral-300)",
            borderRadius: 6,
            textAlign: "center",
            fontSize: 13,
            color: "var(--neutral-500)",
          }}
        >
          No activity in the last 30 days.
        </div>
      ) : (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--neutral-100)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--neutral-500)" }}
                axisLine={{ stroke: "var(--neutral-300)" }}
                tickLine={false}
                tickFormatter={(d) => d.slice(5)} /* MM-DD */
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--neutral-500)" }}
                axisLine={false}
                tickLine={false}
                width={32}
                label={{
                  value: "min",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 11,
                  fill: "var(--neutral-500)",
                }}
              />
              <Tooltip
                cursor={{ fill: "var(--neutral-100)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--neutral-200)",
                  padding: "6px 10px",
                }}
                formatter={(v: number) => [`${v} min`, ""]}
                labelFormatter={(d) => d}
              />
              <Bar dataKey="minutes" fill="var(--accent)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
