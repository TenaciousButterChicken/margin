"use client";

import { useEffect, useRef, useState } from "react";
import { usePublish } from "@/lib/lab/LabContext";
import { initialState, stepN, type SimState } from "@/lib/lab/sim/gradient-descent";

// Beat 6: predict + run a divergent simulation.
// User picks a/b/c, then we auto-run with lr = 0.6 → cost explodes →
// camera shake on the bowl → reveal text. Calls onComplete after the
// shake so the BeatJourney can enable Next.

type Choice = "a" | "b" | "c";

const CHOICES: { key: Choice; label: string }[] = [
  { key: "a", label: "(a) Converge faster" },
  { key: "b", label: "(b) Bounce around" },
  { key: "c", label: "(c) Fly off" },
];

export function PredictPanel({
  lockedLr,
  onComplete,
}: {
  lockedLr: number;
  onComplete: () => void;
}) {
  const pub = usePublish();
  const [picked, setPicked] = useState<Choice | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const stateRef = useRef<SimState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function pick(choice: Choice) {
    if (picked) return;
    setPicked(choice);
    setRunning(true);

    // Reset to a known starting position.
    const start = initialState(lockedLr);
    stateRef.current = start;
    pub.set("w_position", { w0: start.w0, w1: start.w1 });
    pub.set("w_history", start.history);

    // Auto-step at ~6 steps/sec until divergence or 30 steps.
    let stepsTaken = 0;
    timerRef.current = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const next = stepN(cur, 1);
      stateRef.current = next;
      stepsTaken++;
      pub.set("w_position", { w0: next.w0, w1: next.w1 });
      pub.set("w_history", next.history);

      if (next.status === "diverged" || next.status === "converged" || stepsTaken >= 30) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        // Trigger camera shake when we diverge — the visceral moment.
        if (next.status === "diverged") {
          pub.pulse("camera_shake");
        }
        setRunning(false);
        setDone(true);
        // Give the user ~1.5s to see what happened, then enable Next.
        setTimeout(() => onComplete(), 1500);
      }
    }, 160);
  }

  const correct: Choice = "c";
  const verdict =
    !done || !picked
      ? null
      : picked === correct
      ? "right"
      : picked === "b"
      ? "close"
      : "wrong";

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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="t-meta">Predict first</span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          lr = {lockedLr.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {CHOICES.map((c) => (
          <button
            key={c.key}
            onClick={() => pick(c.key)}
            disabled={!!picked}
            className={`btn ${
              picked === c.key
                ? c.key === correct
                  ? "btn-primary"
                  : "btn-secondary"
                : "btn-secondary"
            } btn-sm`}
            style={{
              fontSize: 12,
              padding: "0 8px",
              opacity: picked && picked !== c.key ? 0.45 : 1,
              cursor: picked ? "default" : "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {running && (
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--lab-cyan)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--lab-cyan)" }} />
          running…
        </div>
      )}

      {verdict && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--neutral-700)",
            background:
              verdict === "right" ? "var(--accent-subtle)" : "var(--neutral-50)",
            padding: "10px 12px",
            borderRadius: 6,
            border: `1px solid ${
              verdict === "right" ? "var(--accent)" : "var(--neutral-200)"
            }`,
          }}
        >
          {verdict === "right" && "Right — it flies off. With lr that high the step overshoots the valley and lands higher up the other side. Then it overshoots that, and so on, until the cost explodes."}
          {verdict === "close" && "Closer to (c). At lr = 0.6 the bouncing doesn't stay bounded — it grows each time. Real bouncing-but-converging behavior happens around lr = 0.45 (we'll see that in beat 7)."}
          {verdict === "wrong" && "It didn't converge faster — it diverged. With a step that big, gradient descent overshoots so badly that each step makes things worse. Cost goes up, not down."}
        </div>
      )}
    </div>
  );
}
