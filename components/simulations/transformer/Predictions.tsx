"use client";

// Top-K horizontal bar chart. Top prediction is clay accent; the rest
// are lab-cyan. Bars scale to the max of the visible top-K.

type Prediction = { index: number; prob: number; text: string };

export function Predictions({ predictions }: { predictions: Prediction[] }) {
  if (predictions.length === 0) {
    return (
      <div
        style={{
          padding: 14,
          background: "var(--neutral-50)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 10,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
        }}
      >
        decoding…
      </div>
    );
  }
  const max = Math.max(...predictions.map((p) => p.prob), 1e-6);
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {predictions.map((p, i) => {
        const isTop = i === 0;
        const barColor = isTop ? "var(--accent)" : "var(--lab-cyan)";
        const labelColor = isTop ? "var(--neutral-900)" : "var(--neutral-700)";
        const valueColor = isTop ? "var(--accent)" : "var(--neutral-500)";
        return (
          <div key={p.index} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: isTop ? 600 : 500,
                color: labelColor,
                minWidth: 140,
                whiteSpace: "pre",
              }}
            >
              {renderTokenText(p.text)}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "var(--neutral-100)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(p.prob / max) * 100}%`,
                  background: barColor,
                  borderRadius: 4,
                  transition: "width 200ms ease",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: isTop ? 600 : 400,
                color: valueColor,
                minWidth: 56,
                textAlign: "right",
              }}
            >
              {(p.prob * 100).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderTokenText(text: string): string {
  if (text === "") return "∅";
  if (text === " ") return "· (space)";
  if (text === "\n") return "↵ (newline)";
  if (text.startsWith(" ")) return "·" + text.slice(1);
  return text;
}
