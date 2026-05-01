"use client";

import { usePublish } from "@/lib/lab/LabContext";

// Lab chrome - 48px header per design brief §9.3.

export function LabHeader({
  title,
  phaseLabel,
  onClose,
}: {
  title: string;
  phaseLabel: string;
  onClose?: () => void;
}) {
  const pub = usePublish();

  return (
    <div
      style={{
        minHeight: 48,
        padding: "8px 12px",
        borderBottom: "1px solid var(--neutral-200)",
        background: "var(--neutral-0)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        flex: "none",
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{ padding: "0 8px", height: 28, fontSize: 12 }}
        >
          ← Close
        </button>
      )}
      <span
        className="hide-mobile"
        style={{ fontSize: 12, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}
      >
        {phaseLabel}
      </span>
      <div className="hide-mobile" style={{ width: 1, height: 16, background: "var(--neutral-200)" }} />
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--neutral-900)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: "1 1 auto",
        }}
      >
        {title}
      </span>

      <div style={{ marginLeft: "auto", display: "flex", gap: 4, flex: "none" }}>
        <button
          className="btn btn-ghost btn-sm"
          title="Reset the current beat"
          onClick={() => {
            // Clear position + history; the BeatJourney will republish defaults.
            pub.set("w_position", { w0: 2, w1: -1 });
            pub.set("w_history", []);
            pub.pulse("do_reset");
          }}
        >
          <ResetIcon />
          Reset
        </button>
        <button className="btn btn-ghost btn-sm" title="AI Hint (coming soon)" disabled>
          <HintIcon />
          Hint
        </button>
      </div>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8 A5 5 0 1 1 8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 4 L3 8 L7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2 L8 4 M8 12 L8 14 M2 8 L4 8 M12 8 L14 8 M3.8 3.8 L5.2 5.2 M10.8 10.8 L12.2 12.2 M3.8 12.2 L5.2 10.8 M10.8 5.2 L12.2 3.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
