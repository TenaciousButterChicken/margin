"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Polynomial Playground — bias-variance tradeoff, made visible.
//
// Math: ordinary least squares on polynomial features [1, x, x², …, xⁿ].
// Build the design matrix X (N rows × (D+1) cols), solve the normal
// equations XᵀX β = Xᵀy via Gauss-Jordan with partial pivoting. Add a
// tiny ridge (1e-10) on the diagonal so the system stays solvable even
// when D ≥ N − 1 (more features than data points → underdetermined).
//
// Stability: x is normalized into [-1, 1] before fitting. Vandermonde
// matrices on raw x ∈ [0, 10] go ill-conditioned past degree 7 or so.

const X_DOMAIN: [number, number] = [0, 10];
const Y_DOMAIN: [number, number] = [-2, 8];
const VB_W = 720;
const VB_H = 440;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 40;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;
const MAX_DEGREE = 15;
const CURVE_SAMPLES = 240;
const Y_RENDER_CLAMP: [number, number] = [-200, 200];

type Dot = { x: number; y: number };

const INITIAL_DOTS: Dot[] = [
  { x: 2, y: 1.2 },
  { x: 5, y: 2.8 },
  { x: 8, y: 3.7 },
];

/* -------- coordinate helpers ----------------------------------------- */

function xToScreen(x: number): number {
  return PAD_L + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT_W;
}
function yToScreen(y: number): number {
  return PAD_T + (1 - (y - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * PLOT_H;
}
function screenToX(sx: number): number {
  return X_DOMAIN[0] + ((sx - PAD_L) / PLOT_W) * (X_DOMAIN[1] - X_DOMAIN[0]);
}
function screenToY(sy: number): number {
  return Y_DOMAIN[0] + (1 - (sy - PAD_T) / PLOT_H) * (Y_DOMAIN[1] - Y_DOMAIN[0]);
}

// Normalize x ∈ X_DOMAIN → [-1, 1] for stable polynomial fits.
function normalizeX(x: number): number {
  const [lo, hi] = X_DOMAIN;
  return (2 * (x - lo)) / (hi - lo) - 1;
}

/* -------- linear algebra (small enough to ship inline) --------------- */

// Gauss-Jordan elimination with partial pivoting. Solves Aβ = b.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let k = 0; k < n; k++) {
    // partial pivot — swap in the row with the largest |M[i][k]|
    let pivotRow = k;
    let pivotMag = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const mag = Math.abs(M[i][k]);
      if (mag > pivotMag) {
        pivotMag = mag;
        pivotRow = i;
      }
    }
    if (pivotRow !== k) {
      [M[k], M[pivotRow]] = [M[pivotRow], M[k]];
    }
    const pivot = M[k][k];
    if (Math.abs(pivot) < 1e-14) continue; // skip if numerically singular
    for (let j = k; j <= n; j++) M[k][j] /= pivot;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const factor = M[i][k];
      if (factor === 0) continue;
      for (let j = k; j <= n; j++) M[i][j] -= factor * M[k][j];
    }
  }
  return M.map((row) => row[n]);
}

function fitPolynomial(xsNorm: number[], ys: number[], degree: number): number[] {
  const n = xsNorm.length;
  if (n === 0) return [];
  const d = Math.min(degree + 1, MAX_DEGREE + 1);

  // Design matrix X (n × d). X[i][j] = xsNorm[i]^j
  const X: number[][] = xsNorm.map((x) => {
    const row: number[] = new Array(d);
    let v = 1;
    for (let j = 0; j < d; j++) {
      row[j] = v;
      v *= x;
    }
    return row;
  });

  // XᵀX (d × d)
  const XtX: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      XtX[i][j] = s;
    }
  }

  // Xᵀy (d)
  const Xty: number[] = new Array(d).fill(0);
  for (let i = 0; i < d; i++) {
    for (let k = 0; k < n; k++) Xty[i] += X[k][i] * ys[k];
  }

  // Tiny ridge on the diagonal so the system stays solvable even when
  // d > n. Small enough not to noticeably regularize when d ≤ n − 1
  // (in which case we want the visual oscillation effect).
  const RIDGE = 1e-10;
  for (let i = 0; i < d; i++) XtX[i][i] += RIDGE;

  return solveLinear(XtX, Xty);
}

