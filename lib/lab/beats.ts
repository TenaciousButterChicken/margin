// Session 6 - "Rolling Downhill" beat journey.
// IDs are strings so we can insert beats between integers (4.5, 4.6, …).

export type BeatId =
  | "1"
  | "2"
  | "3"
  | "4"
  | "4.5"
  | "4.6"
  | "4.7"
  | "4.8"
  | "5"
  | "6"
  | "7"
  | "8";

export type BeatUnlocks = {
  showLine: boolean;
  lineDraggable: boolean;
  showBowl: boolean;
  bowlDraggable: boolean;

  // Per-beat dot focus (beat 4.5 + later math beats)
  highlightDotIndex: number | null;

  // Math strip (introduced in 4.5, persists through end of lesson)
  showMathStrip: boolean;
  mathStripBeat?: "4.5" | "4.6" | "4.7" | "4.8";

  // Beat 4-5 step controls
  showStepOnce: boolean;
  showStepFour: boolean;
  showLrSlider: "hidden" | "locked-display" | "unlocked";
  lrLockedAt?: number;
  showProgressBar: boolean;

  // Beat 3 fog + direction choice
  fogged: boolean;
  fogIntensityForCorrect: number;
  showDirectionChoice: boolean;
  correctChoicesNeeded: number;

  // Beat 4 - visible gradient arrow
  showGradientArrow: boolean;
  /** Direction of the visible arrow. Default downhill (-gradient). 4.7 phase 2 toggles. */
  arrowDirection?: "downhill" | "uphill";

  // Beat 4.6 - show small pull arrows on each dot's residual
  showAllPullArrows: boolean;
  /** Bold/visible error bars on all dots even when not in highlight mode (4.6, 4.8). */
  boldErrorBars: boolean;

  // Beat 4.7 - glow the hiker (visually anchors "this is your position")
  hikerGlow: boolean;

  // Beat 6 - predict + diverge
  showPredictPanel: boolean;
  autoRunOnPredict?: boolean;
  shakeCameraOnDiverge?: boolean;

  showHikerTrail: boolean;
  showMinimumMarker: boolean;

  // Beat 7 - parameter-space-emergence demo
  showWeightSliders: boolean; // m (always) + b (when in phase 2)
  showParabola: boolean;      // 2D (m, error) plot, dots accumulate
};

const DEFAULT_UNLOCKS: BeatUnlocks = {
  showLine: false,
  lineDraggable: false,
  showBowl: false,
  bowlDraggable: false,
  highlightDotIndex: null,
  showMathStrip: false,
  showStepOnce: false,
  showStepFour: false,
  showLrSlider: "hidden",
  showProgressBar: false,
  fogged: false,
  fogIntensityForCorrect: 0.25,
  showDirectionChoice: false,
  correctChoicesNeeded: 4,
  showGradientArrow: false,
  arrowDirection: "downhill",
  showAllPullArrows: false,
  boldErrorBars: false,
  hikerGlow: false,
  showPredictPanel: false,
  showHikerTrail: false,
  showMinimumMarker: true,
  showWeightSliders: false,
  showParabola: false,
};

export type Beat = {
  id: BeatId;
  kicker: string;
  prompt: string;
  reveal?: string;
  unlocks: BeatUnlocks;
  completion:
    | { kind: "loss_below"; threshold: number }
    | { kind: "dragged_both" }
    | { kind: "predicted_and_ran" }
    | { kind: "correct_choices"; needed: number }
    | { kind: "step_count"; needed: number }
    | { kind: "nudge_count"; needed: number }
    | { kind: "phase_count"; needed: number }
    | { kind: "predict_answered" }
    | { kind: "always" };
  /** Reset hiker to start when entering this beat? */
  resetOnEnter?: boolean;
  /** If set, override w_position when entering this beat. */
  startPosition?: { w0: number; w1: number };
};

// Center-ish dot in the dataset. Gives a clean error bar on screen.
// DATASET[4] = (study_hours=5, exam_score=90).
const FOCUS_DOT_INDEX = 4;

