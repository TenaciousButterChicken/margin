"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BEATS,
  BEAT_ORDER,
  FOCUS_DOT,
  HIKER_START,
  nextBeat,
  type Beat,
  type BeatId,
} from "@/lib/lab/beats";
import { DataScatter2D } from "./widgets/DataScatter2D";
import { PredictPanel } from "./widgets/PredictPanel";
import { DirectionChoice } from "./widgets/DirectionChoice";
import { StepControls } from "./widgets/StepControls";
import { MathStrip } from "./widgets/MathStrip";
import { useChannel, usePublish, usePulseToken } from "@/lib/lab/LabContext";
import { DATASET, gradient, loss } from "@/lib/lab/sim/gradient-descent";

const Surface3D = dynamic(
  () => import("./widgets/Surface3D").then((m) => m.Surface3D),
  { ssr: false, loading: () => <BowlPlaceholder /> }
);

function BowlPlaceholder() {
  return (
    <div
      style={{
        height: 380,
        background: "var(--neutral-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-500)",
      }}
    >
      loading 3D bowl…
    </div>
  );
}

type Pos = { w0: number; w1: number };

type Progress = {
  draggedLine: boolean;
  draggedBowl: boolean;
  beat6Done: boolean;
  correctChoices: number;
  wrongChoices: number;
  stepClicks: number;
  nudgeClicks: number;
  /** Beat 4.6 + 4.7 — current phase index (1-indexed). */
  phase: number;
  /** Beat 4.7 — descent vs ascent toggle (drives Surface3D arrowDirection). */
  arrowDirection: "downhill" | "uphill";
  /** Beat 4.8 — locked-in predict answer */
  predictAnswer: "a" | "b" | "c" | null;
  /** Beat 4.8 — full algorithm steps taken */
  algoSteps: number;
};

const DEFAULT_PROGRESS: Progress = {
  draggedLine: false,
  draggedBowl: false,
  beat6Done: false,
  correctChoices: 0,
  wrongChoices: 0,
  stepClicks: 0,
  nudgeClicks: 0,
  phase: 1,
  arrowDirection: "downhill",
  predictAnswer: null,
  algoSteps: 0,
};

// Standardization for the single-dot nudge math.
const X_MEAN = 5.5;
const X_STD = Math.sqrt(8.25);
const Y_VALUES = DATASET.map(([, y]) => y);
const Y_MEAN = Y_VALUES.reduce((a, b) => a + b, 0) / Y_VALUES.length;
const Y_STD = Math.sqrt(
  Y_VALUES.reduce((a, b) => a + (b - Y_MEAN) ** 2, 0) / Y_VALUES.length
);

// Single-dot nudge step. Computes the gradient contribution from the
// focus dot only and steps in the negative-gradient direction. lr_nudge
// is tuned so 3-4 clicks visibly bring the line to the dot.
const NUDGE_LR = 0.18;

function nudgeTowardFocusDot(pos: Pos): Pos {
  const [xOrig, yOrig] = DATASET[FOCUS_DOT];
  const xn = (xOrig - X_MEAN) / X_STD;
  const yn = (yOrig - Y_MEAN) / Y_STD;
  // Single-dot loss = (w0 + w1*xn - yn)^2
  // ∂L/∂w0 = 2*(predicted - actual)
  // ∂L/∂w1 = 2*(predicted - actual)*xn
  const errN = pos.w0 + pos.w1 * xn - yn;
  const g0 = 2 * errN;
  const g1 = 2 * errN * xn;
  return { w0: pos.w0 - NUDGE_LR * g0, w1: pos.w1 - NUDGE_LR * g1 };
}

