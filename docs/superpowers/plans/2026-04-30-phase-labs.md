# Phase Labs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move labs from session-level to phase-level. Each phase declares its own optional lab; sessions become lesson-only. The existing BeatJourney lab moves from being keyed by Session 6 to being Phase 2's lab, accessible at `/phases/linear-regression/lab`.

**Architecture:** Promote `PHASES` in `lib/sessions.ts` to a slugged registry with optional `lab` blocks. Add a new `/phases/[slug]/lab` route. Strip the slide-in lab side panel + `OpenLabCard` + `PlaceholderCard` from session pages. Surface the phase lab via a small "Open Lab" pill in the sidebar (between phase header and session list) and on the `/sessions` index (in the phase header strip). Phases without a lab show a disabled "Lab - coming soon" pill in the same slot.

**Tech Stack:** Next.js 14 App Router, TypeScript, server components by default, `next/dynamic({ ssr: false })` for the lab fullscreen page (Three.js / recharts / GSAP). No test framework in this repo - verification is `npx tsc --noEmit`, `next build`, and manual browser checks against acceptance criteria.

**Spec:** `docs/superpowers/specs/2026-04-30-phase-labs-design.md`

**Verification convention:** Each task ends with a verify step. There is no per-task commit; the user commits when the full plan lands.

---

## File map

**Modify:**
- `lib/sessions.ts` - add `slug` and optional `lab` to PHASES, add `getPhaseBySlug`, expand `sessionsByPhase()` return shape, remove `hasLab` field from `SessionMeta`.
- `components/lab/LabRoot.tsx` - swap `sessionN`/`title` props for a single `phaseSlug` prop; derive title and phase label from phase metadata.
- `components/lab/LabHeader.tsx` - swap `sessionN` for `phaseLabel`.
- `components/public/Sidebar.tsx` - add lab pill row between phase header and session list.
- `app/sessions/page.tsx` - add lab pill to phase header strip.
- `app/sessions/[slug]/LessonShell.tsx` - remove all lab UI; becomes sidebar + lesson-notes shell.
- `app/sessions/[slug]/page.tsx` - drop `hasLab`, drop `PlaceholderCard` import, drop `LessonShell` `hasLab` prop.

**Create:**
- `app/phases/[slug]/lab/page.tsx` - new fullscreen lab route.

**Delete:**
- `app/sessions/[slug]/lab/page.tsx` - old standalone session-lab route.

---

## Task 1: Add phase slugs, lab data, and helpers to `lib/sessions.ts`

**Files:**
- Modify: `lib/sessions.ts`

- [ ] **Step 1: Replace the file with the new shape**

Open `lib/sessions.ts`. Replace the entire file with:

