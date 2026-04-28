// Session 6 — "Rolling Downhill" beat journey.
// 9 beats; 1, 2, 6 implemented as load-bearing v1, others stub-pass-through.
// Each beat declares (a) the text shown above the widget, (b) what UI is
// unlocked, (c) the criterion for completion (when "Next" enables).

export type BeatId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BeatUnlocks = {
  showLine: boolean;
  lineDraggable: boolean;
  showBowl: boolean;
  bowlDraggable: boolean;
  showStepButton: boolean;
  showPredictPanel: boolean;
  lrSliderMode: "hidden" | "locked" | "unlocked";
  lrLockedAt?: number;
  fogged: boolean;
  showHikerTrail: boolean;
  // For beat 6 — auto-run a divergent simulation after prediction
  autoRunOnPredict?: boolean;
  shakeCameraOnDiverge?: boolean;
};

export type Beat = {
  id: BeatId;
  kicker: string;             // "Beat 1 — The hook"
  prompt: string;             // The instructional sentence above the widget
  reveal?: string;            // Text that fades in when the beat completes
  unlocks: BeatUnlocks;
  // Completion criterion as a discriminated union — checked against beat
  // progress state by BeatJourney.
  completion:
    | { kind: "loss_below"; threshold: number }
    | { kind: "dragged_both" }                  // user dragged BOTH the line and the bowl handle
    | { kind: "predicted_and_ran" }
    | { kind: "always" };                       // pass-through stubs
};

export const BEATS: Record<BeatId, Beat> = {
  1: {
    id: 1,
    kicker: "Beat 1 — The hook",
    prompt: "Drag the line to fit the dots. Get the loss below 5.",
    reveal:
      "Nice. You did that with two numbers — slope and intercept. What if there were a million?",
    unlocks: {
      showLine: true,
      lineDraggable: true,
      showBowl: false,
      bowlDraggable: false,
      showStepButton: false,
      showPredictPanel: false,
      lrSliderMode: "hidden",
      fogged: false,
      showHikerTrail: false,
    },
    completion: { kind: "loss_below", threshold: 0.05 },
  },

  2: {
    id: 2,
    kicker: "Beat 2 — The bowl appears",
    prompt:
      "Every point on this bowl is one possible line. Low = good fit. High = bad. Drag either side — they're the same thing.",
    reveal:
      "The bowl-position and the line-on-data are the same thing in two costumes. The bowl IS every possible line, mapped to its loss.",
    unlocks: {
      showLine: true,
      lineDraggable: true,
      showBowl: true,
      bowlDraggable: true,
      showStepButton: false,
      showPredictPanel: false,
      lrSliderMode: "hidden",
      fogged: false,
      showHikerTrail: false,
    },
    completion: { kind: "dragged_both" },
  },

  3: {
    id: 3,
    kicker: "Beat 3 — Blindfolded",
    prompt:
      "[Coming soon] Now imagine you can't see the bowl — only the slope under your feet.",
    unlocks: {
      showLine: true,
      lineDraggable: true,
      showBowl: true,
      bowlDraggable: true,
      showStepButton: false,
      showPredictPanel: false,
      lrSliderMode: "hidden",
      fogged: false,
      showHikerTrail: false,
    },
    completion: { kind: "always" },
  },

  4: {
    id: 4,
    kicker: "Beat 4 — Watch the arrow shrink",
    prompt: "[Coming soon] Take steps. Watch the gradient arrow shrink.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: true,
      showPredictPanel: false,
      lrSliderMode: "locked",
      lrLockedAt: 0.08,
      fogged: false,
      showHikerTrail: true,
    },
    completion: { kind: "always" },
  },

  5: {
    id: 5,
    kicker: "Beat 5 — Painfully small",
    prompt: "[Coming soon] Try lr = 0.001. Notice how slowly anything happens.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: true,
      showPredictPanel: false,
      lrSliderMode: "locked",
      lrLockedAt: 0.001,
      fogged: false,
      showHikerTrail: true,
    },
    completion: { kind: "always" },
  },

  6: {
    id: 6,
    kicker: "Beat 6 — The cliff",
    prompt:
      "Now try lr = 0.6. Predict first: does it (a) converge faster, (b) bounce around, (c) fly off?",
    reveal:
      "Not slower — different. A tiny bit too high doesn't make it worse, it makes it break. The cliff between 'works' and 'chaos' is sharper than it looks.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: false,
      showPredictPanel: true,
      lrSliderMode: "locked",
      lrLockedAt: 0.6,
      fogged: false,
      showHikerTrail: true,
      autoRunOnPredict: true,
      shakeCameraOnDiverge: true,
    },
    completion: { kind: "predicted_and_ran" },
  },

  7: {
    id: 7,
    kicker: "Beat 7 — The edge",
    prompt: "[Coming soon] Try lr = 0.45. Watch carefully — chaos that converges.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: true,
      showPredictPanel: false,
      lrSliderMode: "locked",
      lrLockedAt: 0.45,
      fogged: false,
      showHikerTrail: true,
    },
    completion: { kind: "always" },
  },

  8: {
    id: 8,
    kicker: "Beat 8 — The reward",
    prompt: "[Coming soon] Find an lr that gets to the bottom in under 18 steps.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: true,
      showPredictPanel: false,
      lrSliderMode: "unlocked",
      fogged: false,
      showHikerTrail: true,
    },
    completion: { kind: "always" },
  },

  9: {
    id: 9,
    kicker: "Beat 9 — The cliffhanger",
    prompt: "[Coming soon] Drop the hiker anywhere. They always end up here.",
    unlocks: {
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showStepButton: true,
      showPredictPanel: false,
      lrSliderMode: "unlocked",
      fogged: false,
      showHikerTrail: true,
    },
    completion: { kind: "always" },
  },
};

export const BEAT_ORDER: BeatId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function nextBeat(current: BeatId): BeatId | null {
  const idx = BEAT_ORDER.indexOf(current);
  if (idx === -1 || idx === BEAT_ORDER.length - 1) return null;
  return BEAT_ORDER[idx + 1];
}

export function prevBeat(current: BeatId): BeatId | null {
  const idx = BEAT_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return BEAT_ORDER[idx - 1];
}
