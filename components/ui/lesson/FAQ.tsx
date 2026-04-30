"use client";

import { useState } from "react";

// Collapsible FAQ list. Each question shows just its prompt by default;
// clicking expands the answer. Used for the "likely student questions"
// section - gives users an inviting, progressive-disclosure UI instead
// of a wall of Q/A.

export function FAQ({ children }: { children: React.ReactNode }) {
  return <div className="lesson-faq">{children}</div>;
}

export function Q({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lesson-faq-item ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="lesson-faq-q"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="lesson-faq-chevron" aria-hidden>
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path
              d="M5 3 L11 8 L5 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>{q}</span>
      </button>
      {open && <div className="lesson-faq-a">{children}</div>}
    </div>
  );
}