```ts
// The 16-session registry. Titles and ordering are from MASTER_PLAN §3.
// This is the single source of truth; sidebar, landing grid, and lesson
// routes all read from here.

import type { MotifKind } from "@/components/illustrations/motifs";

export type Phase = 1 | 2 | 3 | 4 | 5;

export type PhaseSlug =
  | "the-hook"
  | "linear-regression"
  | "classification"
  | "neural-networks"
  | "modern-era";

export type PhaseMeta = {
  n: Phase;
  slug: PhaseSlug;
  name: string;
  sessions: string;        // human-readable range, e.g. "4-7"
  lab?: {
    title: string;
    summary: string;
  };
};

export type SessionMeta = {
  n: number;            // 1..16
  slug: string;         // URL slug, also content folder name under content/sessions/
  title: string;        // master-plan canonical title
  phase: Phase;
  estimatedMinutes: number;
  motif?: MotifKind;    // optional per master-plan §7.1; sessions 1-3 omit
  featured?: boolean;   // for landing-page emphasis
  hasCodeCell: boolean; // gates Pyodide loading; false for sessions 1-3 + S16
};

export const PHASES: PhaseMeta[] = [
  { n: 1, slug: "the-hook",          name: "The Hook",          sessions: "1-3"  },
  { n: 2, slug: "linear-regression", name: "Linear Regression", sessions: "4-7",
    lab: { title: "The Hiker's Descent", summary: "Train a line. Watch gradient descent." } },
  { n: 3, slug: "classification",    name: "Classification",    sessions: "8-10"  },
  { n: 4, slug: "neural-networks",   name: "Neural Networks",   sessions: "11-13" },
  { n: 5, slug: "modern-era",        name: "Modern Era",        sessions: "14-16" },
];

export const SESSIONS: SessionMeta[] = [
  // Phase 1 - The Hook (no-code)
  { n: 1,  slug: "machines-that-learn",     title: "The Machines That Learn",      phase: 1, estimatedMinutes: 30, hasCodeCell: false },
  { n: 2,  slug: "teaching-like-kids",      title: "Teaching Computers Like Teaching Kids", phase: 1, estimatedMinutes: 45, hasCodeCell: false },
  { n: 3,  slug: "data-is-everything",      title: "Data Is Everything",           phase: 1, estimatedMinutes: 45, hasCodeCell: false },
  // Phase 2 - Linear Regression
  { n: 4,  slug: "drawing-lines",           title: "Drawing Lines Through Dots",   phase: 2, estimatedMinutes: 50, motif: "data_point",  hasCodeCell: true },
  { n: 5,  slug: "how-wrong-are-we",        title: "How Wrong Are We?",            phase: 2, estimatedMinutes: 50, motif: "cost_surface",hasCodeCell: true },
  { n: 6,  slug: "rolling-downhill",        title: "Rolling Downhill",             phase: 2, estimatedMinutes: 60, motif: "hiker", featured: true, hasCodeCell: true },
  { n: 7,  slug: "real-world-regression",   title: "Real-World Regression",        phase: 2, estimatedMinutes: 50, motif: "data_point",  hasCodeCell: true },
  // Phase 3 - Classification
  { n: 8,  slug: "cats-or-dogs",            title: "Cats or Dogs?",                phase: 3, estimatedMinutes: 50, motif: "decision_boundary", hasCodeCell: true },
  { n: 9,  slug: "when-models-lie",         title: "When Models Lie",              phase: 3, estimatedMinutes: 50, motif: "decision_boundary", hasCodeCell: true },
  { n: 10, slug: "titanic",                 title: "Mini-Project: Titanic",        phase: 3, estimatedMinutes: 75, motif: "data_point",  hasCodeCell: true },
  // Phase 4 - Neural Networks
  { n: 11, slug: "brains-made-of-math",     title: "Brains Made of Math",          phase: 4, estimatedMinutes: 60, motif: "neuron",      hasCodeCell: true },
  { n: 12, slug: "going-deep",              title: "Going Deep",                   phase: 4, estimatedMinutes: 50, motif: "training",    hasCodeCell: true },
  { n: 13, slug: "how-it-actually-learns",  title: "How It Actually Learns",       phase: 4, estimatedMinutes: 60, motif: "neuron",      hasCodeCell: true },
  // Phase 5 - Modern Era
  { n: 14, slug: "learning-without-teacher",title: "Learning Without a Teacher",   phase: 5, estimatedMinutes: 50, motif: "embedding",   hasCodeCell: true },
  { n: 15, slug: "how-chatgpt-works",       title: "How ChatGPT Works",            phase: 5, estimatedMinutes: 60, motif: "attention",   hasCodeCell: true },
  { n: 16, slug: "final-showcase",          title: "Final Showcase",               phase: 5, estimatedMinutes: 90, motif: "training",    hasCodeCell: false },
];

export function getSession(slugOrN: string | number): SessionMeta | undefined {
  if (typeof slugOrN === "number") return SESSIONS.find((s) => s.n === slugOrN);
  return SESSIONS.find((s) => s.slug === slugOrN);
}

export function getPhaseBySlug(slug: string): PhaseMeta | undefined {
  return PHASES.find((p) => p.slug === slug);
}

export function getPhaseByN(n: Phase): PhaseMeta | undefined {
  return PHASES.find((p) => p.n === n);
}

export function sessionsByPhase(): {
  phase: Phase;
  slug: PhaseSlug;
  name: string;
  sessionRange: string;
  sessions: SessionMeta[];
  lab?: PhaseMeta["lab"];
}[] {
  return PHASES.map((p) => ({
    phase: p.n,
    slug: p.slug,
    name: p.name,
    sessionRange: p.sessions,
    sessions: SESSIONS.filter((s) => s.phase === p.n),
    lab: p.lab,
  }));
}
```

