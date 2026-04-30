"use client";

import { useEffect, useRef, useState } from "react";
import { DATASET, gradient } from "@/lib/lab/sim/gradient-descent";
import { FOCUS_DOT } from "@/lib/lab/beats";
import { useChannel } from "@/lib/lab/LabContext";
import { Tex } from "./Tex";

// The math strip - wide panel below the data + bowl, introduced in 4.5
// and persisting through end of lesson. All numbers update live.
//
// Symbols are introduced only AFTER their concept is on screen:
//   • Beat 4.5 - no symbols, just words.
//   • Beat 4.6 - introduces "gradient", w₀, w₁ once the bars finish.
//   • Beat 4.7 - introduces w, g, lr alongside their meanings.
//   • Beat 4.8 - reuses everything plus |g|.

const X_MEAN = 5.5;
const X_STD = Math.sqrt(8.25);
const Y_VALUES = DATASET.map(([, y]) => y);
const Y_MEAN = Y_VALUES.reduce((a, b) => a + b, 0) / Y_VALUES.length;
const Y_STD = Math.sqrt(
  Y_VALUES.reduce((a, b) => a + (b - Y_MEAN) ** 2, 0) / Y_VALUES.length
);

type Pos = { w0: number; w1: number };
type MathStripBeat = "4.5" | "4.6" | "4.7" | "4.8";

export type MathStripCallbacks = {
  onNudge?: () => void;
  onPhaseAdvance?: () => void;
  onDirectionToggle?: (direction: "downhill" | "uphill") => void;
  onTakeStep?: () => void;
  onStep?: () => void;
  onPredict?: (answer: "a" | "b" | "c") => void;
};

