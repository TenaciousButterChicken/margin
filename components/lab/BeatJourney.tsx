"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { BEATS, BEAT_ORDER, nextBeat, type Beat, type BeatId } from "@/lib/lab/beats";
import { DataScatter2D } from "./widgets/DataScatter2D";
import { PredictPanel } from "./widgets/PredictPanel";
import { useChannel } from "@/lib/lab/LabContext";
import { loss } from "@/lib/lab/sim/gradient-descent";

// Three.js can't SSR — dynamic import.
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

// State for tracking beat-completion criteria. Beat 1 = lossBelow.
// Beat 2 = both line and bowl have been dragged. Beat 6 = predicted+ran.
type Progress = {
  draggedLine: boolean;
  draggedBowl: boolean;
  beat6Done: boolean;
};

export function BeatJourney() {
  const [beat, setBeat] = useState<BeatId>(1);
  const [progress, setProgress] = useState<Progress>({
    draggedLine: false,
    draggedBowl: false,
    beat6Done: false,
  });
  const [revealOpen, setRevealOpen] = useState(false);
  const [pulseGreen, setPulseGreen] = useState(false);
  const pos = useChannel<Pos>("w_position");

  const cfg = BEATS[beat];

  // Reset progress + reveal when beat changes.
  useEffect(() => {
    setRevealOpen(false);
    setPulseGreen(false);
    if (beat === 1) {
      setProgress({ draggedLine: false, draggedBowl: false, beat6Done: false });
    }
  }, [beat]);

  // Compute whether the current beat's completion criterion is satisfied.
  const complete = useMemo(() => {
    switch (cfg.completion.kind) {
      case "loss_below": {
        if (!pos) return false;
        return loss(pos.w0, pos.w1) < cfg.completion.threshold;
      }
      case "dragged_both":
        return progress.draggedLine && progress.draggedBowl;
      case "predicted_and_ran":
        return progress.beat6Done;
      case "always":
        return true;
    }
  }, [cfg, pos, progress]);

  // First time the beat completes, fire the reveal + (for beat 1) the
  // pulse-green animation.
  const completeFiredRef = useRef<BeatId | null>(null);
  useEffect(() => {
    if (complete && completeFiredRef.current !== beat) {
      completeFiredRef.current = beat;
      if (cfg.reveal) setRevealOpen(true);
      if (beat === 1) {
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
          gridTemplateColumns: cfg.unlocks.showBowl ? "1fr 1fr" : "1fr",
          gap: 12,
          minHeight: 0,
        }}
      >
        {cfg.unlocks.showLine && (
          <PanelFrame title="Data" kicker="study hours × exam score">
            <DataScatter2D
              draggable={cfg.unlocks.lineDraggable}
              pulseGreen={pulseGreen}
              onLineDragged={() =>
                setProgress((p) => (p.draggedLine ? p : { ...p, draggedLine: true }))
              }
            />
          </PanelFrame>
        )}

        {cfg.unlocks.showBowl && (
          <PanelFrame
            title="Cost surface"
            kicker={cfg.unlocks.bowlDraggable ? "drag the marker" : "3D · w₀ × w₁"}
            slideIn
          >
            <Surface3D
              draggable={cfg.unlocks.bowlDraggable}
              mode={cfg.unlocks.showHikerTrail ? "trail" : "marker"}
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

      {/* Beat-specific UI below the panels */}
      {cfg.unlocks.showPredictPanel && cfg.unlocks.lrLockedAt !== undefined && (
        <PredictPanel
          lockedLr={cfg.unlocks.lrLockedAt}
          onComplete={() =>
            setProgress((p) => (p.beat6Done ? p : { ...p, beat6Done: true }))
          }
        />
      )}

      {/* Reveal box — appears when the beat completes */}
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

      {/* Footer: prev / next */}
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
          disabled={beat === 1}
          style={{ visibility: beat === 1 ? "hidden" : "visible" }}
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
              width: 14,
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

// Tiny hidden component that watches for w_position changes and reports
// drag events upward. Used in beat 2 only — DataScatter has its own
// onLineDragged callback; the bowl needs this since dragging happens
// inside Three.js.
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
  // Friendly, quiet nudge to tell the user what they need to do.
  switch (c.kind) {
    case "loss_below": {
      if (!pos) return "drag a handle";
      const cur = loss(pos.w0, pos.w1);
      return `loss ${cur.toFixed(2)} → target < ${c.threshold}`;
    }
    case "dragged_both":
      if (!progress.draggedLine && !progress.draggedBowl) return "drag either side";
      if (!progress.draggedLine) return "now drag the line on the left";
      if (!progress.draggedBowl) return "now drag the marker on the bowl";
      return "";
    case "predicted_and_ran":
      return progress.beat6Done ? "" : "pick one";
    case "always":
      return "";
  }
  return "";
}