// Starting line for beat 4.5: slope ~10, intercept ~50. Gives a
// near-fit that's visibly off, so the focus dot has a clear error.
const BEAT45_START = { w0: 0.438, w1: 1.133 };

export const BEATS: Record<BeatId, Beat> = {
  "1": {
    id: "1",
    kicker: "Beat 1 - The hook",
    prompt: "Drag the line to fit the dots. Get the loss below 0.05.",
    reveal:
      "Nice. You did that with two numbers, slope and intercept. What if there were a million?",
    unlocks: { ...DEFAULT_UNLOCKS, showLine: true, lineDraggable: true },
    completion: { kind: "loss_below", threshold: 0.05 },
  },

  "2": {
    id: "2",
    kicker: "Beat 2 - The bowl appears",
    prompt:
      "Every point on this bowl is one possible line. Low = good fit. High = bad. Drag either side. They're the same thing.",
    reveal:
      "The bowl-position and the line-on-data are the same thing in two costumes. The bowl IS every possible line, mapped to its loss.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showLine: true,
      lineDraggable: true,
      showBowl: true,
      bowlDraggable: true,
    },
    completion: { kind: "dragged_both" },
  },

  "3": {
    id: "3",
    kicker: "Beat 3 - Blindfolded",
    prompt:
      "Now imagine you can't see the bowl. You only feel the slope under your feet. Which way do you walk?",
    reveal:
      "The slope you feel is the gradient. It points uphill, so you walk the other way. That's the entire algorithm: at every step, take the direction opposite the gradient.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showBowl: true,
      fogged: true,
      fogIntensityForCorrect: 0.22,
      showDirectionChoice: true,
      correctChoicesNeeded: 4,
    },
    completion: { kind: "correct_choices", needed: 4 },
    resetOnEnter: true,
  },

  "4": {
    id: "4",
    kicker: "Beat 4 - Watch it shrink",
    prompt: "Take a few steps. Watch the arrow.",
    reveal:
      "The arrow is the gradient. It shrinks as the ground flattens. At the bottom, there's no slope, so no step. That's how it knows when to stop.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showBowl: true,
      showStepOnce: true,
      showLrSlider: "locked-display",
      lrLockedAt: 0.08,
      showGradientArrow: true,
      showHikerTrail: true,
    },
    completion: { kind: "step_count", needed: 5 },
    resetOnEnter: true,
  },

  "4.5": {
    id: "4.5",
    kicker: "Beat 4.5 - One dot, one nudge",
    prompt: "Let's zoom in on one dot.",
    reveal:
      "One dot pulls the line one way. But we have ten dots, all pulling at once.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showHikerTrail: false,
      highlightDotIndex: FOCUS_DOT_INDEX,
      showMathStrip: true,
      mathStripBeat: "4.5",
    },
    completion: { kind: "nudge_count", needed: 3 },
    startPosition: BEAT45_START,
  },

  "5": {
    id: "5",
    kicker: "Beat 5 - Painfully small",
    prompt:
      "Each step is lr × gradient. lr is yours to set. Try it locked at 0.001. Click Step ×4 ten times.",
    reveal:
      "At lr = 0.001, you'd need ~340 more clicks to reach the bottom. Too small. The step size matters, which is what beat 6 is about to break.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showBowl: true,
      showStepFour: true,
      showLrSlider: "locked-display",
      lrLockedAt: 0.001,
      showProgressBar: true,
      showHikerTrail: true,
    },
    completion: { kind: "step_count", needed: 10 },
    resetOnEnter: true,
  },

  "6": {
    id: "6",
    kicker: "Beat 6 - The cliff",
    prompt:
      "Now try lr = 0.6. Predict first: does it (a) converge faster, (b) bounce around, (c) fly off?",
    reveal:
      "Not slower, different. A tiny bit too high doesn't make it worse, it makes it break. The cliff between 'works' and 'chaos' is sharper than it looks.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showBowl: true,
      showPredictPanel: true,
      showLrSlider: "locked-display",
      lrLockedAt: 0.6,
      showHikerTrail: true,
      autoRunOnPredict: true,
      shakeCameraOnDiverge: true,
    },
    completion: { kind: "predicted_and_ran" },
    resetOnEnter: true,
  },

  "4.6": {
    id: "4.6",
    kicker: "Beat 4.6 - Ten dots, one direction",
    prompt: "Each dot pulls the line. Let's see all ten pulls at once.",
    reveal:
      "That's the arrow you've been seeing on the bowl. Two numbers telling the algorithm: 'shift this much, tilt this much.'",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showMathStrip: true,
      mathStripBeat: "4.6",
      showAllPullArrows: true,
      boldErrorBars: true,
      showGradientArrow: true,
    },
    completion: { kind: "phase_count", needed: 3 },
    startPosition: BEAT45_START,
  },

  "4.7": {
    id: "4.7",
    kicker: "Beat 4.7 - The full step, built piece by piece",
    prompt: "Now we know which way to move. How do we actually take a step?",
    reveal:
      "That's the whole algorithm. w_new = w − lr × gradient. Three things you already know: your position, the pull from the data, and how big a step to take.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showBowl: true,
      bowlDraggable: false,
      showMathStrip: true,
      mathStripBeat: "4.7",
      showGradientArrow: true,
      hikerGlow: true,
    },
    completion: { kind: "phase_count", needed: 3 },
    startPosition: BEAT45_START,
  },

  "4.8": {
    id: "4.8",
    kicker: "Beat 4.8 - Why steps shrink",
    prompt: "Remember how the steps got smaller near the bottom? Now you can see why.",
    reveal:
      "It doesn't stop. There's just nothing to subtract. When the gradient is zero, w − lr × 0 = w. You stay put forever. That's how the algorithm knows it's done.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showLine: true,
      lineDraggable: false,
      showBowl: true,
      bowlDraggable: false,
      showMathStrip: true,
      mathStripBeat: "4.8",
      showGradientArrow: true,
      boldErrorBars: true,
      showHikerTrail: true,
    },
    completion: { kind: "predict_answered" },
    startPosition: BEAT45_START,
  },

  "7": {
    id: "7",
    kicker: "Beat 7 - Where the bowl came from",
    prompt:
      "Force the line through the origin (b = 0). Slide m. Every position plots a dot at (m, total error). Watch the curve appear.",
    reveal:
      "Two knobs, two floor axes. The 2D parabola became a 3D bowl - same idea, one extra dimension because one extra parameter. From here on we'll call them 'w' (weight, the slope) and 'b' (bias, the intercept) - the names you'll see in every neural network.",
    unlocks: {
      ...DEFAULT_UNLOCKS,
      showLine: true,
      lineDraggable: false,
      showWeightSliders: true,
      showParabola: true,
      // Phase 2 unlocks the bowl + b slider via progress.phase, handled
      // in BeatJourney. Default unlocks here are phase-1 state.
    },
    completion: { kind: "phase_count", needed: 2 },
    resetOnEnter: true,
  },

  "8": {
    id: "8",
    kicker: "Beat 8 - This is the code",
    prompt:
      "Every step you took with the hiker is one iteration of this loop. Read the code. You'll recognize every line.",
    reveal:
      "That's it. That's the entire algorithm. Same loop trains ChatGPT - just bigger arrays. There's no other trick.",
    unlocks: {
      // Beat 8 is the capstone: no widgets render. The lab area swaps to
      // a long-form code + recap view (LabCapstone) inside BeatJourney.
      ...DEFAULT_UNLOCKS,
    },
    completion: { kind: "always" },
  },
};

export const BEAT_ORDER: BeatId[] = [
  "1",
  "2",
  "3",
  "4",
  "4.5",
  "4.6",
  "4.7",
  "4.8",
  "5",
  "6",
  "7",
  "8",
];

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

export const HIKER_START: { w0: number; w1: number } = { w0: -1.4, w1: -1.2 };

// The chosen "focus" dot used by 4.5 / 4.6 single-dot pedagogy.
// Index into the DATASET array.
export const FOCUS_DOT = FOCUS_DOT_INDEX;
