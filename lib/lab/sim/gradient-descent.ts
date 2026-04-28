// Real gradient descent on a real toy dataset. No animation, no UI — pure
// math. The Lab page wires this up via channels so sliders can drive it.
//
// Model:  y_hat = w0 + w1 * x          (slope=w1, intercept=w0)
// Loss:   MSE = mean((y_hat - y)^2)
// Grads:  dL/dw0 = 2 * mean(y_hat - y)
//         dL/dw1 = 2 * mean((y_hat - y) * x)
//
// Dataset is "study hours vs exam score" — the same shape as Session 4's
// drag-the-line activity, picked so the cost surface has a clear single
// minimum that the hiker can visibly walk to.

export type Point = readonly [number, number];

// Real-feeling fake data with a true line of y ≈ 8x + 50 + noise.
// Curated so the convex bowl has a minimum near (w0=50, w1=8) and the
// learning-rate sweet spot lands roughly between 0.01 and 0.1.
export const DATASET: ReadonlyArray<Point> = [
  [1, 58], [2, 65], [3, 73], [4, 82], [5, 90],
  [6, 98], [7, 107], [8, 113], [9, 122], [10, 131],
];

// Normalize x so gradient descent isn't pathological — Session 7 will
// teach feature scaling formally; for the Session 6 vis we want the
// landscape to be friendly.
const xs = DATASET.map(([x]) => x);
const ys = DATASET.map(([, y]) => y);
const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
const xStd = Math.sqrt(xs.reduce((a, b) => a + (b - xMean) ** 2, 0) / xs.length);
const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
const yStd = Math.sqrt(ys.reduce((a, b) => a + (b - yMean) ** 2, 0) / ys.length);

const xn = xs.map((x) => (x - xMean) / xStd);
const yn = ys.map((y) => (y - yMean) / yStd);

export function loss(w0: number, w1: number): number {
  let s = 0;
  for (let i = 0; i < xn.length; i++) {
    const e = w0 + w1 * xn[i] - yn[i];
    s += e * e;
  }
  return s / xn.length;
}

export function gradient(w0: number, w1: number): [number, number] {
  let g0 = 0;
  let g1 = 0;
  for (let i = 0; i < xn.length; i++) {
    const e = w0 + w1 * xn[i] - yn[i];
    g0 += 2 * e;
    g1 += 2 * e * xn[i];
  }
  return [g0 / xn.length, g1 / xn.length];
}

export type SimState = {
  w0: number;
  w1: number;
  step: number;
  lr: number;
  history: { w0: number; w1: number; loss: number }[];
  status: "idle" | "running" | "converged" | "diverged" | "max_steps";
};

const CONVERGE_THRESHOLD = 1e-4; // Δloss between consecutive steps
const DIVERGE_LOSS = 1e6;

export function initialState(lr = 0.08): SimState {
  // Start at a deliberately bad guess so the descent has somewhere to go.
  // (-1.4, -1.2) lives well up the bowl wall.
  const w0 = -1.4;
  const w1 = -1.2;
  return {
    w0,
    w1,
    lr,
    step: 0,
    history: [{ w0, w1, loss: loss(w0, w1) }],
    status: "idle",
  };
}

export function stepOnce(s: SimState): SimState {
  if (s.status === "converged" || s.status === "diverged") return s;
  const [g0, g1] = gradient(s.w0, s.w1);
  const w0 = s.w0 - s.lr * g0;
  const w1 = s.w1 - s.lr * g1;
  const L = loss(w0, w1);
  const step = s.step + 1;

  // Status detection
  let status: SimState["status"] = "running";
  if (!isFinite(L) || L > DIVERGE_LOSS) status = "diverged";
  else {
    const prevLoss = s.history[s.history.length - 1].loss;
    if (Math.abs(prevLoss - L) < CONVERGE_THRESHOLD && step > 1) status = "converged";
  }

  return {
    ...s,
    w0,
    w1,
    step,
    history: [...s.history, { w0, w1, loss: L }],
    status,
  };
}

export function stepN(s: SimState, n: number): SimState {
  let cur = s;
  for (let i = 0; i < n; i++) {
    if (cur.status === "converged" || cur.status === "diverged") break;
    cur = stepOnce(cur);
  }
  return cur;
}

// True optimum (analytic) — used by the challenge checker to verify
// "did the student actually converge" rather than just "did Δ get small".
export const TRUE_W0 = 0;
export const TRUE_W1 = 1; // because we standardized x and y; in standardized
                          // coords the best line is y_n = x_n.

export function distanceToOptimum(w0: number, w1: number): number {
  return Math.hypot(w0 - TRUE_W0, w1 - TRUE_W1);
}