export function BeatJourney() {
  const [beat, setBeat] = useState<BeatId>("1");
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [revealOpen, setRevealOpen] = useState(false);
  const [pulseGreen, setPulseGreen] = useState(false);
  const pos = useChannel<Pos>("w_position");
  const pub = usePublish();
  const resetToken = usePulseToken("do_reset");

  const cfg = BEATS[beat];

  // Beat enter: optional position override + reset progress for this beat.
  useEffect(() => {
    setRevealOpen(false);
    setPulseGreen(false);
    if (cfg.startPosition) {
      pub.set("w_position", cfg.startPosition);
      pub.set("w_history", []);
    } else if (cfg.resetOnEnter) {
      pub.set("w_position", HIKER_START);
      pub.set("w_history", []);
    }
    if (beat === "1") {
      setProgress(DEFAULT_PROGRESS);
    } else {
      setProgress((p) => ({
        ...p,
        correctChoices: 0,
        wrongChoices: 0,
        stepClicks: 0,
        beat6Done: false,
        nudgeClicks: 0,
        phase: 1,
        arrowDirection: "downhill",
        predictAnswer: null,
        algoSteps: 0,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    if (resetToken === 0) return;
    if (cfg.startPosition) {
      pub.set("w_position", cfg.startPosition);
      pub.set("w_history", []);
    } else if (cfg.resetOnEnter) {
      pub.set("w_position", HIKER_START);
      pub.set("w_history", []);
    } else {
      pub.set("w_position", { w0: 2, w1: -1 });
      pub.set("w_history", []);
    }
    setProgress((p) => ({
      ...p,
      correctChoices: 0,
      wrongChoices: 0,
      stepClicks: 0,
      beat6Done: false,
      nudgeClicks: 0,
      phase: 1,
      arrowDirection: "downhill",
      predictAnswer: null,
      algoSteps: 0,
    }));
    setRevealOpen(false);
    completeFiredRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  const complete = useMemo(() => {
    switch (cfg.completion.kind) {
      case "loss_below":
        if (!pos) return false;
        return loss(pos.w0, pos.w1) < cfg.completion.threshold;
      case "dragged_both":
        return progress.draggedLine && progress.draggedBowl;
      case "predicted_and_ran":
        return progress.beat6Done;
      case "correct_choices":
        return progress.correctChoices >= cfg.completion.needed;
      case "step_count":
        return progress.stepClicks >= cfg.completion.needed;
      case "nudge_count":
        return progress.nudgeClicks >= cfg.completion.needed;
      case "phase_count":
        return progress.phase >= cfg.completion.needed;
      case "predict_answered":
        return progress.predictAnswer !== null;
      case "always":
        return true;
    }
  }, [cfg, pos, progress]);

  const completeFiredRef = useRef<BeatId | null>(null);
  useEffect(() => {
    if (complete && completeFiredRef.current !== beat) {
      completeFiredRef.current = beat;
      if (cfg.reveal) setRevealOpen(true);
      if (beat === "1") {
        setPulseGreen(true);
        setTimeout(() => setPulseGreen(false), 800);
      }
    }
  }, [complete, beat, cfg.reveal]);

  function advance() {
    const nb = nextBeat(beat);
    if (nb) setBeat(nb);
  }

  function rewind() {
    const idx = BEAT_ORDER.indexOf(beat);
    if (idx > 0) setBeat(BEAT_ORDER[idx - 1]);
  }

  function handleNudge() {
    if (!pos) return;
    const next = nudgeTowardFocusDot(pos);
    pub.set("w_position", next);
    setProgress((p) => ({ ...p, nudgeClicks: p.nudgeClicks + 1 }));
  }

  function handlePhaseAdvance() {
    setProgress((p) => ({ ...p, phase: p.phase + 1 }));
  }

  function handleDirectionToggle(d: "downhill" | "uphill") {
    setProgress((p) => ({ ...p, arrowDirection: d }));
  }

  function handleTakeStep() {
    // Beat 4.7 phase 3 — apply w_new = w − lr × g and advance the hiker.
    if (!pos) return;
    const LR = 0.08;
    const [g0, g1] = gradient(pos.w0, pos.w1);
    const next = { w0: pos.w0 - LR * g0, w1: pos.w1 - LR * g1 };
    pub.set("w_position", next);
  }

  function handleAlgoStep() {
    // Beat 4.8 — full algorithm step.
    if (!pos) return;
    const LR = 0.08;
    const [g0, g1] = gradient(pos.w0, pos.w1);
    const mag = Math.hypot(g0, g1);
    if (mag < 0.01) {
      // At minimum — w − lr × 0 = w. The "no movement" moment.
      setProgress((p) => ({ ...p, algoSteps: p.algoSteps + 1 }));
      return;
    }
    const next = { w0: pos.w0 - LR * g0, w1: pos.w1 - LR * g1 };
    pub.set("w_position", next);
    const history = pub.get<{ w0: number; w1: number; loss: number }[]>("w_history") ?? [];
    pub.set("w_history", [
      ...history,
      { w0: next.w0, w1: next.w1, loss: loss(next.w0, next.w1) },
    ]);
    setProgress((p) => ({ ...p, algoSteps: p.algoSteps + 1 }));
  }

  function handlePredict(answer: "a" | "b" | "c") {
    setProgress((p) => ({ ...p, predictAnswer: answer }));
  }

  const fogIntensity = cfg.unlocks.fogged
    ? Math.max(0, 1 - progress.correctChoices * cfg.unlocks.fogIntensityForCorrect)
    : 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: 16,
        gap: 14,
        overflow: "auto",
      }}
    >
      {/* Beat header */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          paddingBottom: 8,
          borderBottom: "1px solid var(--neutral-200)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="t-meta" style={{ color: "var(--accent)" }}>{cfg.kicker}</span>
          <BeatProgress current={beat} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.5,
            color: "var(--neutral-900)",
            fontWeight: 500,
          }}
        >
          {cfg.prompt}
        </p>
      </header>

      {/* Linked panels */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            cfg.unlocks.showLine && cfg.unlocks.showBowl
              ? "1fr 1fr"
              : "1fr",
          gap: 12,
          minHeight: 0,
        }}
      >
        {cfg.unlocks.showLine && (
          <PanelFrame title="Data" kicker="study hours × exam score">
            <DataScatter2D
              draggable={cfg.unlocks.lineDraggable}
              pulseOnce={pulseGreen}
              successThreshold={
                cfg.completion.kind === "loss_below"
                  ? cfg.completion.threshold
                  : undefined
              }
              onLineDragged={() =>
                setProgress((p) => (p.draggedLine ? p : { ...p, draggedLine: true }))
              }
              highlightDotIndex={cfg.unlocks.highlightDotIndex}
              showAllPullArrows={cfg.unlocks.showAllPullArrows}
              boldErrorBars={cfg.unlocks.boldErrorBars}
            />
          </PanelFrame>
        )}

        {cfg.unlocks.showBowl && (
          <PanelFrame
            title="Cost surface"
            kicker={
              cfg.unlocks.bowlDraggable
                ? "drag the marker"
                : cfg.unlocks.fogged
                ? "you can only feel the slope"
                : "3D · w₀ × w₁"
            }
            slideIn={beat === "2"}
          >
            <Surface3D
              draggable={cfg.unlocks.bowlDraggable}
              mode={cfg.unlocks.showHikerTrail ? "trail" : "marker"}
              showGradient={cfg.unlocks.showGradientArrow ? "single" : "none"}
              arrowDirection={progress.arrowDirection}
              fogIntensity={fogIntensity}
              showMinimumMarker={cfg.unlocks.showMinimumMarker}
              hikerGlow={cfg.unlocks.hikerGlow}
            />
            {cfg.unlocks.bowlDraggable && (
              <BowlDragWatcher
                onDrag={() =>
                  setProgress((p) => (p.draggedBowl ? p : { ...p, draggedBowl: true }))
                }
              />
            )}
          </PanelFrame>
        )}
      </section>

      {/* Math strip — beat 4.5+ */}
      {cfg.unlocks.showMathStrip && cfg.unlocks.mathStripBeat && (
        <MathStrip
          beat={cfg.unlocks.mathStripBeat}
          nudgeCount={progress.nudgeClicks}
          nudgesNeeded={
            cfg.completion.kind === "nudge_count" ? cfg.completion.needed : 0
          }
          phase={progress.phase}
          predictAnswer={progress.predictAnswer}
          steps={progress.algoSteps}
          callbacks={{
            onNudge: handleNudge,
            onPhaseAdvance: handlePhaseAdvance,
            onDirectionToggle: handleDirectionToggle,
            onTakeStep: handleTakeStep,
            onStep: handleAlgoStep,
            onPredict: handlePredict,
          }}
        />
      )}

      {/* Beat-specific UI below the panels */}
      {cfg.unlocks.showDirectionChoice && (
        <DirectionChoice
          disabled={complete}
          onCorrect={() =>
            setProgress((p) => ({ ...p, correctChoices: p.correctChoices + 1 }))
          }
          onWrong={() =>
            setProgress((p) => ({ ...p, wrongChoices: p.wrongChoices + 1 }))
          }
        />
      )}

      {(cfg.unlocks.showStepOnce || cfg.unlocks.showStepFour) &&
        cfg.unlocks.lrLockedAt !== undefined && (
          <StepControls
            variant={cfg.unlocks.showStepOnce ? "single" : "four"}
            lr={cfg.unlocks.lrLockedAt}
            showProgressBar={cfg.unlocks.showProgressBar}
            onStep={(clicks) =>
              setProgress((p) => ({ ...p, stepClicks: clicks }))
            }
          />
        )}

      {cfg.unlocks.showPredictPanel && cfg.unlocks.lrLockedAt !== undefined && (
        <PredictPanel
          lockedLr={cfg.unlocks.lrLockedAt}
          onComplete={() =>
            setProgress((p) => (p.beat6Done ? p : { ...p, beat6Done: true }))
          }
        />
      )}

      {/* Reveal box */}
      {revealOpen && cfg.reveal && (
        <div
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--neutral-900)",
            animation: "revealIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {cfg.reveal}
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: 8,
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={rewind}
          disabled={beat === "1"}
          style={{ visibility: beat === "1" ? "hidden" : "visible" }}
        >
          ← back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!complete && cfg.completion.kind !== "always" && (
            <span
              style={{
                fontSize: 12,
                color: "var(--neutral-500)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {hintForCompletion(cfg.completion, pos, progress)}
            </span>
          )}
          {nextBeat(beat) ? (
            <button
              className="btn btn-primary"
              onClick={advance}
              disabled={!complete}
              style={{ opacity: complete ? 1 : 0.5 }}
            >
              Next →
            </button>
          ) : (
            <button className="btn btn-secondary" disabled>
              Lab complete
            </button>
          )}
        </div>
      </footer>

      <style jsx>{`
        @keyframes revealIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function BeatProgress({ current }: { current: BeatId }) {
  const idx = BEAT_ORDER.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
        }}
      >
        {idx + 1} / {BEAT_ORDER.length}
      </span>
      <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
        {BEAT_ORDER.map((b, i) => (
          <span
            key={b}
            style={{
              width: 10,
              height: 4,
              borderRadius: 2,
              background:
                i < idx
                  ? "var(--accent)"
                  : i === idx
                  ? "var(--neutral-700)"
                  : "var(--neutral-200)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PanelFrame({
  title,
  kicker,
  children,
  slideIn,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  slideIn?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: slideIn ? "slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--neutral-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--neutral-50)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-900)" }}>{title}</span>
        {kicker && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--neutral-500)",
            }}
          >
            {kicker}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function BowlDragWatcher({ onDrag }: { onDrag: () => void }) {
  const pos = useChannel<Pos>("w_position");
  const lastSeen = useRef<Pos | null>(null);
  useEffect(() => {
    if (!pos) return;
    if (lastSeen.current && (lastSeen.current.w0 !== pos.w0 || lastSeen.current.w1 !== pos.w1)) {
      onDrag();
    }
    lastSeen.current = pos;
  }, [pos, onDrag]);
  return null;
}

function hintForCompletion(
  c: Beat["completion"],
  pos: Pos | undefined,
  progress: Progress
): string {
  switch (c.kind) {
    case "loss_below": {
      if (!pos) return "drag a handle";
      const cur = loss(pos.w0, pos.w1);
      return `loss ${cur.toFixed(3)} → target < ${c.threshold}`;
    }
    case "dragged_both":
      if (!progress.draggedLine && !progress.draggedBowl) return "drag either side";
      if (!progress.draggedLine) return "now drag the line on the left";
      if (!progress.draggedBowl) return "now drag the marker on the bowl";
      return "";
    case "predicted_and_ran":
      return progress.beat6Done ? "" : "pick one";
    case "correct_choices":
      return progress.correctChoices >= c.needed
        ? ""
        : `${progress.correctChoices} / ${c.needed} correct`;
    case "step_count":
      return progress.stepClicks >= c.needed
        ? ""
        : `${progress.stepClicks} / ${c.needed} clicks`;
    case "nudge_count":
      return progress.nudgeClicks >= c.needed
        ? ""
        : `${progress.nudgeClicks} / ${c.needed} nudges`;
    case "phase_count":
      return progress.phase >= c.needed ? "" : `phase ${progress.phase} / ${c.needed}`;
    case "predict_answered":
      return progress.predictAnswer === null ? "answer the question" : "";
    case "always":
      return "";
  }
}
