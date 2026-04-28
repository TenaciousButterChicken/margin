"use client";

import { useEffect, useRef, useState } from "react";
import { DATASET, loss } from "@/lib/lab/sim/gradient-descent";
import { useChannel, usePublish } from "@/lib/lab/LabContext";

// Beat 1's load-bearing widget. Renders the dataset (study hours vs
// exam scores) and a line y = w0 + w1·x over it. Two drag handles on
// the line endpoints. As they drag, we re-fit (w0,w1) to the line they
// drew and publish onto the `w_position` channel — the bowl listens.

// Coord transforms — keep in sync with the simulator's standardization.
const X_MEAN = 5.5;
const X_STD = Math.sqrt(8.25);
const Y_VALUES = DATASET.map(([, y]) => y);
const Y_MEAN = Y_VALUES.reduce((a, b) => a + b, 0) / Y_VALUES.length;
const Y_STD = Math.sqrt(
  Y_VALUES.reduce((a, b) => a + (b - Y_MEAN) ** 2, 0) / Y_VALUES.length
);

// Plot domain — slightly wider than the data so dots aren't on the edges.
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

function xToScreen(x: number): number {
  return PAD_L + ((x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * PLOT_W;
}
function yToScreen(y: number): number {
  return PAD_T + (1 - (y - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * PLOT_H;
}
function screenToY(sy: number): number {
  return Y_DOMAIN[0] + (1 - (sy - PAD_T) / PLOT_H) * (Y_DOMAIN[1] - Y_DOMAIN[0]);
}

// Convert original-scale slope/intercept → standardized (w0, w1) used by
// the simulator and the 3D bowl. Math is in the comments of the lib.
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

// y = slope * x + intercept evaluated at x.
function lineAt(slope: number, intercept: number, x: number): number {
  return slope * x + intercept;
}

// Drag handles live at these x positions in data coords.
const HANDLE_X_LEFT = 1.5;
const HANDLE_X_RIGHT = 9.5;

type Pos = { w0: number; w1: number };

export function DataScatter2D({
  draggable = true,
  pulseGreen = false,
  onLineDragged,
}: {
  draggable?: boolean;
  pulseGreen?: boolean;
  onLineDragged?: () => void;
}) {
  const pub = usePublish();
  const channelPos = useChannel<Pos>("w_position");
  const [drag, setDrag] = useState<"left" | "right" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // The "current" position — local state mirrors the channel so we can
  // update mid-drag without round-tripping through the bus.
  const [pos, setPos] = useState<Pos>(() => channelPos ?? { w0: 2, w1: -1 });

  // Sync down: if the channel changes from outside (bowl drag), update us.
  useEffect(() => {
    if (channelPos && (channelPos.w0 !== pos.w0 || channelPos.w1 !== pos.w1)) {
      setPos(channelPos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelPos]);

  // First mount: publish the initial bad line so the bowl matches.
  useEffect(() => {
    if (!channelPos) {
      pub.set("w_position", pos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { slopeOrig, interceptOrig } = standardizedToOriginal(pos.w0, pos.w1);
  const yLeft = lineAt(slopeOrig, interceptOrig, HANDLE_X_LEFT);
  const yRight = lineAt(slopeOrig, interceptOrig, HANDLE_X_RIGHT);

  // Live loss in standardized coords (same number the bowl reports).
  const currentLoss = loss(pos.w0, pos.w1);

  function onPointerDown(which: "left" | "right") {
    if (!draggable) return;
    setDrag(which);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag || !svgRef.current) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    // Convert client coords → SVG userspace (viewBox) coords
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());

    // Constrain the dragged y within the plot region (so the handle can't
    // be dragged off-canvas).
    const yScreen = Math.max(PAD_T, Math.min(PAD_T + PLOT_H, local.y));
    const yData = screenToY(yScreen);

    // Recompute the line: which endpoint is fixed, which is moving?
    let newSlopeOrig: number;
    let newInterceptOrig: number;
    if (drag === "left") {
      // left endpoint moves to (HANDLE_X_LEFT, yData); right stays at yRight
      newSlopeOrig = (yRight - yData) / (HANDLE_X_RIGHT - HANDLE_X_LEFT);
      newInterceptOrig = yData - newSlopeOrig * HANDLE_X_LEFT;
    } else {
      // right endpoint moves to (HANDLE_X_RIGHT, yData); left stays at yLeft
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

  return (
    <div style={{ width: "100%", position: "relative", background: "var(--neutral-50)", borderRadius: 8 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        style={{ display: "block", touchAction: "none", cursor: drag ? "grabbing" : "default" }}
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

        {/* x ticks */}
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
        {/* y ticks */}
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
        {/* axis labels */}
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

        {/* residual ticks — vertical from each dot to the line (only when draggable) */}
        {draggable && DATASET.map(([x, y], i) => {
          const sx = xToScreen(x);
          const yPred = lineAt(slopeOrig, interceptOrig, x);
          const syDot = yToScreen(y);
          const syLine = yToScreen(Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], yPred)));
          return (
            <line
              key={`r${i}`}
              x1={sx}
              y1={syDot}
              x2={sx}
              y2={syLine}
              stroke="var(--neutral-300)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}

        {/* the line — drawn from left edge to right edge so handles stay inside */}
        {(() => {
          const xL = X_DOMAIN[0];
          const xR = X_DOMAIN[1];
          let yL = lineAt(slopeOrig, interceptOrig, xL);
          let yR = lineAt(slopeOrig, interceptOrig, xR);
          // Soft-clip so the line doesn't escape too far visually
          yL = Math.max(Y_DOMAIN[0] - 60, Math.min(Y_DOMAIN[1] + 60, yL));
          yR = Math.max(Y_DOMAIN[0] - 60, Math.min(Y_DOMAIN[1] + 60, yR));
          return (
            <line
              x1={xToScreen(xL)}
              y1={yToScreen(yL)}
              x2={xToScreen(xR)}
              y2={yToScreen(yR)}
              stroke={pulseGreen ? "var(--success)" : "var(--accent)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              style={pulseGreen ? { animation: "pulseGreen 700ms ease-out" } : undefined}
            />
          );
        })()}

        {/* dots */}
        {DATASET.map(([x, y], i) => (
          <circle
            key={`d${i}`}
            cx={xToScreen(x)}
            cy={yToScreen(y)}
            r="4"
            fill={pulseGreen ? "var(--success)" : "var(--neutral-700)"}
            stroke="var(--neutral-0)"
            strokeWidth="1.5"
            style={pulseGreen ? { animation: "pulseDot 700ms ease-out" } : undefined}
          />
        ))}

        {/* drag handles */}
        {draggable && (
          <>
            <DragHandle
              cx={xToScreen(HANDLE_X_LEFT)}
              cy={yToScreen(clampY(yLeft))}
              active={drag === "left"}
              onDown={() => onPointerDown("left")}
            />
            <DragHandle
              cx={xToScreen(HANDLE_X_RIGHT)}
              cy={yToScreen(clampY(yRight))}
              active={drag === "right"}
              onDown={() => onPointerDown("right")}
            />
          </>
        )}

        {/* loss readout */}
        <g>
          <rect
            x={VB_W - 130}
            y={6}
            width={120}
            height={28}
            rx={6}
            fill="var(--neutral-0)"
            stroke="var(--neutral-200)"
          />
          <text
            x={VB_W - 122}
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
            fill={pulseGreen ? "var(--success)" : "var(--neutral-900)"}
            fontWeight={600}
            textAnchor="end"
            style={pulseGreen ? { animation: "pulseGreen 700ms ease-out" } : undefined}
          >
            {currentLoss.toFixed(2)}
          </text>
        </g>
      </svg>

      {/* Inline keyframes — local to this component */}
      <style jsx>{`
        @keyframes pulseGreen {
          0% { filter: brightness(1); }
          40% { filter: brightness(1.4) drop-shadow(0 0 8px var(--success)); }
          100% { filter: brightness(1); }
        }
        @keyframes pulseDot {
          0% { transform: scale(1); }
          40% { transform: scale(1.4); }
          100% { transform: scale(1); }
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
  onDown,
}: {
  cx: number;
  cy: number;
  active: boolean;
  onDown: () => void;
}) {
  return (
    <g style={{ cursor: active ? "grabbing" : "grab" }} onPointerDown={onDown}>
      {/* invisible hit target — bigger than the visual */}
      <circle cx={cx} cy={cy} r="14" fill="transparent" />
      {/* halo */}
      <circle cx={cx} cy={cy} r="11" fill="var(--accent)" opacity={active ? 0.25 : 0.15} />
      {/* core */}
      <circle
        cx={cx}
        cy={cy}
        r="6.5"
        fill="var(--accent)"
        stroke="var(--neutral-0)"
        strokeWidth="2"
      />
    </g>
  );
}
