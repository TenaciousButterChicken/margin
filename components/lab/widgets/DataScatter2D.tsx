"use client";

import { useEffect, useRef, useState } from "react";
import { DATASET, loss } from "@/lib/lab/sim/gradient-descent";
import { useChannel, usePublish } from "@/lib/lab/LabContext";

// Beat 1's load-bearing widget. Renders the dataset (study hours vs
// exam scores) and a line y = w0 + w1·x over it. Two drag handles on
// the line endpoints. As they drag, we re-fit (w0,w1) to the line they
// drew and publish onto the `w_position` channel; the bowl listens.

// Coord transforms - keep in sync with the simulator's standardization.
const X_MEAN = 5.5;
const X_STD = Math.sqrt(8.25);
const Y_VALUES = DATASET.map(([, y]) => y);
const Y_MEAN = Y_VALUES.reduce((a, b) => a + b, 0) / Y_VALUES.length;
const Y_STD = Math.sqrt(
  Y_VALUES.reduce((a, b) => a + (b - Y_MEAN) ** 2, 0) / Y_VALUES.length
);

// Plot domain - slightly wider than the data so dots aren't on the edges.
const X_DOMAIN: [number, number] = [0, 11];
const Y_DOMAIN: [number, number] = [30, 150];

// SVG viewBox
const VB_W = 520;
const VB_H = 360;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 36;
const PAD_B = 36;

const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

const MAX_HEIGHT_PX = 380;

