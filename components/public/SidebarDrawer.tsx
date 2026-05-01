"use client";

import { useEffect, useState } from "react";

// Wraps the lesson Sidebar so it renders as a static side column on
// desktop and as an off-canvas drawer on phones. State + body-scroll
// lock live here so the server-rendered Sidebar stays a server
// component.

export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="show-mobile-only sidebar-drawer-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open sessions menu"
        aria-expanded={open}
      >
        <MenuIcon /> Sessions
      </button>

      <div className={`sidebar-drawer ${open ? "is-open" : ""}`}>
        <button
          type="button"
          className="show-mobile-only sidebar-drawer-close"
          onClick={() => setOpen(false)}
          aria-label="Close sessions menu"
        >
          <CloseIcon />
        </button>
        <div className="sidebar-drawer-inner" onClick={() => setOpen(false)}>
          {children}
        </div>
      </div>

      {open && (
        <div
          className="show-mobile-only sidebar-drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
