"use client";

import { useChannel, usePublish } from "@/lib/lab/LabContext";
import { gradient, loss } from "@/lib/lab/sim/gradient-descent";

// Beat 3 - the "blindfolded" UI. Two big arrow buttons. Picking the
// downhill arrow steps the hiker downhill (and counts as a correct
// choice; the parent uses correctChoices to clear fog). Picking
// uphill steps the hiker uphill (no progress, no fog clearing).
//
// We compute the gradient at the current position and act on it
// directly. No slider involved here.

const STEP_LR = 0.18; // big enough for the hiker to clearly move

type Pos = { w0: number; w1: number };

export function DirectionChoice({
  onCorrect,
  onWrong,
  disabled,
}: {
  onCorrect: () => void;
  onWrong: () => void;
  disabled?: boolean;
}) {
  const pos = useChannel<Pos>("w_position") ?? { w0: -1.4, w1: -1.2 };
  const pub = usePublish();
  const [g0, g1] = gradient(pos.w0, pos.w1);

  function step(direction: "uphill" | "downhill") {
    if (disabled) return;
    const sign = direction === "uphill" ? +1 : -1;
    // Take a step in the chosen direction (downhill = -gradient, uphill = +gradient).
    const newPos: Pos = { w0: pos.w0 + sign * STEP_LR * g0, w1: pos.w1 + sign * STEP_LR * g1 };
    // Clamp so they don't fly off the bowl during exploration.
    newPos.w0 = Math.max(-2.2, Math.min(2.2, newPos.w0));
    newPos.w1 = Math.max(-2.2, Math.min(2.2, newPos.w1));
    pub.set("w_position", newPos);
    if (direction === "downhill") onCorrect();
    else onWrong();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 20px",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="t-meta">Which way is downhill?</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          loss = {loss(pos.w0, pos.w1).toFixed(3)}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ChoiceButton label="Walk uphill" arrow="↑" onClick={() => step("uphill")} disabled={disabled} />
        <ChoiceButton label="Walk downhill" arrow="↓" onClick={() => step("downhill")} disabled={disabled} />
      </div>
      <p style={{ fontSize: 12, color: "var(--neutral-500)", margin: 0, lineHeight: 1.45 }}>
        You can&rsquo;t see the bowl. You can only feel the slope under your feet. That&rsquo;s the gradient. Pick a direction and the hiker takes a step.
      </p>
    </div>
  );
}

function ChoiceButton({
  label,
  arrow,
  onClick,
  disabled,
}: {
  label: string;
  arrow: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 120ms, border-color 120ms",
        font: "inherit",
        color: "var(--neutral-900)",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--neutral-100)";
        e.currentTarget.style.borderColor = "var(--neutral-300)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--neutral-50)";
        e.currentTarget.style.borderColor = "var(--neutral-200)";
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1, color: "var(--lab-cyan)" }}>{arrow}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
