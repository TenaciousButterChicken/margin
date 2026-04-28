"use client";

import { useState } from "react";
import { useChannel, usePublish } from "@/lib/lab/LabContext";
import { distanceToOptimum } from "@/lib/lab/sim/gradient-descent";

// Hardcoded for the Session 6 vertical slice. Sprint 3 generalizes
// this to read challenges from lab.config.json.

type Attempt = {
  lr: number;
  steps: number;
  status: "converged" | "diverged" | "max_steps" | "running";
  message: string;
  pass: boolean;
};

type Phase = "intro" | "harder";

type SimSnapshot = {
  step: number;
  status: "idle" | "running" | "converged" | "diverged" | "max_steps";
  history: { w0: number; w1: number; loss: number }[];
};

const TARGET_STEPS = 30;
const HARDER_STEPS = 18;

export function ChallengePanel() {
  const sim = useChannel<SimSnapshot>("sim_snapshot");
  const lr = useChannel<number>("lr") ?? 0;
  const pub = usePublish();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const targetSteps = phase === "intro" ? TARGET_STEPS : HARDER_STEPS;

  function checkRun() {
    if (!sim) return;
    const last = sim.history[sim.history.length - 1];
    const dist = last ? distanceToOptimum(last.w0, last.w1) : Infinity;

    let pass = false;
    let message = "";
    let status: Attempt["status"] = "running";

    if (sim.status === "diverged") {
      status = "diverged";
      message = "Cost grew at every step — the rate is overshooting. Try smaller.";
    } else if (sim.status === "converged" && sim.step <= targetSteps && dist < 0.05) {
      status = "converged";
      pass = true;
      message = `Got it — converged in ${sim.step} steps. The minimum was around step ${Math.max(1, sim.step - 4)}.`;
    } else if (sim.status === "converged" && dist < 0.05) {
      status = "converged";
      message = `Converged, but in ${sim.step} steps — past the budget of ${targetSteps}. The right value is somewhere between this and a divergent rate.`;
    } else if (sim.step >= 200) {
      status = "max_steps";
      message = `Stopped at ${sim.step} steps without converging. The rate is too small — try increasing it.`;
    } else {
      status = "running";
      message = `Run isn't done yet — keep stepping (currently at step ${sim.step}).`;
    }

    setAttempts((prev) => [
      { lr, steps: sim.step, status, message, pass },
      ...prev,
    ].slice(0, 8));
  }

  function tryHarder() {
    setPhase("harder");
    setAttempts([]);
    pub.pulse("do_reset");
  }

  return (
    <aside
      style={{
        width: 320,
        flex: "none",
        borderLeft: "1px solid var(--neutral-200)",
        background: "var(--neutral-50)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--neutral-200)",
          background: "var(--neutral-0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="t-meta">Challenge · 0{phase === "intro" ? "1" : "2"}</span>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            {phase === "intro" ? "1 of 2" : "2 of 2"}
          </span>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)", margin: "0 0 8px", lineHeight: 1.35 }}>
          {phase === "intro"
            ? `Find a learning rate that converges in under ${TARGET_STEPS} steps.`
            : `Now do it in under ${HARDER_STEPS} steps without diverging.`}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--neutral-700)", margin: 0 }}>
          {phase === "intro"
            ? "Move the learning rate slider, hit Step ×4 a few times, then Check this run. The cost is converged when it stops moving (Δ < 0.0001)."
            : "The Goldilocks zone is narrower than it looks. A rate that's too high wastes steps oscillating; too low and you don't make the budget."}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span className="t-meta">Attempts</span>
        {attempts.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--neutral-500)", lineHeight: 1.5 }}>
            No attempts yet. Run a step or two and click <em>Check this run</em>.
          </div>
        )}
        {attempts.map((a, i) => (
          <AttemptRow key={i} attempt={a} />
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid var(--neutral-200)",
          background: "var(--neutral-0)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={checkRun}>
          Check this run
        </button>
        {phase === "intro" && attempts.some((a) => a.pass) && (
          <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={tryHarder}>
            Try the harder version →
          </button>
        )}
      </div>
    </aside>
  );
}

function AttemptRow({ attempt: a }: { attempt: Attempt }) {
  const dotColor =
    a.status === "diverged"
      ? "var(--danger)"
      : a.pass
      ? "var(--success)"
      : a.status === "max_steps"
      ? "var(--warning)"
      : "var(--neutral-400)";

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: `1px solid ${a.pass ? "var(--success)" : "var(--neutral-200)"}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor, flex: "none" }} />
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--neutral-900)", fontWeight: 600 }}>
          lr = {a.lr.toFixed(3)}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--neutral-500)" }}>
          {a.status === "diverged"
            ? "diverged"
            : a.pass
            ? `converged · ${a.steps} steps`
            : a.status === "max_steps"
            ? `${a.steps} steps`
            : `${a.steps} steps`}
        </span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--neutral-700)", margin: 0 }}>
        {a.message}
      </p>
    </div>
  );
}
