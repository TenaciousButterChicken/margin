"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SimulationMeta } from "@/lib/simulations";

// Tile in the Simulations grid. Live tiles navigate to
// /simulations/[slug]. Coming-soon tiles look slightly muted, keep the
// pointer cursor (so they read as interactive), and pulse the
// "Coming soon" badge when clicked - no navigation.

export function SimulationCard({ sim }: { sim: SimulationMeta }) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [pulse, setPulse] = useState(0);
  const isComingSoon = sim.status === "coming_soon";

  function handleClick(e: React.MouseEvent) {
    if (isComingSoon) {
      e.preventDefault();
      // Re-trigger the pulse animation by bumping a key.
      setPulse((p) => p + 1);
      return;
    }
    router.push(`/simulations/${sim.slug}`);
  }

  return (
    <Link
      href={isComingSoon ? "#" : `/simulations/${sim.slug}`}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          position: "relative",
          border: "1px solid",
          borderColor: hover ? "var(--neutral-400)" : "var(--neutral-200)",
          background: "var(--neutral-0)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transition: "border-color 120ms, box-shadow 120ms",
          minHeight: 220,
          cursor: "pointer",
          boxShadow: hover ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
        }}
      >
        {/* Header: phase tag (left) + thumbnail (right) */}
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
              color: "var(--neutral-500)",
              letterSpacing: 0.4,
              paddingTop: 4,
            }}
          >
            Phase {sim.phase}
          </span>
          <ThumbnailPlaceholder phase={sim.phase} />
        </div>

        {/* Title + description */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
              margin: "0 0 8px",
              color: isComingSoon ? "var(--neutral-700)" : "var(--neutral-900)",
            }}
          >
            {sim.title}
          </h3>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--neutral-700)",
              margin: 0,
            }}
          >
            {sim.description}
          </p>
        </div>

        {/* Footer: attribution + coming-soon badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid var(--neutral-200)",
          }}
        >
          {sim.attribution ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--neutral-500)",
                fontStyle: "italic",
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {sim.attribution}
            </span>
          ) : (
            <span />
          )}
          {isComingSoon && (
            <span
              key={pulse}
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                padding: "3px 8px",
                borderRadius: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                fontWeight: 600,
                flex: "none",
                animation: pulse > 0 ? "comingSoonPulse 800ms ease-out" : undefined,
              }}
            >
              Coming soon
            </span>
          )}
        </div>

        <style jsx>{`
          @keyframes comingSoonPulse {
            0% {
              transform: scale(1);
              filter: brightness(1);
            }
            30% {
              transform: scale(1.15);
              filter: brightness(1.3);
            }
            100% {
              transform: scale(1);
              filter: brightness(1);
            }
          }
        `}</style>
      </div>
    </Link>
  );
}

function ThumbnailPlaceholder({ phase }: { phase: number }) {
  // 56×56 warm beige square with a faded phase numeral. Stand-in for a
  // proper per-simulation icon (each sim will eventually get its own).
  return (
    <div
      style={{
        width: 56,
        height: 56,
        flex: "none",
        background: "var(--accent-subtle)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        color: "var(--accent)",
        letterSpacing: -0.5,
        opacity: 0.65,
      }}
    >
      {phase}
    </div>
  );
}
