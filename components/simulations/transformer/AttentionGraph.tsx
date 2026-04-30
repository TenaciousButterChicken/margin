"use client";

import { useMemo, useState } from "react";
import type { AttentionSource, TokenInfo } from "@/lib/simulations/transformer-core";

// Bipartite graph: "from" tokens on the left (the queriers), "to" tokens
// on the right (being attended to). Curved Bezier lines connect i → j
// with opacity proportional to attention[i, j]. Hovering a pill
// (left or right) highlights its edges only.

const ROW_HEIGHT = 28;
const PILL_PADDING_X = 10;
const PILL_GAP_Y = 2;
const COLUMN_WIDTH = 220;
const GAP = 220;
const SVG_PAD_X = 16;
const MIN_OPACITY_THRESHOLD = 0.02;

type Side = "from" | "to";

export function AttentionGraph({
  tokens,
  attention,
  source,
}: {
  tokens: TokenInfo[];
  attention: Float32Array;
  source: AttentionSource;
}) {
  const [hover, setHover] = useState<{ side: Side; idx: number } | null>(null);
  const seq = tokens.length;

  const totalHeight = seq * (ROW_HEIGHT + PILL_GAP_Y) + 16;
  const totalWidth = SVG_PAD_X * 2 + COLUMN_WIDTH * 2 + GAP;

  // Pre-compute pill geometry per side.
  const yFor = (i: number) => 8 + i * (ROW_HEIGHT + PILL_GAP_Y) + ROW_HEIGHT / 2;

  // Build edges sorted by opacity ascending so heavy edges render last
  // (on top). Skip near-zero edges for clarity.
  const edges = useMemo(() => {
    const list: { i: number; j: number; w: number }[] = [];
    for (let i = 0; i < seq; i++) {
      for (let j = 0; j <= i; j++) {
        const w = attention[i * seq + j] ?? 0;
        if (w > MIN_OPACITY_THRESHOLD) list.push({ i, j, w });
      }
    }
    list.sort((a, b) => a.w - b.w);
    return list;
  }, [attention, seq]);

  const isHighlighted = (i: number, j: number) => {
    if (!hover) return true;
    if (hover.side === "from") return hover.idx === i;
    return hover.idx === j;
  };

  return (
    <div
      style={{
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {source === "key-similarity" && (
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            background: "var(--neutral-0)",
            border: "1px dashed var(--neutral-300)",
            borderRadius: 6,
            padding: "6px 10px",
          }}
        >
          Approximated from key-tensor similarity. Real per-head attention
          requires a custom-exported ONNX. Coming in v2.
        </div>
      )}
      <div style={{ overflow: "auto" }}>
        <svg
          width={totalWidth}
          height={totalHeight}
          style={{ display: "block", maxWidth: "100%" }}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        >
          {/* Edges first so pills render on top */}
          {edges.map((e, idx) => {
            const x1 = SVG_PAD_X + COLUMN_WIDTH;
            const x2 = SVG_PAD_X + COLUMN_WIDTH + GAP;
            const y1 = yFor(e.i);
            const y2 = yFor(e.j);
            const cx1 = x1 + GAP * 0.4;
            const cx2 = x2 - GAP * 0.4;
            const highlighted = isHighlighted(e.i, e.j);
            const opacity = highlighted ? Math.min(1, 0.15 + e.w * 0.95) : 0.04;
            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                stroke="var(--accent)"
                strokeWidth={highlighted ? 1.4 : 1}
                fill="none"
                opacity={opacity}
              />
            );
          })}

          {/* Left column: "from" tokens */}
          {tokens.map((tok, i) => (
            <PillSVG
              key={`from-${i}`}
              token={tok}
              x={SVG_PAD_X}
              y={yFor(i) - ROW_HEIGHT / 2}
              width={COLUMN_WIDTH}
              height={ROW_HEIGHT}
              hoverActive={hover?.side === "from" && hover.idx === i}
              dim={hover !== null && !(hover.side === "from" && hover.idx === i)}
              onEnter={() => setHover({ side: "from", idx: i })}
              onLeave={() => setHover(null)}
              align="right"
            />
          ))}

          {/* Right column: "to" tokens */}
          {tokens.map((tok, j) => (
            <PillSVG
              key={`to-${j}`}
              token={tok}
              x={SVG_PAD_X + COLUMN_WIDTH + GAP}
              y={yFor(j) - ROW_HEIGHT / 2}
              width={COLUMN_WIDTH}
              height={ROW_HEIGHT}
              hoverActive={hover?.side === "to" && hover.idx === j}
              dim={hover !== null && !(hover.side === "to" && hover.idx === j)}
              onEnter={() => setHover({ side: "to", idx: j })}
              onLeave={() => setHover(null)}
              align="left"
            />
          ))}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
        }}
      >
        <span>← FROM (querying)</span>
        <span>TO (attended-to) →</span>
      </div>
    </div>
  );
}

function PillSVG({
  token,
  x,
  y,
  width,
  height,
  hoverActive,
  dim,
  onEnter,
  onLeave,
  align,
}: {
  token: TokenInfo;
  x: number;
  y: number;
  width: number;
  height: number;
  hoverActive: boolean;
  dim: boolean;
  onEnter: () => void;
  onLeave: () => void;
  align: "left" | "right";
}) {
  const fill = hoverActive ? "var(--neutral-0)" : "var(--neutral-0)";
  const stroke = hoverActive ? "var(--accent)" : "var(--neutral-200)";
  const labelColor = dim ? "var(--neutral-400)" : "var(--neutral-900)";
  const idColor = dim ? "var(--neutral-300)" : "var(--neutral-500)";
  const text = renderTokenText(token.text);
  const truncated = text.length > 22 ? text.slice(0, 21) + "…" : text;

  return (
    <g
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: "default" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={hoverActive ? 1.5 : 1}
      />
      <text
        x={align === "right" ? x + width - PILL_PADDING_X : x + PILL_PADDING_X}
        y={y + height / 2 + 1}
        textAnchor={align === "right" ? "end" : "start"}
        dominantBaseline="middle"
        fontFamily="var(--font-mono)"
        fontSize={12}
        fontWeight={600}
        fill={labelColor}
        style={{ whiteSpace: "pre" }}
      >
        {truncated}
      </text>
      <text
        x={align === "right" ? x + PILL_PADDING_X : x + width - PILL_PADDING_X}
        y={y + height / 2 + 1}
        textAnchor={align === "right" ? "start" : "end"}
        dominantBaseline="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        fill={idColor}
      >
        {token.id}
      </text>
    </g>
  );
}

function renderTokenText(text: string): string {
  if (text === "") return "∅";
  if (text === " ") return "·";
  if (text === "\n") return "↵";
  if (text.startsWith(" ")) return "·" + text.slice(1);
  return text;
}