function evalPolynomial(coef: number[], xNorm: number): number {
  // Horner's rule, applied to the monomial basis we're using.
  let y = 0;
  let v = 1;
  for (let k = 0; k < coef.length; k++) {
    y += coef[k] * v;
    v *= xNorm;
  }
  return y;
}

function rmse(dots: Dot[], coef: number[]): number {
  if (dots.length === 0 || coef.length === 0) return 0;
  let sum = 0;
  for (const d of dots) {
    const yp = evalPolynomial(coef, normalizeX(d.x));
    sum += (d.y - yp) ** 2;
  }
  return Math.sqrt(sum / dots.length);
}

/* -------- component --------------------------------------------------- */

export function PolynomialPlayground() {
  const [dots, setDots] = useState<Dot[]>(INITIAL_DOTS);
  const [degree, setDegree] = useState(1);
  const [testMode, setTestMode] = useState(false);
  const [testX, setTestX] = useState<number | null>(null);
  const [exactFitHighlight, setExactFitHighlight] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const coefficients = useMemo(() => {
    if (dots.length === 0) return [];
    const xs = dots.map((d) => normalizeX(d.x));
    const ys = dots.map((d) => d.y);
    return fitPolynomial(xs, ys, degree);
  }, [dots, degree]);

  const error = useMemo(() => rmse(dots, coefficients), [dots, coefficients]);

  // Sample the fitted curve along the full plot domain.
  const curvePoints = useMemo(() => {
    if (coefficients.length === 0) return [] as { x: number; y: number }[];
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const t = i / CURVE_SAMPLES;
      const x = X_DOMAIN[0] + t * (X_DOMAIN[1] - X_DOMAIN[0]);
      const y = evalPolynomial(coefficients, normalizeX(x));
      pts.push({ x, y });
    }
    return pts;
  }, [coefficients]);

  // The "exact fit" mathematical event: at degree = N - 1 (where N is the
  // number of dots), an OLS fit can interpolate every point exactly. Brief
  // highlight when we cross that threshold AND the error has actually hit ~0.
  const atExactFitThreshold = dots.length >= 2 && degree >= dots.length - 1 && error < 0.001;
  useEffect(() => {
    if (!atExactFitThreshold) return;
    setExactFitHighlight(true);
    const t = setTimeout(() => setExactFitHighlight(false), 700);
    return () => clearTimeout(t);
  }, [atExactFitThreshold]);

  // Reveal caption — fires once dots ≥ 6, degree ≥ 10, and error ~ 0.
  const overfittingMoment =
    dots.length >= 6 && degree >= 10 && error < 0.01;

  const testPrediction = useMemo(() => {
    if (testX === null || coefficients.length === 0) return null;
    return evalPolynomial(coefficients, normalizeX(testX));
  }, [testX, coefficients]);

  function handlePlotClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    if (
      local.x < PAD_L ||
      local.x > PAD_L + PLOT_W ||
      local.y < PAD_T ||
      local.y > PAD_T + PLOT_H
    ) {
      return; // click outside the plot region
    }
    const dataX = clamp(screenToX(local.x), X_DOMAIN[0], X_DOMAIN[1]);
    const dataY = clamp(screenToY(local.y), Y_DOMAIN[0], Y_DOMAIN[1]);
    if (testMode) {
      setTestX(dataX);
    } else {
      setDots((prev) => [...prev, { x: dataX, y: dataY }]);
    }
  }

  function clearAll() {
    setDots([]);
    setTestX(null);
    setDegree(1);
  }

  function addNoise() {
    setDots((prev) => prev.map((d) => ({ x: d.x, y: d.y + (Math.random() - 0.5) * 0.6 })));
  }

  // Curve as polyline path. Soft-clip absurd y values to a sane range so a
  // wild oscillation doesn't blow out the SVG renderer.
  const curvePath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    const segments: string[] = [];
    let pen = "M";
    for (const p of curvePoints) {
      const yClamped = clamp(p.y, Y_RENDER_CLAMP[0], Y_RENDER_CLAMP[1]);
      const sx = xToScreen(p.x);
      const sy = yToScreen(yClamped);
      // If a point is wildly off-plot, lift the pen so the line doesn't draw
      // to it from far away (avoids ugly diagonal jumps).
      const inView = yClamped >= Y_DOMAIN[0] - 4 && yClamped <= Y_DOMAIN[1] + 4;
      if (!inView) {
        // Still draw, but pen lifts and rejoins later — gives a fragmented
        // curve when it shoots off-screen, which is exactly what overfitting
        // looks like.
        segments.push(`${pen} ${sx} ${sy}`);
        pen = "M";
      } else {
        segments.push(`${pen} ${sx} ${sy}`);
        pen = "L";
      }
    }
    return segments.join(" ");
  }, [curvePoints]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "stretch" }}>
      {/* Above-the-plot hint */}
      <div
        style={{
          fontSize: 14,
          color: "var(--neutral-700)",
          textAlign: "center",
          lineHeight: 1.55,
        }}
      >
        {testMode ? (
          <>
            <strong>Test mode.</strong> Click anywhere — a question mark drops at
            that x and the curve&rsquo;s prediction at that x lights up.
          </>
        ) : (
          <>
            <strong>Click anywhere</strong> to add a data point. Drag the slider
            to change the polynomial&rsquo;s degree.
          </>
        )}
      </div>

      {/* Plot */}
      <div
        style={{
          width: "100%",
          background: "var(--neutral-50)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", cursor: "crosshair", userSelect: "none" }}
          onClick={handlePlotClick}
        >
          {/* grid */}
          <g style={{ pointerEvents: "none" }}>
            {Array.from({ length: 11 }).map((_, i) => {
              const x = X_DOMAIN[0] + i;
              const sx = xToScreen(x);
              return (
                <line
                  key={`gx${i}`}
                  x1={sx}
                  y1={PAD_T}
                  x2={sx}
                  y2={PAD_T + PLOT_H}
                  stroke="var(--neutral-200)"
                  strokeWidth="1"
                />
              );
            })}
            {Array.from({ length: 11 }).map((_, i) => {
              const y = Y_DOMAIN[0] + i;
              const sy = yToScreen(y);
              return (
                <line
                  key={`gy${i}`}
                  x1={PAD_L}
                  y1={sy}
                  x2={PAD_L + PLOT_W}
                  y2={sy}
                  stroke="var(--neutral-200)"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* axes */}
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={PAD_L}
              y1={PAD_T + PLOT_H}
              x2={PAD_L + PLOT_W}
              y2={PAD_T + PLOT_H}
              stroke="var(--neutral-400)"
              strokeWidth="1"
            />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="var(--neutral-400)" strokeWidth="1" />
            {[0, 2, 4, 6, 8, 10].map((x) => (
              <text
                key={`xt${x}`}
                x={xToScreen(x)}
                y={PAD_T + PLOT_H + 18}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
                textAnchor="middle"
              >
                {x}
              </text>
            ))}
            {[-2, 0, 2, 4, 6, 8].map((y) => (
              <text
                key={`yt${y}`}
                x={PAD_L - 8}
                y={yToScreen(y) + 3}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
                textAnchor="end"
              >
                {y}
              </text>
            ))}
            <text
              x={PAD_L + PLOT_W / 2}
              y={VB_H - 8}
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill="var(--neutral-500)"
              textAnchor="middle"
            >
              x
            </text>
            <text
              x={14}
              y={PAD_T + PLOT_H / 2}
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill="var(--neutral-500)"
              textAnchor="middle"
              transform={`rotate(-90, 14, ${PAD_T + PLOT_H / 2})`}
            >
              y
            </text>
          </g>

          {/* curve */}
          {curvePath && (
            <path
              d={curvePath}
              stroke="var(--accent)"
              strokeWidth={exactFitHighlight ? 4 : 2.4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pointerEvents: "none",
                filter: exactFitHighlight ? "drop-shadow(0 0 8px var(--accent))" : undefined,
                transition: "stroke-width 200ms ease, filter 200ms ease",
              }}
            />
          )}

          {/* dots */}
          <g style={{ pointerEvents: "none" }}>
            {dots.map((d, i) => (
              <circle
                key={i}
                cx={xToScreen(d.x)}
                cy={yToScreen(d.y)}
                r="6"
                fill="var(--accent)"
                stroke="var(--neutral-0)"
                strokeWidth="2"
              />
            ))}
          </g>

          {/* test point */}
          {testX !== null && testPrediction !== null && (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={xToScreen(testX)}
                y1={PAD_T + PLOT_H}
                x2={xToScreen(testX)}
                y2={yToScreen(clamp(testPrediction, Y_DOMAIN[0] - 100, Y_DOMAIN[1] + 100))}
                stroke="var(--lab-cyan)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={xToScreen(testX)}
                y={PAD_T + PLOT_H - 6}
                fontSize="14"
                fontFamily="var(--font-mono)"
                fontWeight={700}
                fill="var(--lab-cyan)"
                textAnchor="middle"
              >
                ?
              </text>
              {testPrediction >= Y_DOMAIN[0] && testPrediction <= Y_DOMAIN[1] ? (
                <>
                  <circle
                    cx={xToScreen(testX)}
                    cy={yToScreen(testPrediction)}
                    r="6"
                    fill="var(--neutral-0)"
                    stroke="var(--lab-cyan)"
                    strokeWidth="2.5"
                  />
                  <text
                    x={xToScreen(testX) + 10}
                    y={yToScreen(testPrediction) + 4}
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fill="var(--lab-cyan)"
                    fontWeight={600}
                  >
                    pred = {testPrediction.toFixed(2)}
                  </text>
                </>
              ) : (
                <text
                  x={xToScreen(testX) + 10}
                  y={PAD_T + 18}
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill="var(--lab-cyan)"
                  fontWeight={600}
                >
                  pred = {testPrediction.toFixed(1)} (off-plot!)
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Slider + RMSE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 180px",
          gap: 24,
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-900)" }}>
              Polynomial degree
            </span>
            <span style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--neutral-900)", fontWeight: 700 }}>
              {degree}
            </span>
          </div>
          <DegreeSlider value={degree} onChange={setDegree} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--neutral-400)" }}>
            <span>1 (line)</span>
            <span>5</span>
            <span>10</span>
            <span>15 (chaos)</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-end",
            paddingLeft: 16,
            borderLeft: "1px solid var(--neutral-200)",
          }}
        >
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)", letterSpacing: 0.5 }}>
            TRAINING RMSE
          </span>
          <span
            style={{
              fontSize: 22,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: exactFitHighlight ? "var(--success)" : "var(--neutral-900)",
              transition: "color 200ms ease, transform 200ms ease",
              transform: exactFitHighlight ? "scale(1.08)" : "scale(1)",
            }}
          >
            {error.toFixed(4)}
          </span>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--neutral-400)" }}>
            {dots.length} {dots.length === 1 ? "dot" : "dots"}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button className="btn btn-secondary btn-sm" onClick={addNoise} disabled={dots.length === 0}>
          Add noise to data
        </button>
        <button className="btn btn-secondary btn-sm" onClick={clearAll} disabled={dots.length === 0 && testX === null}>
          Clear all dots
        </button>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-700)",
            padding: "6px 10px",
            border: "1px solid var(--neutral-200)",
            borderRadius: 6,
            cursor: "pointer",
            background: testMode ? "var(--accent-subtle)" : "var(--neutral-0)",
            borderColor: testMode ? "var(--accent)" : "var(--neutral-200)",
          }}
        >
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => {
              setTestMode(e.target.checked);
              if (!e.target.checked) setTestX(null);
            }}
            style={{ margin: 0 }}
          />
          Show test point
        </label>
      </div>

      {/* Reveal caption */}
      {overfittingMoment && (
        <div
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--neutral-900)",
            textAlign: "center",
            animation: "ppRevealIn 360ms ease",
          }}
        >
          Training error is essentially zero. The curve passes through every dot.
          <strong>{" "}But would you trust this curve to predict a new point?</strong>{" "}
          Toggle <em>Show test point</em> and click between dots to find out.
        </div>
      )}

      <style jsx>{`
        @keyframes ppRevealIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* -------- slider (matches Margin's lab register) --------------------- */

function DegreeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = ((value - 1) / (MAX_DEGREE - 1)) * 100;
  return (
    <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 4,
          background: "var(--neutral-200)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: `${pct}%`,
          height: 4,
          background: "var(--lab-cyan)",
          borderRadius: 2,
        }}
      />
      <input
        type="range"
        min={1}
        max={MAX_DEGREE}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          width: "100%",
          height: 22,
          opacity: 0,
          cursor: "pointer",
          margin: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(${pct}% - 9px)`,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--lab-cyan)",
          boxShadow: "0 0 0 2px var(--neutral-0), 0 1px 2px rgba(0,0,0,0.15)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
