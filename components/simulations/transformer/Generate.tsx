"use client";

// Temperature slider (0–2) + Generate button. Live updates the
// distribution above as the slider moves.

export function Generate({
  temperature,
  onTemperatureChange,
  onGenerate,
  generating,
}: {
  temperature: number;
  onTemperatureChange: (t: number) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-700)",
            fontWeight: 600,
            minWidth: 100,
          }}
        >
          TEMPERATURE
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          style={{
            flex: 1,
            accentColor: "var(--accent)",
            cursor: "pointer",
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            color: "var(--accent)",
            minWidth: 48,
            textAlign: "right",
          }}
        >
          {temperature.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn btn-primary btn-sm"
          style={{ minWidth: 160 }}
        >
          {generating ? "Generating…" : "Generate next token"}
        </button>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            lineHeight: 1.4,
          }}
        >
          samples one token from the temperature-adjusted distribution and
          appends it.
        </span>
      </div>
    </div>
  );
}
