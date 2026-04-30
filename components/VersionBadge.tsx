"use client";

import { useState, useEffect, useRef } from "react";
import { VERSION, COMMIT_SHA, BUILD_DATE } from "@/lib/version";

// Tiny pip in the bottom-right corner. Click reveals a small card with
// the version, commit SHA, and build date. Positioned above everything
// (z-index: 100), so it rides on top of the lab's fullscreen layout too.

export function VersionBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", bottom: 12, right: 12, zIndex: 100 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Version info"
        title="Version info"
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: "var(--neutral-300)",
          border: "none",
          padding: 0,
          cursor: "pointer",
          opacity: open ? 0.9 : 0.35,
          transition: "opacity 120ms",
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: 0,
            minWidth: 220,
            padding: "12px 14px",
            background: "var(--neutral-0)",
            border: "1px solid var(--neutral-200)",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: 1.7,
            color: "var(--neutral-700)",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: "var(--neutral-900)",
              marginBottom: 4,
            }}
          >
            margin v{VERSION}
          </div>
          <div>commit · {COMMIT_SHA}</div>
          <div>built · {BUILD_DATE}</div>
        </div>
      )}
    </div>
  );
}
