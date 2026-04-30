# Phase Labs - Design Spec

**Date:** 2026-04-30
**Status:** Approved by user, pending implementation plan
**Supersedes:** Master plan section on per-session labs (the previous "every session has its own lab" model)

## Context

The current architecture treats labs as session-level: `SessionMeta.hasLab: boolean` lives on each of the 16 sessions, the slide-in lab panel mounts inside `app/sessions/[slug]/LessonShell.tsx`, and a fullscreen mode lives at `/sessions/[slug]/lab`. Today every session has `hasLab: false` (no labs are live yet). The only lab actually built is the gradient-descent / "Hiker's Descent" experience (`components/lab/BeatJourney.tsx` + `lib/lab/beats.ts`), originally targeted at Session 6 (rolling-downhill).

That lab does not actually belong to one session. Gradient descent is the unifying idea across all of Phase 2 (Linear Regression, sessions 4-7: drawing-lines, how-wrong-are-we, rolling-downhill, real-world-regression). Surfacing it as a Session-6-only lab misrepresents its scope and, if mirrored on every Phase 2 session, would make students think they have to complete the same lab four times.

## Goal

Move labs from session-level to phase-level. Each phase gets at most one lab; sessions go back to being lesson-only.

## Non-goals

- No new content authored. Only Phase 2's existing BeatJourney lab gets re-wired; phases 1, 3, 4, 5 remain lab-less.
- No phase landing/index page. Phases stay a grouping concept, not their own browseable section.
- No backwards-compatible redirects. No labs are live in production today, so the deleted `/sessions/[slug]/lab` route has no traffic to preserve.
- The lab's internal mechanics (BeatJourney, beats.ts, widgets, channels, sim/) are unchanged. Only its wiring at the top changes.

## Architecture

### Data model

`PHASES` in `lib/sessions.ts` becomes the registry for phase-level metadata, including labs:

```ts
export const PHASES: {
  n: Phase;
  slug: string;             // NEW: "the-hook" | "linear-regression" | ...
  name: string;
  sessions: string;         // human-readable range, e.g. "4-7"
  lab?: {
    title: string;          // "The Hiker's Descent"
    summary: string;        // sub-line for the open-lab card / pill tooltip
  };
}[] = [
  { n: 1, slug: "the-hook",          name: "The Hook",          sessions: "1-3"  },
  { n: 2, slug: "linear-regression", name: "Linear Regression", sessions: "4-7",
    lab: { title: "The Hiker's Descent", summary: "Train a line. Watch gradient descent." } },
  { n: 3, slug: "classification",    name: "Classification",    sessions: "8-10"  },
  { n: 4, slug: "neural-networks",   name: "Neural Networks",   sessions: "11-13" },
  { n: 5, slug: "modern-era",        name: "Modern Era",        sessions: "14-16" },
];
```

Changes from current:
- Each phase gets a stable `slug` field (kebab-case, derived from `name`).
- Each phase gets an optional `lab` block. Only Phase 2 has it for now.
- `SessionMeta.hasLab` is removed. It was always `false`; phase-level labs replace it.
- `SessionMeta.hasCodeCell` is unchanged. (It gates Pyodide bytes, separate concern.)

A new helper `getPhaseBySlug(slug: string): PhaseMeta | undefined` mirrors `getSession(...)` for the phase route to look up its lab data.

### Routes

**New:**

- `app/phases/[slug]/lab/page.tsx` - fullscreen lab page. Server component looks up the phase via `getPhaseBySlug(params.slug)`. Returns Next.js `notFound()` if the phase doesn't exist or has no `lab` block. Renders a client `<LabRoot phaseSlug={slug} />` with `dynamic(..., { ssr: false })` since the lab pulls Three.js, recharts, GSAP.

**Removed:**

- `app/sessions/[slug]/lab/page.tsx` - the per-session standalone lab route. Deleted (no production traffic; no labs are live today).

**Unchanged:**

- `app/sessions/page.tsx` - sessions index (gets a UI update; URL stays).
- `app/sessions/[slug]/page.tsx` - session detail (gets a UI update; URL stays).

### Sidebar

`components/public/Sidebar.tsx` adds one element per phase block, between the existing phase header (`Phase N · Name`) and the session-row list:

- If `phase.lab` is set: a small "Open Lab" link styled as a sidebar pill. Full-width inside the 240px column, ~28px tall, accent-bordered, points to `/phases/[slug]/lab`. Visually distinct from session rows (it's a lab, not a session) but visually subordinate to the phase header (the header still owns the block).
- If `phase.lab` is not set: a disabled "Lab - coming soon" pill of identical dimensions, with `var(--neutral-400)` text, no hover, no link.

The Sidebar remains a server component. The active case renders a `<Link>`; the disabled case renders a styled `<div>` or `<span>`.

### Sessions index page

`app/sessions/page.tsx` mirrors the sidebar treatment on the wide layout. The existing phase-header strip currently shows:

```
[Phase 2]  [Linear Regression]                              [Sessions 4-7]
```

It becomes (when the phase has a lab):

```
[Phase 2]  [Linear Regression]    [Open Lab →]              [Sessions 4-7]
```

For phases without a lab, the same slot shows the disabled "Lab - coming soon" pill. Right alignment of the existing `Sessions 4-7` label is preserved.

### Session pages cleanup

`app/sessions/[slug]/LessonShell.tsx` shrinks substantially. The following are removed:

- `hasLab` prop.
- `labOpen` state and the 60/40 width transition.
- The dynamic `LabRoot` import.
- The lab panel column (the 200ms slide-in `<div>`).
- The `OpenLabCard` and `PlaceholderCard` helper components defined in the same file.

End state: `LessonShell` is just `<Sidebar /> + <main>{notesNode}</main>` with the existing reading typography and padding. Width transitions, sticky open-lab card, placeholder card - all gone.

`app/sessions/[slug]/page.tsx` drops the `hasLab` prop pass-through.

### LabRoot and content migration

`components/lab/LabRoot.tsx` currently takes `sessionN: number` and a hardcoded `title` string. It changes to take `phaseSlug: string`:

- Internally calls `getPhaseBySlug(phaseSlug)` for `title` and other lab metadata.
- Throws or returns null if the slug is invalid (defense in depth - the phase-route page component already guards via `notFound()`).
- Passes data downstream to `BeatJourney` exactly as today (the inner content is unchanged).

`components/lab/LabHeader.tsx` shows `phase.lab.title` from the phase metadata. The close/back button navigates to `/sessions` (the index page) since there is no enclosing session anymore.

`components/lab/BeatJourney.tsx`, `lib/lab/beats.ts`, `lib/lab/channels.ts`, `lib/lab/LabContext.tsx`, `lib/lab/sim/*`, `components/lab/widgets/*` - all unchanged. The lab's content lives at its new phase URL, but the implementation guts are identical.

## Surface map (after)

| Surface | Behavior |
| --- | --- |
| `/sessions` (index) | Phase header strip gains "Open Lab →" or disabled "Lab - coming soon" pill. |
| `/sessions/[slug]` (session detail) | Lesson-only. Sidebar shows phase pills. No lab UI in the main content area. |
| Sidebar (every page that uses it) | Each phase block shows phase header + lab pill (active or disabled) + session links. |
| `/phases/linear-regression/lab` | New. Renders the Hiker's Descent / BeatJourney lab fullscreen. |
| `/phases/[other-slug]/lab` | Returns 404 (no `lab` block on phases 1, 3, 4, 5). |
| `/sessions/rolling-downhill/lab` | Deleted. 404 (no redirect; no production traffic). |

## Visual notes

- "Open Lab" pill in the sidebar should read as primary action but not louder than the phase header. Likely accent-bordered, no fill, ~13px label.
- "Lab - coming soon" pill sits at lower visual weight than the active state - subdued text, neutral border, 0.6 opacity feel.
- On the index page, the active "Open Lab" pill can mirror the same pill treatment plus a → glyph. Width follows content; right-aligned alongside the existing `Sessions 4-7` label.

## Risks and tradeoffs

- **Locked decision update.** Memory previously recorded "Both lab routes exist: /sessions/[id] (panel) and /sessions/[id]/lab (standalone)" as a locked decision. This spec supersedes that decision. The memory entry must be updated post-merge to reflect the phase-level model.
- **Phase 1 has no lab and Sessions 1-3 have no code cells.** This is fine - Phase 1 is intentionally non-coding. The "Lab - coming soon" pill on Phase 1's sidebar block may eventually be replaced with "No lab for this phase" or simply hidden. For this iteration, it shows the disabled pill (consistent with phases 3, 4, 5).
- **No phase landing page.** A phase slug (`linear-regression`) only resolves the `/phases/[slug]/lab` URL. A bare visit to `/phases/linear-regression` is a 404 in this spec. If we later want a phase overview page, it slots in cleanly.
- **`PlaceholderCard` deletion.** It was the only "Lab in development" UI. Phases without labs now use the sidebar/index pill instead, which is consistent across all phase surfaces.

## Out of scope

- Phase landing pages (`/phases/[slug]`).
- Multi-lab phases (e.g. a phase with two distinct labs).
- Cross-phase labs (one lab spanning multiple phases).
- Per-session "open in lab" pointers from session prose (Option B from brainstorming - rejected).
- Re-encoding any lab content; only the routing layer changes.

## Acceptance criteria

1. Visiting `/phases/linear-regression/lab` renders the existing Hiker's Descent / BeatJourney experience fullscreen, identical to today's `/sessions/rolling-downhill/lab`.
2. Visiting `/phases/the-hook/lab` (or any phase without a `lab` block) returns 404.
3. Visiting `/sessions/rolling-downhill/lab` returns 404.
4. The sidebar shows an "Open Lab" pill on Phase 2's block and a disabled "Lab - coming soon" pill on Phases 1, 3, 4, 5.
5. The `/sessions` index shows an "Open Lab" link on Phase 2's header row and the disabled "Lab - coming soon" treatment on Phases 1, 3, 4, 5.
6. Visiting any `/sessions/[slug]` page shows lesson + sidebar only - no lab side panel, no open-lab card, no placeholder card.
7. `SessionMeta.hasLab` no longer exists in `lib/sessions.ts`.
8. `getPhaseBySlug(slug)` returns the correct phase metadata for all 5 phase slugs and `undefined` for unknown slugs.
9. `npx tsc --noEmit` passes. `next build` succeeds.
10. No em-dashes introduced (the codebase was just scrubbed).
