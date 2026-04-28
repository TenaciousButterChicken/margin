"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionMeta } from "@/lib/sessions";
import { Motif } from "@/components/illustrations/motifs";

// Session card for the landing-page grid. Cribs the inline-style
// approach from design package's landing-page.jsx so the visual
// matches the source of truth exactly.

export function SessionCard({ s, phaseName }: { s: SessionMeta; phaseName: string }) {
  const [hover, setHover] = useState(false);
  const featured = s.featured;
  return (
    <Link
      href={`/sessions/${s.slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => !featured && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{
          gridColumn: featured ? "span 2" : "span 1",
          border: "1px solid",
          borderColor: featured
            ? "var(--accent)"
            : hover
            ? "var(--neutral-400)"
            : "var(--neutral-200)",
          background: featured ? "var(--accent-subtle)" : "var(--neutral-0)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          transition: "border-color 120ms, background 120ms",
          minHeight: 168,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: featured ? "var(--accent)" : "var(--neutral-500)",
              letterSpacing: 0.4,
            }}
          >
            {String(s.n).padStart(2, "0")} · {phaseName}
          </span>
          {s.motif && <Motif kind={s.motif} size={featured ? 40 : 28} />}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: featured ? 22 : 17,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
              margin: 0,
              color: "var(--neutral-900)",
            }}
          >
            {s.title}
          </h3>
          {featured && (
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--neutral-700)",
                margin: "10px 0 0",
              }}
            >
              The marquee Lab. A blindfolded hiker, a real cost surface, the learning rate as a slider.
            </p>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--neutral-500)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>{s.estimatedMinutes} min</span>
          {featured && <span style={{ color: "var(--accent)", fontWeight: 600 }}>featured →</span>}
        </div>
      </div>
    </Link>
  );
}