function xToScreen(x: number): number {
  return PAD_L + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT_W;
}
function yToScreen(y: number): number {
  return PAD_T + (1 - (y - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * PLOT_H;
}
function screenToY(sy: number): number {
  return Y_DOMAIN[0] + (1 - (sy - PAD_T) / PLOT_H) * (Y_DOMAIN[1] - Y_DOMAIN[0]);
}

function originalToStandardized(slopeOrig: number, interceptOrig: number) {
  const w1 = (slopeOrig * X_STD) / Y_STD;
  const w0 = (interceptOrig - Y_MEAN + slopeOrig * X_MEAN) / Y_STD;
  return { w0, w1 };
}
function standardizedToOriginal(w0: number, w1: number) {
  const slopeOrig = (w1 * Y_STD) / X_STD;
  const interceptOrig = Y_MEAN + Y_STD * w0 - slopeOrig * X_MEAN;
  return { slopeOrig, interceptOrig };
}

function lineAt(slope: number, intercept: number, x: number): number {
  return slope * x + intercept;
}

const HANDLE_X_LEFT = 1.5;
const HANDLE_X_RIGHT = 9.5;

type Pos = { w0: number; w1: number };

export function DataScatter2D({
  draggable = true,
  pulseOnce = false,
  successThreshold,
  onLineDragged,
  highlightDotIndex = null,
  showAllPullArrows = false,
  boldErrorBars = false,
}: {
  draggable?: boolean;
  /** Fires the bright flash once. Parent toggles true→false to retrigger. */
  pulseOnce?: boolean;
  /** While currentLoss < threshold, the line/dots/loss render in green. */
  successThreshold?: number;
  onLineDragged?: () => void;
  /** When set, this single dot stays bold; the other 9 fade. Its error
   *  bar is drawn with a labeled value. Used by beats 4.5 / 4.6. */
  highlightDotIndex?: number | null;
  /** Beat 4.6: render a small arrowhead on each error bar pointing toward the dot. */
  showAllPullArrows?: boolean;
  /** Beat 4.6 / 4.8: render error bars in cyan even outside highlight mode. */
  boldErrorBars?: boolean;
}) {
  const pub = usePublish();
  const channelPos = useChannel<Pos>("w_position");
  const [drag, setDrag] = useState<"left" | "right" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [pos, setPos] = useState<Pos>(() => channelPos ?? { w0: 2, w1: -1 });

  useEffect(() => {
    if (channelPos && (channelPos.w0 !== pos.w0 || channelPos.w1 !== pos.w1)) {
      setPos(channelPos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelPos]);

  useEffect(() => {
    if (!channelPos) {
      pub.set("w_position", pos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { slopeOrig, interceptOrig } = standardizedToOriginal(pos.w0, pos.w1);
  const yLeft = lineAt(slopeOrig, interceptOrig, HANDLE_X_LEFT);
  const yRight = lineAt(slopeOrig, interceptOrig, HANDLE_X_RIGHT);

  const currentLoss = loss(pos.w0, pos.w1);
  const inSuccess =
    successThreshold !== undefined && currentLoss < successThreshold;

  const successColor = "var(--success)";
  const lineColor = inSuccess ? successColor : "var(--accent)";
  const dotColor = inSuccess ? successColor : "var(--neutral-700)";
  const lossTextColor = inSuccess ? successColor : "var(--neutral-900)";

  // The flash animation only attaches when pulseOnce is true. Parent flips
  // true→false to retrigger; here, the style ref-equality changes when the
  // pulseOnce flag flips, so the animation restarts.
  const flashStyle: React.CSSProperties | undefined = pulseOnce
    ? { animation: "marginSuccessFlash 700ms ease-out" }
    : undefined;

  function onPointerDown(which: "left" | "right") {
    if (!draggable) return;
    setDrag(which);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag || !svgRef.current) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());

    const yScreen = Math.max(PAD_T, Math.min(PAD_T + PLOT_H, local.y));
    const yData = screenToY(yScreen);

    let newSlopeOrig: number;
    let newInterceptOrig: number;
    if (drag === "left") {
      newSlopeOrig = (yRight - yData) / (HANDLE_X_RIGHT - HANDLE_X_LEFT);
      newInterceptOrig = yData - newSlopeOrig * HANDLE_X_LEFT;
    } else {
      newSlopeOrig = (yData - yLeft) / (HANDLE_X_RIGHT - HANDLE_X_LEFT);
      newInterceptOrig = yLeft - newSlopeOrig * HANDLE_X_LEFT;
    }
    const next = originalToStandardized(newSlopeOrig, newInterceptOrig);
    setPos(next);
    pub.set("w_position", next);
    onLineDragged?.();
  }

  function onPointerUp() {
    setDrag(null);
  }

  // Format with 3 decimals so values < 0.05 read as "0.034" not "0.03".
  const lossDisplay = currentLoss.toFixed(3);

  return (
    <div
      style={{
        width: "100%",
        maxHeight: MAX_HEIGHT_PX,
        position: "relative",
        background: "var(--neutral-50)",
        borderRadius: 8,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: "block",
          maxHeight: MAX_HEIGHT_PX,
          touchAction: "none",
          cursor: drag ? "grabbing" : "default",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* axes */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--neutral-300)"
          strokeWidth="1"
        />
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={PAD_T + PLOT_H}
          stroke="var(--neutral-300)"
          strokeWidth="1"
        />

        {/* All decorative chrome (axes, ticks, labels) lives in this group
            and ignores pointer events so dragging never selects/highlights
            them. The dots, line, and drag handles are outside this group. */}
        <g style={{ pointerEvents: "none" }}>
          {[2, 4, 6, 8, 10].map((x) => (
            <g key={`xt${x}`}>
              <line
                x1={xToScreen(x)}
                y1={PAD_T + PLOT_H}
                x2={xToScreen(x)}
                y2={PAD_T + PLOT_H + 4}
                stroke="var(--neutral-400)"
                strokeWidth="1"
              />
              <text
                x={xToScreen(x)}
                y={PAD_T + PLOT_H + 18}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
                textAnchor="middle"
              >
                {x}
              </text>
            </g>
          ))}
          {[50, 75, 100, 125, 150].map((y) => (
            <g key={`yt${y}`}>
              <line
                x1={PAD_L - 4}
                y1={yToScreen(y)}
                x2={PAD_L}
                y2={yToScreen(y)}
                stroke="var(--neutral-400)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={yToScreen(y) + 3}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
                textAnchor="end"
              >
                {y}
              </text>
            </g>
          ))}
          <text
            x={PAD_L + PLOT_W / 2}
            y={VB_H - 8}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--neutral-500)"
            textAnchor="middle"
          >
            study hours
          </text>
          <text
            x={12}
            y={PAD_T + PLOT_H / 2}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--neutral-500)"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${PAD_T + PLOT_H / 2})`}
          >
            exam score
          </text>
        </g>

        {/* residual ticks (faint, all dots) - drawn while dragging or when
            we're in highlight-one-dot mode so the dimmed-out dots still
            have visual context. Bold cyan when boldErrorBars is on. */}
        {(draggable || highlightDotIndex !== null || boldErrorBars) && (
          <g style={{ pointerEvents: "none" }}>
            {DATASET.map(([x, y], i) => {
              if (highlightDotIndex !== null && i === highlightDotIndex) return null;
              const sx = xToScreen(x);
              const yPred = lineAt(slopeOrig, interceptOrig, x);
              const syDot = yToScreen(y);
              const syLine = yToScreen(
                Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], yPred))
              );
              const stroke = boldErrorBars ? "var(--lab-cyan)" : "var(--neutral-200)";
              const strokeWidth = boldErrorBars ? 1.5 : 1;
              const dash = boldErrorBars ? "3 3" : "2 3";

              // Pull arrow: chevron with the APEX at the dot, legs flaring
              // back along the residual toward the line. The student reads
              // this as "the line wants to move TOWARD this dot"; apex
              // points in the direction of motion.
              //   dot below line (syDot > syLine) → apex at dot, legs up → ↓ arrow
              //   dot above line (syDot < syLine) → apex at dot, legs down → ↑ arrow
              let arrow = null;
              if (showAllPullArrows) {
                const apexY = syDot;
                // The legs extend back along the residual (toward the line).
                const back = syLine > syDot ? 1 : -1; // +1 if line is below apex
                const arrowSize = 5;
                arrow = (
                  <path
                    d={`M ${sx} ${apexY} L ${sx - arrowSize} ${apexY + arrowSize * back} M ${sx} ${apexY} L ${sx + arrowSize} ${apexY + arrowSize * back}`}
                    stroke="var(--lab-cyan)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              }
              return (
                <g key={`r${i}`} style={{ transition: "all 200ms ease" }}>
                  <line
                    x1={sx}
                    y1={syDot}
                    x2={sx}
                    y2={syLine}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                  />
                  {arrow}
                </g>
              );
            })}
          </g>
        )}

        {/* HIGHLIGHTED dot's error bar - bold, with a label */}
        {highlightDotIndex !== null && (() => {
          const [x, y] = DATASET[highlightDotIndex];
          const sx = xToScreen(x);
          const yPred = lineAt(slopeOrig, interceptOrig, x);
          const syDot = yToScreen(y);
          const syLine = yToScreen(
            Math.max(Y_DOMAIN[0] - 60, Math.min(Y_DOMAIN[1] + 60, yPred))
          );
          // Error in original units: positive = dot is above line.
          const err = y - yPred;
          const errAbs = Math.abs(err);
          const labelY = (syDot + syLine) / 2;
          // Label sits to the right of the bar.
          return (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={sx}
                y1={syDot}
                x2={sx}
                y2={syLine}
                stroke="var(--lab-cyan)"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <rect
                x={sx + 8}
                y={labelY - 11}
                width={92}
                height={22}
                rx={4}
                fill="var(--neutral-0)"
                stroke="var(--lab-cyan)"
                strokeWidth="1"
              />
              <text
                x={sx + 14}
                y={labelY + 4}
                fontSize="11"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-700)"
              >
                error =
              </text>
              <text
                x={sx + 96}
                y={labelY + 4}
                fontSize="12"
                fontFamily="var(--font-mono)"
                fill="var(--lab-cyan)"
                fontWeight={600}
                textAnchor="end"
              >
                {err >= 0 ? "+" : ""}
                {err.toFixed(2)}
              </text>
              <text
                x={sx + 14}
                y={labelY + 22}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--neutral-500)"
              >
                {errAbs < 0.05 ? "on the line" : err > 0 ? "above line" : "below line"}
              </text>
            </g>
          );
        })()}

        {/* the line */}
        {(() => {
          const xL = X_DOMAIN[0];
          const xR = X_DOMAIN[1];
          let yL = lineAt(slopeOrig, interceptOrig, xL);
          let yR = lineAt(slopeOrig, interceptOrig, xR);
          yL = Math.max(Y_DOMAIN[0] - 60, Math.min(Y_DOMAIN[1] + 60, yL));
          yR = Math.max(Y_DOMAIN[0] - 60, Math.min(Y_DOMAIN[1] + 60, yR));
          return (
            <line
              x1={xToScreen(xL)}
              y1={yToScreen(yL)}
              x2={xToScreen(xR)}
              y2={yToScreen(yR)}
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ ...flashStyle, pointerEvents: "none", transition: "stroke 200ms ease" }}
            />
          );
        })()}

        {/* dots */}
        <g style={{ pointerEvents: "none" }}>
          {DATASET.map(([x, y], i) => {
            const isHighlight = highlightDotIndex !== null && i === highlightDotIndex;
            const dimmed = highlightDotIndex !== null && !isHighlight;
            return (
              <circle
                key={`d${i}`}
                cx={xToScreen(x)}
                cy={yToScreen(y)}
                r={isHighlight ? 6 : 4}
                fill={isHighlight ? "var(--lab-cyan)" : dotColor}
                stroke="var(--neutral-0)"
                strokeWidth={isHighlight ? 2 : 1.5}
                opacity={dimmed ? 0.25 : 1}
                style={{
                  ...flashStyle,
                  transition: "fill 200ms ease, opacity 200ms ease, r 200ms ease",
                }}
              />
            );
          })}
        </g>

        {/* drag handles */}
        {draggable && (
          <>
            <DragHandle
              cx={xToScreen(HANDLE_X_LEFT)}
              cy={yToScreen(clampY(yLeft))}
              active={drag === "left"}
              success={inSuccess}
              onDown={() => onPointerDown("left")}
            />
            <DragHandle
              cx={xToScreen(HANDLE_X_RIGHT)}
              cy={yToScreen(clampY(yRight))}
              active={drag === "right"}
              success={inSuccess}
              onDown={() => onPointerDown("right")}
            />
          </>
        )}

        {/* loss readout - hidden when one dot is highlighted (math strip
            owns the readout in that mode) */}
        {highlightDotIndex === null && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={VB_W - 142}
            y={6}
            width={132}
            height={28}
            rx={6}
            fill="var(--neutral-0)"
            stroke={inSuccess ? successColor : "var(--neutral-200)"}
            style={{ transition: "stroke 200ms ease" }}
          />
          <text
            x={VB_W - 134}
            y={24}
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="var(--neutral-500)"
          >
            loss:
          </text>
          <text
            x={VB_W - 18}
            y={24}
            fontSize="13"
            fontFamily="var(--font-mono)"
            fill={lossTextColor}
            fontWeight={600}
            textAnchor="end"
            style={{ ...flashStyle, transition: "fill 200ms ease" }}
          >
            {lossDisplay}
          </text>
        </g>
        )}
      </svg>

      <style jsx>{`
        @keyframes marginSuccessFlash {
          0% {
            filter: brightness(1);
          }
          40% {
            filter: brightness(1.5) drop-shadow(0 0 10px var(--success));
          }
          100% {
            filter: brightness(1);
          }
        }
      `}</style>
    </div>
  );
}

function clampY(y: number): number {
  return Math.max(Y_DOMAIN[0] + 5, Math.min(Y_DOMAIN[1] - 5, y));
}

function DragHandle({
  cx,
  cy,
  active,
  success,
  onDown,
}: {
  cx: number;
  cy: number;
  active: boolean;
  success: boolean;
  onDown: () => void;
}) {
  const color = success ? "var(--success)" : "var(--accent)";
  return (
    <g style={{ cursor: active ? "grabbing" : "grab" }} onPointerDown={onDown}>
      <circle cx={cx} cy={cy} r="14" fill="transparent" />
      <circle cx={cx} cy={cy} r="11" fill={color} opacity={active ? 0.25 : 0.15} style={{ transition: "fill 200ms ease" }} />
      <circle
        cx={cx}
        cy={cy}
        r="6.5"
        fill={color}
        stroke="var(--neutral-0)"
        strokeWidth="2"
        style={{ transition: "fill 200ms ease" }}
      />
    </g>
  );
}
