"use client";

import { useChannel, usePublish } from "@/lib/lab/LabContext";
import { gradient, loss, distanceToOptimum } from "@/lib/lab/sim/gradient-descent";
import { HIKER_START } from "@/lib/lab/beats";

// Step controls for beats 4 and 5. Owns the gradient-step logic; the
// parent passes config and gets a step counter back.
//
// Beat 4: variant="single" - one click = one step (lr usually 0.08).
// Beat 5: variant="four"   - one click = four steps (lr locked at 0.001).
//                            Also renders a progress bar.

type Pos = { w0: number; w1: number };

type HistoryPt = { w0: number; w1: number; loss: number };

const START_DISTANCE = distanceToOptimum(HIKER_START.w0, HIKER_START.w1);

export function StepControls({
  variant,
  lr,
  showProgressBar,
  onStep,
}: {
  variant: "single" | "four";
  lr: number;
  showProgressBar?: boolean;
  /** Called once per click (after stepping). The parent uses this for completion + reveals. */
  onStep: (totalClicks: number) => void;
}) {
  const pos = useChannel<Pos>("w_position") ?? HIKER_START;
  const history = useChannel<HistoryPt[]>("w_history") ?? [];
  const pub = usePublish();

  const stepsPerClick = variant === "single" ? 1 : 4;
  const buttonLabel = variant === "single" ? "Step" : "Step ×4";
  const totalClicks = computeClicks(history.length, stepsPerClick);

  function step() {
    let cur: Pos = pos;
    const newHistory = history.length === 0
      ? [{ w0: cur.w0, w1: cur.w1, loss: loss(cur.w0, cur.w1) }]
      : [...history];

    for (let i = 0; i < stepsPerClick; i++) {
      const [g0, g1] = gradient(cur.w0, cur.w1);
      cur = { w0: cur.w0 - lr * g0, w1: cur.w1 - lr * g1 };
      newHistory.push({ w0: cur.w0, w1: cur.w1, loss: loss(cur.w0, cur.w1) });
    }

    pub.set("w_position", cur);
    pub.set("w_history", newHistory);
    onStep(totalClicks + 1);
  }

  // Progress = how much closer to the minimum the hiker has come, as a
  // fraction of the original distance.
  const currentDistance = distanceToOptimum(pos.w0, pos.w1);
  const progress = Math.max(0, Math.min(1, 1 - currentDistance / START_DISTANCE));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 20px",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="t-meta">Controls</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            lr = {lr.toString().includes("e") || lr < 0.01 ? lr.toFixed(4) : lr.toFixed(3)}
            {"  ·  "}
            steps taken: {history.length > 0 ? history.length - 1 : 0}
          </span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={step}
          style={{ minWidth: 100 }}
        >
          {buttonLabel}
        </button>
      </div>

      {showProgressBar && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            <span>distance to minimum</span>
            <span style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
              {(progress * 100).toFixed(1)}% there
            </span>
          </div>
          <div style={{ position: "relative", height: 6, background: "var(--neutral-200)", borderRadius: 3 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${progress * 100}%`,
                background: progress < 0.1 ? "var(--lab-warm)" : "var(--lab-cyan)",
                borderRadius: 3,
                transition: "width 280ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function computeClicks(historyLen: number, stepsPerClick: number): number {
  if (historyLen <= 1) return 0;
  return Math.floor((historyLen - 1) / stepsPerClick);
}
