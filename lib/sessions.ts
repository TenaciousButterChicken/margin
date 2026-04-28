// The 16-session registry. Titles and ordering are from MASTER_PLAN §3.
// This is the single source of truth; sidebar, landing grid, and lesson
// routes all read from here.

import type { MotifKind } from "@/components/illustrations/motifs";

export type Phase = 1 | 2 | 3 | 4 | 5;

export type SessionMeta = {
  n: number;            // 1..16
  slug: string;         // URL slug, also content folder name under content/sessions/
  title: string;        // master-plan canonical title
  phase: Phase;
  estimatedMinutes: number;
  motif?: MotifKind;    // optional per master-plan §7.1; sessions 1–3 omit
  featured?: boolean;   // for landing-page emphasis
  hasLab: boolean;      // false until the lab.config.json is shipped
  hasCodeCell: boolean; // gates Pyodide loading; false for sessions 1–3 + S16
};

export const PHASES: { n: Phase; name: string; sessions: string }[] = [
  { n: 1, name: "The Hook",         sessions: "1–3"   },
  { n: 2, name: "Linear Regression",sessions: "4–7"   },
  { n: 3, name: "Classification",   sessions: "8–10"  },
  { n: 4, name: "Neural Networks",  sessions: "11–13" },
  { n: 5, name: "Modern Era",       sessions: "14–16" },
];

export const SESSIONS: SessionMeta[] = [
  // Phase 1 — The Hook (no-code)
  { n: 1,  slug: "machines-that-learn",     title: "The Machines That Learn",      phase: 1, estimatedMinutes: 30, hasLab: false, hasCodeCell: false },
  { n: 2,  slug: "teaching-like-kids",      title: "Teaching Computers Like Teaching Kids", phase: 1, estimatedMinutes: 45, hasLab: false, hasCodeCell: false },
  { n: 3,  slug: "data-is-everything",      title: "Data Is Everything",           phase: 1, estimatedMinutes: 45, hasLab: false, hasCodeCell: false },
  // Phase 2 — Linear Regression
  { n: 4,  slug: "drawing-lines",           title: "Drawing Lines Through Dots",   phase: 2, estimatedMinutes: 50, motif: "data_point",  hasLab: false, hasCodeCell: true },
  { n: 5,  slug: "how-wrong-are-we",        title: "How Wrong Are We?",            phase: 2, estimatedMinutes: 50, motif: "cost_surface",hasLab: false, hasCodeCell: true },
  { n: 6,  slug: "rolling-downhill",        title: "Rolling Downhill",             phase: 2, estimatedMinutes: 60, motif: "hiker", featured: true, hasLab: false, hasCodeCell: true },
  { n: 7,  slug: "real-world-regression",   title: "Real-World Regression",        phase: 2, estimatedMinutes: 50, motif: "data_point",  hasLab: false, hasCodeCell: true },
  // Phase 3 — Classification
  { n: 8,  slug: "cats-or-dogs",            title: "Cats or Dogs?",                phase: 3, estimatedMinutes: 50, motif: "decision_boundary", hasLab: false, hasCodeCell: true },
  { n: 9,  slug: "when-models-lie",         title: "When Models Lie",              phase: 3, estimatedMinutes: 50, motif: "decision_boundary", hasLab: false, hasCodeCell: true },
  { n: 10, slug: "titanic",                 title: "Mini-Project: Titanic",        phase: 3, estimatedMinutes: 75, motif: "data_point",  hasLab: false, hasCodeCell: true },
  // Phase 4 — Neural Networks
  { n: 11, slug: "brains-made-of-math",     title: "Brains Made of Math",          phase: 4, estimatedMinutes: 60, motif: "neuron",      hasLab: false, hasCodeCell: true },
  { n: 12, slug: "going-deep",              title: "Going Deep",                   phase: 4, estimatedMinutes: 50, motif: "training",    hasLab: false, hasCodeCell: true },
  { n: 13, slug: "how-it-actually-learns",  title: "How It Actually Learns",       phase: 4, estimatedMinutes: 60, motif: "neuron",      hasLab: false, hasCodeCell: true },
  // Phase 5 — Modern Era
  { n: 14, slug: "learning-without-teacher",title: "Learning Without a Teacher",   phase: 5, estimatedMinutes: 50, motif: "embedding",   hasLab: false, hasCodeCell: true },
  { n: 15, slug: "how-chatgpt-works",       title: "How ChatGPT Works",            phase: 5, estimatedMinutes: 60, motif: "attention",   hasLab: false, hasCodeCell: true },
  { n: 16, slug: "final-showcase",          title: "Final Showcase",               phase: 5, estimatedMinutes: 90, motif: "training",    hasLab: false, hasCodeCell: false },
];

export function getSession(slugOrN: string | number): SessionMeta | undefined {
  if (typeof slugOrN === "number") return SESSIONS.find((s) => s.n === slugOrN);
  return SESSIONS.find((s) => s.slug === slugOrN);
}

export function sessionsByPhase(): { phase: Phase; name: string; sessions: SessionMeta[] }[] {
  return PHASES.map((p) => ({
    phase: p.n,
    name: p.name,
    sessions: SESSIONS.filter((s) => s.phase === p.n),
  }));
}
