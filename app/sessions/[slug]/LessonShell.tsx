"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Sidebar } from "@/components/public/Sidebar";
import { Motif } from "@/components/illustrations/motifs";
import { type SessionMeta } from "@/lib/sessions";

// Lab is heavy (Three.js + recharts) — only import when actually opened.
const LabRoot = dynamic(() => import("@/components/lab/LabRoot").then((m) => m.LabRoot), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "var(--neutral-500)",
        fontFamily: "var(--font-mono)",
        background: "var(--neutral-50)",
      }}
    >
      Loading the Lab…
    </div>
  ),
});

// Wraps the lesson notes (server-rendered MDX, passed in as `notesNode`)
// and adds the side-panel Lab transition per design brief §6.4.

export function LessonShell({
  session,
  notesNode,
  hasLab,
}: {
  session: SessionMeta;
  notesNode: React.ReactNode;
  hasLab: boolean;
}) {
  const [labOpen, setLabOpen] = useState(false);

  // Reflow widths during the §6.4 transition. 60/40 split when open,
  // 100/0 when closed. The 200ms eased transition is in the inline styles.
  const labWidthPct = labOpen ? 60 : 0;

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
      <Sidebar currentSlug={session.slug} />

      {/* Notes column — animates width */}
      <div
        style={{
          width: `calc(${100 - labWidthPct}% - 240px)`,
          transition: "width 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: labOpen ? "0 32px" : "0 64px",
            transition: "padding 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
          }}
        >
          {notesNode}

          {hasLab && !labOpen && (
            <div
              style={{
                position: "sticky",
                bottom: 24,
                display: "flex",
                justifyContent: "flex-end",
                pointerEvents: "none",
              }}
            >
              <OpenLabCard session={session} onOpen={() => setLabOpen(true)} />
            </div>
          )}
        </main>
      </div>

      {/* Lab panel — slides in from the right */}
      <div
        style={{
          width: labOpen ? `${labWidthPct}%` : 0,
          transition: "width 200ms cubic-bezier(0.16, 1, 0.3, 1) 50ms",
          overflow: "hidden",
          flex: "none",
          borderLeft: labOpen ? "1px solid var(--neutral-200)" : "none",
          background: "var(--neutral-50)",
        }}
      >
        {labOpen && (
          <LabRoot
            sessionN={session.n}
            title="The hiker's descent"
            onClose={() => setLabOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function OpenLabCard({ session, onOpen }: { session: SessionMeta; onOpen: () => void }) {
  return (
    <div
      style={{
        pointerEvents: "auto",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "var(--shadow-modal)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 320,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: "var(--accent-subtle)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {session.motif && <Motif kind={session.motif} size={28} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
            The hiker&apos;s descent
          </span>
          <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
            Lab activity · ~10 min
          </span>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--neutral-700)", margin: 0 }}>
        Train a real model on a real cost surface. Move the learning rate; watch the hiker
        converge, oscillate, or diverge.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onOpen}>
          Open Lab →
        </button>
        <Link href={`/sessions/${session.slug}/lab`} style={{ display: "block" }}>
          <button
            className="btn btn-ghost btn-sm"
            title="Open in a full-width window"
            style={{ height: 40, padding: "0 12px" }}
          >
            ↗
          </button>
        </Link>
      </div>
    </div>
  );
}

function PlaceholderCard({ session }: { session: SessionMeta }) {
  return (
    <div
      style={{
        pointerEvents: "auto",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "var(--shadow-modal)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 320,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: "var(--accent-subtle)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {session.motif && <Motif kind={session.motif} size={28} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
            {session.title}
          </span>
          <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
            Lab · in development
          </span>
        </div>
      </div>
      <button
        className="btn btn-secondary"
        style={{ width: "100%", cursor: "not-allowed", opacity: 0.7 }}
        disabled
      >
        Open Lab — coming soon
      </button>
    </div>
  );
}

export { PlaceholderCard };