What changed:
- `PHASES` is now typed as `PhaseMeta[]` instead of an inline shape.
- Each phase entry has a `slug`. Phase 2 also has a `lab` block.
- `SessionMeta.hasLab` is removed. Every `hasLab: false` line in `SESSIONS` is gone.
- `getPhaseBySlug` and `getPhaseByN` are added.
- `sessionsByPhase()` now also returns `slug`, `lab`, and `sessionRange` (renamed from the old `sessions` string field on `PHASES` to avoid name collision with the array of session metas).

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: errors about `hasLab` references in:
- `app/sessions/[slug]/page.tsx` (the line `const hasLab = session.slug === "rolling-downhill"` is fine because it's locally scoped, but `LessonShell` accepts `hasLab` as a prop - that prop will go in Task 3).
- `app/sessions/page.tsx` and `components/public/Sidebar.tsx` reference `phaseMeta.sessions` (the string range). The new shape returns it as `sessionRange` from `sessionsByPhase()`, but those files might still read `phaseMeta.sessions` from `PHASES` directly. We will fix those usages in their own tasks.

Note any errors for fixing in later tasks. **No commit yet.**

---

## Task 2: Migrate the lab routing layer (LabRoot/LabHeader, new phase route, delete old session route)

This task is one atomic refactor. The build will be temporarily broken between steps 2 and 5 and is expected to pass again at step 6.

**Files:**
- Modify: `components/lab/LabRoot.tsx`
- Modify: `components/lab/LabHeader.tsx`
- Create: `app/phases/[slug]/lab/page.tsx`
- Delete: `app/sessions/[slug]/lab/page.tsx`

- [ ] **Step 1: Update `components/lab/LabRoot.tsx`**

Replace the entire file with:

```tsx
"use client";

import { LabProvider } from "@/lib/lab/LabContext";
import { LabHeader } from "./LabHeader";
import { BeatJourney } from "./BeatJourney";
import { getPhaseBySlug } from "@/lib/sessions";

// Phase-level lab. Phase metadata (title, summary) is read from
// PHASES in lib/sessions.ts via the phaseSlug prop. The internal
// beat sequence is still hardcoded in lib/lab/beats.ts; sprint 3
// will read it from lab.config.json per phase.

export function LabRoot({
  phaseSlug,
  onClose,
}: {
  phaseSlug: string;
  onClose?: () => void;
}) {
  const phase = getPhaseBySlug(phaseSlug);
  if (!phase || !phase.lab) return null;

  return (
    <LabProvider>
      <div
        data-register="lab"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "var(--neutral-50)",
          overflow: "hidden",
        }}
      >
        <LabHeader
          title={phase.lab.title}
          phaseLabel={`Phase ${phase.n}`}
          onClose={onClose}
        />
        <BeatJourney />
      </div>
    </LabProvider>
  );
}
```

- [ ] **Step 2: Update `components/lab/LabHeader.tsx`**

Replace the prop signature and the small badge that previously read `Session NN`. Find the prop block at the top of the function:

```tsx
export function LabHeader({
  title,
  sessionN,
  onClose,
}: {
  title: string;
  sessionN: number;
  onClose?: () => void;
})
```

Replace with:

```tsx
export function LabHeader({
  title,
  phaseLabel,
  onClose,
}: {
  title: string;
  phaseLabel: string;
  onClose?: () => void;
})
```

Then find the badge line:

```tsx
<span style={{ fontSize: 12, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}>
  Session {String(sessionN).padStart(2, "0")}
</span>
```

Replace with:

```tsx
<span style={{ fontSize: 12, color: "var(--neutral-500)", fontFamily: "var(--font-mono)" }}>
  {phaseLabel}
</span>
```

The rest of the file is unchanged.

- [ ] **Step 3: Create `app/phases/[slug]/lab/page.tsx`**

First create the directory: `mkdir -p ~/margin/app/phases/\[slug\]/lab`

Then create the file with this content:

```tsx
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { getPhaseBySlug, PHASES } from "@/lib/sessions";

const LabRoot = dynamic(
  () => import("@/components/lab/LabRoot").then((m) => m.LabRoot),
  { ssr: false }
);

export const dynamicParams = false;

export async function generateStaticParams() {
  return PHASES.filter((p) => p.lab).map((p) => ({ slug: p.slug }));
}

export default function PhaseLabPage({ params }: { params: { slug: string } }) {
  const phase = getPhaseBySlug(params.slug);
  if (!phase || !phase.lab) notFound();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--neutral-0)",
      }}
    >
      <div className="topnav" style={{ padding: "0 24px" }}>
        <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
          <Wordmark size={17} />
        </Link>
        <Link
          href="/sessions"
          style={{
            marginLeft: 24,
            fontSize: 13,
            color: "var(--neutral-500)",
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
          }}
        >
          ← back to sessions
        </Link>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--neutral-400)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Lab · {phase.name}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LabRoot phaseSlug={phase.slug} />
      </div>
    </div>
  );
}
```

Note: `dynamicParams = false` plus `generateStaticParams()` returning only phases with a `lab` block ensures `/phases/the-hook/lab` (and the other lab-less phase slugs) return 404 at build time.

- [ ] **Step 4: Delete the old session-lab route**

Run: `rm ~/margin/app/sessions/\[slug\]/lab/page.tsx`

Then remove the now-empty directory if Next.js dislikes it:
`rmdir ~/margin/app/sessions/\[slug\]/lab 2>/dev/null || true`

- [ ] **Step 5: Verify TypeScript compiles for the lab modules**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: still some errors about `LessonShell` accepting `hasLab` and importing things related to `LabRoot`. These will be fixed in Task 3. The new lab page itself should not produce errors.

- [ ] **Step 6: Verify the new phase lab route works in the browser**

If the dev server isn't running: `cd ~/margin && npm run dev`

Visit `http://localhost:3000/phases/linear-regression/lab`. Expected: the existing Hiker's Descent / BeatJourney experience renders fullscreen, with the topnav showing "← back to sessions" on the left and "Lab · Linear Regression" on the right. The LabHeader inside shows "Phase 2" as the badge text.

Visit `http://localhost:3000/phases/the-hook/lab`. Expected: 404.

Visit `http://localhost:3000/sessions/rolling-downhill/lab`. Expected: 404 (route deleted).

If any of these fail, do not proceed. Diagnose first.

---

## Task 3: Strip lab UI from session pages

**Files:**
- Modify: `app/sessions/[slug]/LessonShell.tsx`
- Modify: `app/sessions/[slug]/page.tsx`

- [ ] **Step 1: Replace `app/sessions/[slug]/LessonShell.tsx`**

Replace the entire file with:

```tsx
import { Sidebar } from "@/components/public/Sidebar";
import { type SessionMeta } from "@/lib/sessions";

// Wraps the lesson notes (server-rendered MDX, passed in as `notesNode`)
// alongside the per-phase Sidebar. Labs live at /phases/[slug]/lab,
// not inside session pages.

export function LessonShell({
  session,
  notesNode,
}: {
  session: SessionMeta;
  notesNode: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <Sidebar currentSlug={session.slug} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main style={{ flex: 1, overflow: "auto", padding: "0 64px" }}>
          {notesNode}
        </main>
      </div>
    </div>
  );
}
```

What's gone:
- `"use client"` directive (no state or effects left).
- `useState`, `dynamic`, the `LabRoot` import.
- `hasLab` prop, `labOpen` state, the 60/40 width transition logic.
- `OpenLabCard` and `PlaceholderCard` helper components.
- The lab panel `<div>` and the sticky open-lab card container.

`PlaceholderCard` is no longer exported from this file - we will fix the import in `page.tsx` next.

- [ ] **Step 2: Update `app/sessions/[slug]/page.tsx`**

Open the file and apply these edits:

**Change 1** - update the import on line 13:

Before:
```tsx
import { LessonShell, PlaceholderCard } from "./LessonShell";
```

After:
```tsx
import { LessonShell } from "./LessonShell";
```

**Change 2** - delete the `hasLab` const around line 47:

Before:
```tsx
  // Sprint 1 only ships Session 6's lab. Other sessions still show
  // the lesson but with a "coming soon" affordance.
  const hasLab = session.slug === "rolling-downhill";
```

After: delete those three lines entirely.

**Change 3** - delete the `PlaceholderCard` block around lines 88-92:

Before:
```tsx
      {!hasLab && (
        <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
          <PlaceholderCard session={session} />
        </div>
      )}
```

After: delete that block entirely.

**Change 4** - update the LessonShell call near line 121:

Before:
```tsx
<LessonShell session={session} notesNode={notesNode} hasLab={hasLab} />
```

After:
```tsx
<LessonShell session={session} notesNode={notesNode} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: clean (zero errors). If errors remain, they are most likely in `Sidebar.tsx` or `app/sessions/page.tsx` reading `phaseMeta.sessions` (which still exists on `PHASES` as the string range; only `sessionsByPhase()`'s array got renamed to `sessionRange`). Those usages were never touched, so they should be fine. Investigate any remaining errors before proceeding.

- [ ] **Step 4: Verify in the browser**

Visit `http://localhost:3000/sessions/rolling-downhill`. Expected:
- The lesson renders with the sidebar on the left and notes on the right.
- No "Open Lab" card sticky at the bottom right.
- No slide-in lab panel.
- No "Lab - coming soon" placeholder card at the bottom of the lesson.

Visit `http://localhost:3000/sessions/data-is-everything` (a Phase 1 session). Expected: same lesson-only layout.

If either page shows a lab affordance in the main content area, the cleanup is incomplete - go back and search the file for any remaining `hasLab`, `OpenLabCard`, or `PlaceholderCard` references.

---

## Task 4: Add the lab pill to `components/public/Sidebar.tsx`

**Files:**
- Modify: `components/public/Sidebar.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire file with:

```tsx
import Link from "next/link";
import { sessionsByPhase } from "@/lib/sessions";
import { PhasePip } from "@/components/illustrations/PhasePip";

// Lesson-page sidebar. Per design brief §6.1: 240px expanded.
// Each phase block: header pip + label, then the phase lab pill
// (active link or disabled "coming soon"), then the session rows.

export function Sidebar({ currentSlug }: { currentSlug?: string }) {
  const grouped = sessionsByPhase();
  return (
    <aside
      style={{
        width: 240,
        flex: "none",
        borderRight: "1px solid var(--neutral-200)",
        background: "var(--neutral-50)",
        padding: "24px 16px",
        overflow: "auto",
      }}
    >
      {grouped.map(({ phase, slug, name, sessions, lab }) => (
        <div key={phase} style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              marginBottom: 4,
              color: "var(--neutral-500)",
            }}
          >
            <span style={{ color: "var(--neutral-700)", display: "inline-flex" }}>
              <PhasePip phase={phase} size={14} />
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Phase {phase} · {name}
            </span>
          </div>

          {lab ? (
            <Link
              href={`/phases/${slug}/lab`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                marginBottom: 8,
                borderRadius: 6,
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                background: "transparent",
              }}
            >
              <span>Open Lab</span>
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 10px",
                marginBottom: 8,
                borderRadius: 6,
                border: "1px solid var(--neutral-200)",
                color: "var(--neutral-400)",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              Lab - coming soon
            </div>
          )}

          {sessions.map((s) => {
            const active = s.slug === currentSlug;
            return (
              <Link
                key={s.n}
                href={`/sessions/${s.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  marginBottom: 1,
                  borderRadius: 6,
                  background: active ? "var(--neutral-0)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px var(--neutral-200)" : "none",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    width: 20,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: active ? "var(--accent)" : "var(--neutral-400)",
                    fontWeight: 600,
                    textAlign: "center",
                    flex: "none",
                  }}
                >
                  {String(s.n).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--neutral-900)" : "var(--neutral-700)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
```

What's new: the `lab ? <Link> : <div>` block sits between the phase header and the session rows. The active state uses `var(--accent)` (Clay #B5532A per the design brief) for the border and label. The disabled state uses neutral-200 border and neutral-400 italic text.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 3: Verify in the browser**

Visit `http://localhost:3000/sessions/rolling-downhill` (Phase 2 session). Expected: in the left sidebar, under "PHASE 2 · LINEAR REGRESSION", the "Open Lab →" pill renders with the accent (Clay) border. Clicking it navigates to `/phases/linear-regression/lab`.

Visit `http://localhost:3000/sessions/data-is-everything` (Phase 1 session). Expected: under "PHASE 1 · THE HOOK", a muted disabled pill reading "Lab - coming soon" with neutral border and italic text. It is not clickable.

Confirm Phases 3, 4, 5 all show the disabled pill the same way.

---

## Task 5: Add the lab pill to the sessions index (`app/sessions/page.tsx`)

**Files:**
- Modify: `app/sessions/page.tsx`

- [ ] **Step 1: Update the imports**

The existing import line:
```ts
import { PHASES, sessionsByPhase } from "@/lib/sessions";
```

is fine - `sessionsByPhase()` now also returns `slug` and `lab` per Task 1. We do not need to change imports.

But add `Link` if not already imported. Check the top of the file. If `import Link from "next/link";` is missing, add it.

- [ ] **Step 2: Update the phase header strip JSX**

Find this block in the file (currently lines 39-75):

```tsx
        {grouped.map(({ phase, name, sessions }, i) => {
          const phaseMeta = PHASES[phase - 1];
          return (
            <div key={phase} style={{ marginBottom: i === grouped.length - 1 ? 0 : 56 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 0",
                  marginBottom: 16,
                  borderBottom: "1px solid var(--neutral-200)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--neutral-500)",
                    letterSpacing: 0.5,
                    width: 56,
                  }}
                >
                  Phase {phase}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>{name}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--neutral-500)",
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Sessions {phaseMeta.sessions}
                </span>
              </div>
```

Replace with:

```tsx
        {grouped.map(({ phase, slug, name, sessions, lab }, i) => {
          const phaseMeta = PHASES[phase - 1];
          return (
            <div key={phase} style={{ marginBottom: i === grouped.length - 1 ? 0 : 56 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 0",
                  marginBottom: 16,
                  borderBottom: "1px solid var(--neutral-200)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--neutral-500)",
                    letterSpacing: 0.5,
                    width: 56,
                  }}
                >
                  Phase {phase}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>{name}</span>

                {lab ? (
                  <Link
                    href={`/phases/${slug}/lab`}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Open Lab →
                  </Link>
                ) : (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--neutral-200)",
                      color: "var(--neutral-400)",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    Lab - coming soon
                  </span>
                )}

                <span
                  style={{
                    fontSize: 13,
                    color: "var(--neutral-500)",
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Sessions {phaseMeta.sessions}
                </span>
              </div>
```

What changed:
- Destructured `slug` and `lab` from each `grouped` entry.
- Added the active `<Link>` / disabled `<span>` block between the phase name and the right-aligned `Sessions 4-7` text. The auto margin on the Sessions span continues to right-align it; the new pill sits inline after the name.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 4: Verify in the browser**

Visit `http://localhost:3000/sessions`. Expected:
- The "Phase 2 · Linear Regression" header strip shows an "Open Lab →" pill in accent (Clay) between the name and the right-aligned "Sessions 4-7" label. Clicking it goes to `/phases/linear-regression/lab`.
- The Phase 1 ("The Hook"), Phase 3, Phase 4, and Phase 5 strips show a muted "Lab - coming soon" pill in the same slot.

If the pills don't render at all, double-check the JSX you replaced and confirm `lab` is destructured from `grouped`.

---

## Task 6: Final verification

**Files:** none modified.

- [ ] **Step 1: Run a clean type-check**

Run: `cd ~/margin && npx tsc --noEmit`

Expected: zero output, exit code 0.

- [ ] **Step 2: Run a production build**

Run: `cd ~/margin && rm -rf .next && npm run build`

Expected: build completes successfully. Look in the route summary output for:
- `/phases/[slug]/lab` listed (likely as `/phases/linear-regression/lab` since `dynamicParams = false`).
- `/sessions/[slug]/lab` NOT listed (route deleted).

If the build fails, fix issues before proceeding.

- [ ] **Step 3: Confirm no leftover `hasLab` references**

Run: `cd ~/margin && grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "hasLab" .`

Expected: zero results. (The phrase "hasLab" should appear nowhere - not in `lib/sessions.ts`, not in `LessonShell.tsx`, not in `page.tsx`, not in any docs that need updating).

If results appear in `docs/superpowers/specs/` referring to the legacy model, that's fine - leave those historical docs alone. Only code matches matter.

- [ ] **Step 4: Confirm no em-dashes were re-introduced**

Run: `cd ~/margin && grep -rn --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" --include="*.css" --include="*.html" --include="*.mdx" --include="*.json" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "—" .`

Expected: zero results.

- [ ] **Step 5: Manual browser smoke test against acceptance criteria**

Restart the dev server if needed: `cd ~/margin && npm run dev` (note the port; the project may end up on 3000 or higher).

Walk through each criterion from the spec:

1. `/phases/linear-regression/lab` renders the Hiker's Descent fullscreen.
2. `/phases/the-hook/lab` returns 404. Same for `/phases/classification/lab`, `/phases/neural-networks/lab`, `/phases/modern-era/lab`.
3. `/sessions/rolling-downhill/lab` returns 404.
4. Sidebar (visible on any session page like `/sessions/rolling-downhill`) shows "Open Lab →" under Phase 2 and disabled "Lab - coming soon" under Phases 1, 3, 4, 5.
5. `/sessions` index shows the same pill treatment in the phase header strips.
6. Any `/sessions/[slug]` page shows lesson + sidebar only - no slide-in lab panel, no open-lab card, no placeholder card.

All six should pass. If any fail, fix before reporting complete.

- [ ] **Step 6: Notify the user**

Report verification results to the user. Do NOT commit. The user will commit the full set of changes (em-dash sweep + phase-labs migration) when ready.

---

## Post-implementation memory update

Once the user confirms the implementation is correct, update memory:
- The locked decision in `project_margin.md` ("Both lab routes exist: /sessions/[id] (panel) and /sessions/[id]/lab (standalone)") is superseded. Update that bullet to: "Labs are phase-level. Route: `/phases/[slug]/lab`. Sessions are lesson-only. Phase 2 is the only phase with a live lab as of this change."

This is part of the implementation hand-off, not a code task.
