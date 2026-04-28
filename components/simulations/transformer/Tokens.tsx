"use client";

import { useState } from "react";
import type { TokenInfo } from "@/lib/simulations/transformer-core";

// Colored pills, one per BPE token. Hover highlights it. Color-cycles
// through a small clay/cyan/neutral palette so adjacent tokens are
// visually distinct.

const PALETTE = [
  { bg: "rgba(181, 83, 42, 0.08)",  border: "rgba(181, 83, 42, 0.30)" }, // clay
  { bg: "rgba(64, 141, 167, 0.08)", border: "rgba(64, 141, 167, 0.30)" }, // lab-cyan
  { bg: "rgba(0, 0, 0, 0.04)",      border: "rgba(0, 0, 0, 0.12)" },     // neutral
];

export function Tokens({ tokens }: { tokens: TokenInfo[] }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: 12,
        background: "var(--neutral-50)",
        borderRadius: 10,
        border: "1px solid var(--neutral-200)",
      }}
    >
      {tokens.map((tok, i) => {
        const palette = PALETTE[i % PALETTE.length];
        const active = hover === i;
        return (
          <div
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 8px",
              background: palette.bg,
              border: `1px solid ${active ? "var(--accent)" : palette.border}`,
              borderRadius: 6,
              cursor: "default",
              transition: "border-color 120ms",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--neutral-900)",
                whiteSpace: "pre",
              }}
            >
              {renderTokenText(tok.text)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--neutral-500)",
              }}
            >
              {tok.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderTokenText(text: string): string {
  // Replace literal newlines/leading-spaces with visible markers so the
  // pill always shows something.
  if (text === "") return "∅";
  if (text === " ") return "·";
  if (text === "\n") return "↵";
  // Show leading space as a thin gap dot prefix so users see word breaks.
  if (text.startsWith(" ")) return "·" + text.slice(1);
  return text;
}