export function MathStrip({
  beat,
  nudgeCount,
  nudgesNeeded,
  phase,
  predictAnswer,
  steps,
  callbacks,
}: {
  beat: MathStripBeat;
  nudgeCount: number;
  nudgesNeeded: number;
  phase: number;
  predictAnswer: "a" | "b" | "c" | null;
  steps: number;
  callbacks: MathStripCallbacks;
}) {
  const pos = useChannel<Pos>("w_position") ?? { w0: 0, w1: 0 };

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        overflow: "hidden",
        flex: "none",
        display: "flex",
        flexDirection: "column",
        maxHeight: 520,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--neutral-200)",
          background: "var(--neutral-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flex: "none",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-900)" }}>
          The math
        </span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          live · updates as the line moves
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {beat === "4.5" && (
          <Beat45Body
            pos={pos}
            nudgeCount={nudgeCount}
            nudgesNeeded={nudgesNeeded}
            onNudge={callbacks.onNudge!}
          />
        )}
        {beat === "4.6" && (
          <Beat46Body pos={pos} phase={phase} onPhaseAdvance={callbacks.onPhaseAdvance!} />
        )}
        {beat === "4.7" && (
          <Beat47Body
            pos={pos}
            phase={phase}
            onPhaseAdvance={callbacks.onPhaseAdvance!}
            onDirectionToggle={callbacks.onDirectionToggle!}
            onTakeStep={callbacks.onTakeStep!}
          />
        )}
        {beat === "4.8" && (
          <Beat48Body
            pos={pos}
            steps={steps}
            predictAnswer={predictAnswer}
            onStep={callbacks.onStep!}
            onPredict={callbacks.onPredict!}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   BEAT 4.5 - No symbols yet, just words. Keep plain typography.
   ============================================================ */
function Beat45Body({
  pos,
  nudgeCount,
  nudgesNeeded,
  onNudge,
}: {
  pos: Pos;
  nudgeCount: number;
  nudgesNeeded: number;
  onNudge: () => void;
}) {
  const [xOrig, yOrig] = DATASET[FOCUS_DOT];
  const xn = (xOrig - X_MEAN) / X_STD;
  const yPredN = pos.w0 + pos.w1 * xn;
  const yPredOrig = yPredN * Y_STD + Y_MEAN;
  const errOrig = yOrig - yPredOrig;
  const errAbs = Math.abs(errOrig);
  const above = errOrig > 0;
  const atDot = errAbs < 0.05;

  const directionWord = above ? "UP" : "DOWN";
  const positionWord = above ? "above" : "below";

  return (
    <div
      style={{
        padding: "28px 24px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 18,
          lineHeight: 1.7,
          color: "var(--neutral-900)",
          maxWidth: 640,
        }}
      >
        {atDot ? (
          <>
            this dot is sitting{" "}
            <span style={{ color: "var(--success)", fontWeight: 600 }}>right on the line</span>.
          </>
        ) : (
          <>
            this dot is{" "}
            <span style={{ color: "var(--lab-cyan)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {errAbs.toFixed(2)}
            </span>{" "}
            {positionWord} the line.
            <br />
            to fit it better, the line needs to move{" "}
            <span style={{ color: "var(--lab-warm)", fontWeight: 700 }}>{directionWord}</span> here.
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <button
          className="btn btn-primary"
          onClick={onNudge}
          disabled={atDot}
          style={{ minWidth: 280, opacity: atDot ? 0.5 : 1 }}
        >
          Nudge the line toward this dot
        </button>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          {atDot
            ? `done - ${nudgeCount} nudge${nudgeCount === 1 ? "" : "s"} brought the line to this dot`
            : `nudges so far: ${nudgeCount}${nudgesNeeded > 0 ? ` · need ${Math.max(0, nudgesNeeded - nudgeCount)} more to advance` : ""}`}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   BEAT 4.6 - Ten dots, one direction
   ============================================================ */
function Beat46Body({
  pos,
  phase,
  onPhaseAdvance,
}: {
  pos: Pos;
  phase: number;
  onPhaseAdvance: () => void;
}) {
  const [g0, g1] = gradient(pos.w0, pos.w1);
  const N = DATASET.length;
  const contributions = useRef<{ c0: number; c1: number }[]>([]);
  contributions.current = DATASET.map(([xOrig, yOrig]) => {
    const xn = (xOrig - X_MEAN) / X_STD;
    const yn = (yOrig - Y_MEAN) / Y_STD;
    const errN = pos.w0 + pos.w1 * xn - yn;
    return { c0: (2 / N) * errN, c1: (2 / N) * errN * xn };
  });

  const [walkIndex, setWalkIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  useEffect(() => {
    setWalkIndex(0);
    setIsAnimating(true);
    let i = 0;
    const tick = () => {
      i++;
      setWalkIndex(i);
      if (i >= N) {
        setIsAnimating(false);
        return;
      }
      setTimeout(tick, 110);
    };
    const t = setTimeout(tick, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let displayG0: number;
  let displayG1: number;
  if (isAnimating) {
    displayG0 = contributions.current.slice(0, walkIndex).reduce((s, c) => s + c.c0, 0);
    displayG1 = contributions.current.slice(0, walkIndex).reduce((s, c) => s + c.c1, 0);
  } else {
    displayG0 = g0;
    displayG1 = g1;
  }

  return (
    <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: 14 }}>
        <PullBar
          label="how much do the dots want the line to shift up/down?"
          value={displayG0}
          isAnimating={isAnimating}
        />
        <PullBar
          label="how much do they want the line to tilt steeper/flatter?"
          value={displayG1}
          isAnimating={isAnimating}
        />
        {isAnimating && (
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)", textAlign: "center" }}>
            adding pull from dot {walkIndex} of {N}…
          </div>
        )}
      </div>

      {phase >= 2 && (
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--neutral-900)",
            maxWidth: 640,
            textAlign: "center",
            animation: "stripFade 280ms ease",
          }}
        >
          two numbers, because the line has two knobs:
          <br />
          its <span style={{ color: "var(--lab-warm)", fontWeight: 600 }}>height</span>{" "}
          (which we&rsquo;ll call <Tex tex="w_0" />){" "}
          and its <span style={{ color: "var(--lab-cyan)", fontWeight: 600 }}>tilt</span>{" "}
          (<Tex tex="w_1" />).
          <br />
          one number per knob. together, those two numbers are called the{" "}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>gradient</span>.
        </div>
      )}

      {phase >= 3 && (
        <>
          <div
            style={{
              padding: "20px 24px",
              background: "var(--neutral-100)",
              borderRadius: 8,
              textAlign: "center",
              animation: "stripFade 280ms ease",
            }}
          >
            <Tex
              display
              scale={1.4}
              tex={`\\text{gradient} \\;=\\; \\bigl(\\,\\text{pull on } w_0\\,,\\; \\text{pull on } w_1\\,\\bigr) \\;=\\; \\bigl(\\,${signedTex(displayG0)}\\,,\\; ${signedTex(displayG1)}\\,\\bigr)`}
            />
          </div>

          <GradientInterpretation g0={displayG0} g1={displayG1} />
        </>
      )}

      <button
        className="btn btn-primary btn-sm"
        onClick={onPhaseAdvance}
        disabled={isAnimating || phase >= 3}
        style={{ minWidth: 220, opacity: isAnimating || phase >= 3 ? 0.5 : 1 }}
      >
        {phase === 1 && (isAnimating ? "summing the pulls…" : "What does this tell us? →")}
        {phase === 2 && "Show me the gradient →"}
        {phase >= 3 && "Done - see the bowl arrow"}
      </button>

      <style jsx>{`
        @keyframes stripFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function GradientInterpretation({ g0, g1 }: { g0: number; g1: number }) {
  // The "what does +0.88 actually mean" panel. Translates the signed
  // gradient values into plain-English direction + magnitude statements,
  // then connects to the bowl arrow visual the student already knows.

  const heightHigh = g0 > 0;
  const tiltSteep = g1 > 0;
  const heightAbs = Math.abs(g0).toFixed(2);
  const tiltAbs = Math.abs(g1).toFixed(2);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 700,
        padding: "16px 20px",
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        animation: "stripFade 280ms ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--accent)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        reading the gradient
      </div>

      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--neutral-900)" }}>
        These two numbers are <strong>signed</strong>. Here&rsquo;s what each sign means:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "10px 14px",
            background: "var(--neutral-0)",
            borderRadius: 8,
            border: "1px solid var(--neutral-200)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--lab-warm)",
              minWidth: 70,
              flex: "none",
            }}
          >
            {signedTex(g0)}
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--neutral-900)" }}>
            <Tex tex={`w_0`} /> is the line&rsquo;s <strong>height</strong>.{" "}
            {heightHigh ? (
              <>
                Positive means the line is currently <strong>too high</strong>. To fit
                better, we need to <strong>decrease</strong> <Tex tex="w_0" /> by about{" "}
                <strong>{heightAbs}</strong> (after scaling by{" "}
                <Tex tex="\mathit{lr}" />).
              </>
            ) : (
              <>
                Negative means the line is currently <strong>too low</strong>. To fit
                better, we need to <strong>increase</strong> <Tex tex="w_0" /> by about{" "}
                <strong>{heightAbs}</strong> (after scaling by{" "}
                <Tex tex="\mathit{lr}" />).
              </>
            )}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "10px 14px",
            background: "var(--neutral-0)",
            borderRadius: 8,
            border: "1px solid var(--neutral-200)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--lab-cyan)",
              minWidth: 70,
              flex: "none",
            }}
          >
            {signedTex(g1)}
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--neutral-900)" }}>
            <Tex tex={`w_1`} /> is the line&rsquo;s <strong>tilt</strong>.{" "}
            {tiltSteep ? (
              <>
                Positive means the line is currently <strong>too steep</strong>. To fit
                better, we need to <strong>flatten it</strong> by about{" "}
                <strong>{tiltAbs}</strong>.
              </>
            ) : (
              <>
                Negative means the line is currently <strong>too flat</strong>. To fit
                better, we need to <strong>steepen it</strong> by about{" "}
                <strong>{tiltAbs}</strong>.
              </>
            )}
          </span>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--neutral-700)",
          paddingTop: 4,
          borderTop: "1px dashed var(--neutral-300)",
        }}
      >
        <strong>Quick rule:</strong> the gradient points <em>uphill on the bowl</em>,
        the direction that makes loss go <em>up</em>. To make loss go <em>down</em>,
        we walk the <em>other way</em>. We{" "}
        <strong>subtract</strong> the gradient. Beat 4.7 builds that rule.
      </p>
    </div>
  );
}

function PullBar({
  label,
  value,
  isAnimating,
}: {
  label: string;
  value: number;
  isAnimating: boolean;
}) {
  const CAP = 5;
  const pct = Math.min(Math.abs(value), CAP) / CAP;
  const positive = value >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--neutral-700)" }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--neutral-900)" }}>
          {(value >= 0 ? "+" : "") + value.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 12,
          background: "var(--neutral-100)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--neutral-300)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: positive ? "50%" : `${50 - pct * 50}%`,
            width: `${pct * 50}%`,
            background: positive ? "var(--lab-cyan)" : "var(--lab-warm)",
            borderRadius: 4,
            transition: isAnimating ? "all 110ms linear" : "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
    </div>
  );
}

function signedTex(v: number): string {
  // KaTeX-safe signed number. Use \, for thin space if needed.
  const s = v >= 0 ? "+" : "-";
  return `${s}${Math.abs(v).toFixed(2)}`;
}

/* ============================================================
   BEAT 4.7 - The full step, built piece by piece
   ============================================================ */
function Beat47Body({
  pos,
  phase,
  onPhaseAdvance,
  onDirectionToggle,
  onTakeStep,
}: {
  pos: Pos;
  phase: number;
  onPhaseAdvance: () => void;
  onDirectionToggle: (d: "downhill" | "uphill") => void;
  onTakeStep: () => void;
}) {
  const [g0, g1] = gradient(pos.w0, pos.w1);
  const LR = 0.08;
  const [direction, setDirection] = useState<"downhill" | "uphill">("downhill");
  const [stepTaken, setStepTaken] = useState(false);

  useEffect(() => {
    setStepTaken(false);
    setDirection("downhill");
    onDirectionToggle("downhill");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDirection() {
    const next = direction === "downhill" ? "uphill" : "downhill";
    setDirection(next);
    onDirectionToggle(next);
  }

  const wMinusG: Pos = { w0: pos.w0 - g0, w1: pos.w1 - g1 };
  const wPlusG: Pos = { w0: pos.w0 + g0, w1: pos.w1 + g1 };
  const lrG: Pos = { w0: LR * g0, w1: LR * g1 };
  const wNew: Pos = { w0: pos.w0 - lrG.w0, w1: pos.w1 - lrG.w1 };

  function handleStep() {
    if (stepTaken) return;
    setStepTaken(true);
    onTakeStep();
  }

  return (
    <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      {/* PHASE 1 - introduce w as a name for the hiker's position */}
      <IntroBlock accent="var(--accent)" kicker="meet the first letter">
        Look at the bowl. The hiker is glowing. Its position is two numbers:
        how high the line sits, and how steep it tilts.
        We&rsquo;re going to call that pair <Tex tex="w" scale={1.2} />.
        <br />
        <span style={{ color: "var(--neutral-500)", fontSize: 13 }}>
          So <Tex tex="w" /> is shorthand for &ldquo;wherever the hiker currently is.&rdquo;
        </span>
      </IntroBlock>

      <div
        style={{
          padding: "20px 28px",
          background: "var(--neutral-100)",
          borderRadius: 8,
          width: "100%",
          maxWidth: 680,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
        }}
      >
        <Row
          label="current position:"
          tex={`w \\;=\\; \\bigl(\\,${signedTex(pos.w0)}\\,,\\; ${signedTex(pos.w1)}\\,\\bigr)`}
        />

        {phase >= 2 && (
          <>
            <Row
              label="pull (the gradient):"
              tex={`g \\;=\\; \\bigl(\\,${signedTex(g0)}\\,,\\; ${signedTex(g1)}\\,\\bigr)`}
              color="var(--lab-cyan)"
            />
            {direction === "downhill" ? (
              <Row
                label="step away from pull:"
                tex={`w - g \\;=\\; \\bigl(\\,${signedTex(wMinusG.w0)}\\,,\\; ${signedTex(wMinusG.w1)}\\,\\bigr)`}
              />
            ) : (
              <Row
                label="step WITH the pull:"
                tex={`w + g \\;=\\; \\bigl(\\,${signedTex(wPlusG.w0)}\\,,\\; ${signedTex(wPlusG.w1)}\\,\\bigr)`}
                color="var(--lab-warm)"
              />
            )}
          </>
        )}

        {phase >= 3 && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 14,
              borderTop: "1px dashed var(--neutral-300)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
              animation: "stripFade 280ms ease",
            }}
          >
            <Tex display scale={1.5} tex={`w_{\\text{new}} \\;=\\; w \\;-\\; \\mathit{lr} \\cdot g`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              <Tex
                tex={`= \\bigl(${signedTex(pos.w0)}, ${signedTex(pos.w1)}\\bigr) \\;-\\; ${LR.toFixed(2)} \\cdot \\bigl(${signedTex(g0)}, ${signedTex(g1)}\\bigr)`}
                scale={1.1}
              />
              <Tex
                tex={`= \\bigl(${signedTex(pos.w0)}, ${signedTex(pos.w1)}\\bigr) \\;-\\; \\bigl(${signedTex(lrG.w0)}, ${signedTex(lrG.w1)}\\bigr)`}
                scale={1.1}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Tex
                  tex={`= \\bigl(\\,\\textbf{${signedTex(wNew.w0)}}\\,,\\; \\textbf{${signedTex(wNew.w1)}}\\,\\bigr)`}
                  scale={1.2}
                />
                {stepTaken && (
                  <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 600 }}>✓</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === 1 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--neutral-700)", maxWidth: 580, textAlign: "center", lineHeight: 1.5 }}>
            Two numbers in <Tex tex="w" />, same shape as the gradient. That&rsquo;s
            because the gradient is also one number per knob.
          </p>
          <button className="btn btn-primary btn-sm" onClick={onPhaseAdvance}>
            Build the next piece →
          </button>
        </div>
      )}

      {/* PHASE 2 - introduce g BEFORE adding lines to the equation */}
      {phase === 2 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 680 }}>
          <IntroBlock accent="var(--lab-cyan)" kicker="meet the second letter">
            The arrow on the bowl, the pull from the data, is what we built in
            beat 4.6. Two numbers: pull on height, pull on tilt. We&rsquo;re going to
            call that pair <Tex tex="g" scale={1.2} />.
            <br />
            <span style={{ color: "var(--neutral-500)", fontSize: 13 }}>
              So <Tex tex="g" /> is shorthand for the gradient: &ldquo;which way is uphill,
              and how steeply.&rdquo;
            </span>
          </IntroBlock>

          <p style={{ margin: 0, fontSize: 14, color: "var(--neutral-900)", maxWidth: 580, textAlign: "center", lineHeight: 1.55 }}>
            <Tex tex="g" /> points <strong>uphill</strong>. We want to go{" "}
            <strong>downhill</strong>. So we step the opposite way:{" "}
            <Tex tex="w - g" />. Same numbers, minus sign. Flip it and you&rsquo;d climb.
          </p>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}>
              try it:
            </span>
            <button
              className={`btn ${direction === "downhill" ? "btn-primary" : "btn-secondary"} btn-sm`}
              onClick={toggleDirection}
              style={{ minWidth: 140 }}
            >
              {direction === "downhill" ? "↓ descent" : "↑ ascent"}
            </button>
            <span style={{ fontSize: 11, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}>
              (one sign, that&rsquo;s the whole difference)
            </span>
          </div>

          <button className="btn btn-primary btn-sm" onClick={onPhaseAdvance}>
            Build the last piece →
          </button>
        </div>
      )}

      {/* PHASE 3 - introduce lr BEFORE the full formula appears */}
      {phase >= 3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 680 }}>
          <IntroBlock accent="var(--accent)" kicker="meet the third letter">
            The full <Tex tex="w - g" /> step would land at{" "}
            <Tex tex={`(${signedTex(wMinusG.w0)}, ${signedTex(wMinusG.w1)})`} />, way past
            the minimum. So we take only a <strong>fraction</strong> of the pull.
            That fraction has a name: the <strong>learning rate</strong>, written{" "}
            <Tex tex="\mathit{lr}" scale={1.2} />.
            <br />
            <span style={{ color: "var(--neutral-500)", fontSize: 13 }}>
              So <Tex tex="\mathit{lr}" /> is shorthand for &ldquo;how big a piece of the
              pull do we actually take.&rdquo; Today, <Tex tex="\mathit{lr} = 0.08" />:
              eight percent.
            </span>
          </IntroBlock>

          <p style={{ margin: 0, fontSize: 14, color: "var(--neutral-900)", maxWidth: 580, textAlign: "center", lineHeight: 1.55 }}>
            Putting it all together:{" "}
            <Tex tex="w_{\text{new}} = w - \mathit{lr} \cdot g" />. Old position,
            minus a fraction of the pull. Click below to actually take the step.
          </p>

          <button
            className="btn btn-primary"
            onClick={handleStep}
            disabled={stepTaken}
            style={{ minWidth: 240, opacity: stepTaken ? 0.5 : 1 }}
          >
            {stepTaken ? "✓ step taken - see the hiker" : "Take this step on the bowl"}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes stripFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function IntroBlock({
  accent,
  kicker,
  children,
}: {
  accent: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 680,
        padding: "12px 18px",
        borderLeft: `3px solid ${accent}`,
        background: "var(--neutral-50)",
        borderRadius: "0 8px 8px 0",
        animation: "stripFade 280ms ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: accent,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {kicker}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.65, color: "var(--neutral-900)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  tex,
  color,
}: {
  label: string;
  tex: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
        maxWidth: 580,
        color: color ?? "var(--neutral-900)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--neutral-500)",
          minWidth: 160,
          textAlign: "right",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, color: "inherit" }}>
        <Tex tex={tex} scale={1.25} />
      </div>
    </div>
  );
}

/* ============================================================
   BEAT 4.8 - Why steps shrink (the payoff)
   ============================================================ */
function Beat48Body({
  pos,
  steps,
  predictAnswer,
  onStep,
  onPredict,
}: {
  pos: Pos;
  steps: number;
  predictAnswer: "a" | "b" | "c" | null;
  onStep: () => void;
  onPredict: (a: "a" | "b" | "c") => void;
}) {
  const [g0, g1] = gradient(pos.w0, pos.w1);
  const mag = Math.hypot(g0, g1);
  const LR = 0.08;
  const showPredict = steps >= 5 && predictAnswer === null;
  const showAfterPredict = predictAnswer !== null;
  const atMin = mag < 0.01;

  return (
    <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <div
        style={{
          padding: "18px 24px",
          background: "var(--neutral-100)",
          borderRadius: 8,
          width: "100%",
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Row
          label="gradient:"
          tex={`g \\;=\\; \\bigl(\\,${signedTex(g0)}\\,,\\; ${signedTex(g1)}\\,\\bigr)`}
          color="var(--neutral-900)"
        />
        <Row
          label="pull size:"
          tex={`|g| \\;=\\; ${mag.toFixed(3)}`}
          color={atMin ? "var(--success)" : "var(--lab-cyan)"}
        />
        <Row
          label="step taken:"
          tex={`\\mathit{lr} \\cdot g \\;=\\; \\bigl(\\,${signedTex(LR * g0)}\\,,\\; ${signedTex(LR * g1)}\\,\\bigr)`}
        />
      </div>

      {/* Magnitude bar */}
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}>
          <span>|gradient|</span>
          <span>steps taken: {steps}</span>
        </div>
        <div style={{ height: 8, background: "var(--neutral-100)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(mag, 4) / 4 * 100}%`,
              background: atMin ? "var(--success)" : "var(--lab-cyan)",
              borderRadius: 4,
              transition: "width 280ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>

      {!showPredict && !showAfterPredict && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <button className="btn btn-primary" onClick={onStep} disabled={atMin} style={{ minWidth: 200 }}>
            {atMin ? "no pull left to subtract" : "Step"}
          </button>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            {steps < 5 ? `take ${5 - steps} more step${5 - steps === 1 ? "" : "s"} and watch all three views shrink` : "ready"}
          </span>
        </div>
      )}

      {showPredict && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 16,
            border: "1px solid var(--neutral-200)",
            borderRadius: 10,
            background: "var(--neutral-50)",
            maxWidth: 640,
            width: "100%",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--neutral-900)", lineHeight: 1.55, textAlign: "center" }}>
            All three are the same thing: when the line fits well, the errors are small,
            the pull is small, and the step is small.
            <br />
            <strong>What happens when the gradient hits exactly zero?</strong>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { k: "a" as const, label: "(a) Keeps stepping" },
              { k: "b" as const, label: "(b) Stops on its own" },
              { k: "c" as const, label: "(c) Reverses" },
            ].map((c) => (
              <button
                key={c.k}
                className="btn btn-secondary btn-sm"
                onClick={() => onPredict(c.k)}
                style={{ fontSize: 12, padding: "0 8px" }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAfterPredict && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 16,
            border: "1px solid var(--accent)",
            borderRadius: 10,
            background: "var(--accent-subtle)",
            maxWidth: 640,
            width: "100%",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--neutral-900)" }}>
            {predictAnswer === "b" ? (
              <>
                <strong>Almost.</strong> It looks like it stops, but it doesn&rsquo;t actually have
                a stopping rule. The step just becomes <Tex tex="w - \mathit{lr} \cdot 0 = w" />,
                so it stays put. There&rsquo;s nothing to subtract.
              </>
            ) : predictAnswer === "a" ? (
              <>
                <strong>Right idea, wrong outcome.</strong> The algorithm{" "}
                <em>does</em> keep stepping, but each step is{" "}
                <Tex tex="w - \mathit{lr} \cdot 0 = w" />. So nothing actually moves.
              </>
            ) : (
              <>
                <strong>Not quite.</strong> Reversing would need a positive sign somewhere.
                What actually happens: each step is <Tex tex="w - \mathit{lr} \cdot 0 = w" />.
                Same position, forever.
              </>
            )}
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onStep}
            style={{ alignSelf: "flex-start" }}
          >
            Try clicking Step again - see for yourself
          </button>
        </div>
      )}
    </div>
  );
}
