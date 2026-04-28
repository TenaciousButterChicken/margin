// Neural Net Playground — math core.
//
// Ported from tensorflow/playground/src/nn.ts in spirit (Apache 2.0).
// Supports two modes:
//   • classification — 2 inputs, tanh output, ±1 labels (existing)
//   • regression     — 1 input,  linear output, real-valued targets
//
// Loss: 0.5 * (output - target)² in both modes. With tanh output and
// ±1 labels, that's the standard binary squared-error setup. With linear
// output and real targets, that's plain MSE.

export type ActivationKind = "tanh" | "relu" | "sigmoid";
export type OutputKind = "tanh" | "linear";

export type ClassificationDatasetKind = "clusters" | "circles" | "spirals" | "xor";
export type RegressionDatasetKind = "sine" | "step" | "sawtooth" | "bump";

export interface Activation {
  output: (x: number) => number;
  derivative: (x: number) => number;
}

export const ACTIVATIONS: Record<ActivationKind, Activation> = {
  tanh: {
    output: (x) => Math.tanh(x),
    derivative: (x) => {
      const t = Math.tanh(x);
      return 1 - t * t;
    },
  },
  relu: {
    output: (x) => (x > 0 ? x : 0),
    derivative: (x) => (x > 0 ? 1 : 0),
  },
  sigmoid: {
    output: (x) => 1 / (1 + Math.exp(-x)),
    derivative: (x) => {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    },
  },
};

const LINEAR: Activation = {
  output: (x) => x,
  derivative: () => 1,
};

function outputActivation(kind: OutputKind): Activation {
  return kind === "linear" ? LINEAR : ACTIVATIONS.tanh;
}

/* -------- Data point types ------------------------------------------ */

export interface ClassificationPoint {
  x: number;
  y: number;
  label: -1 | 1;
}

export interface RegressionPoint {
  x: number;
  y: number;
}

/** Unified shape the Network sees during training. */
export interface NetSample {
  input: number[];
  target: number;
}

export function classificationToSamples(pts: ClassificationPoint[]): NetSample[] {
  return pts.map((p) => ({ input: [p.x, p.y], target: p.label }));
}

export function regressionToSamples(pts: RegressionPoint[]): NetSample[] {
  return pts.map((p) => ({ input: [p.x], target: p.y }));
}

/* -------- Neuron + Network ------------------------------------------ */

export class Neuron {
  bias: number;
  biasGrad = 0;
  weights: number[];
  weightGrads: number[];
  totalInput = 0;
  output = 0;
  outputDer = 0;

  constructor(numInputs: number) {
    this.bias = (Math.random() - 0.5) * 0.2;
    this.weights = new Array(numInputs);
    this.weightGrads = new Array(numInputs).fill(0);
    for (let i = 0; i < numInputs; i++) {
      this.weights[i] = (Math.random() - 0.5) * 1.0;
    }
  }
}

export interface NetworkOptions {
  numInputs?: number; // default 2
  outputKind?: OutputKind; // default "tanh"
}

export class Network {
  layers: Neuron[][] = [];
  inputs: number[] = [];
  hiddenSizes: number[];
  numInputs: number;
  outputKind: OutputKind;
  activation: Activation;

  constructor(
    hiddenSizes: number[],
    activationKind: ActivationKind,
    opts: NetworkOptions = {}
  ) {
    this.hiddenSizes = hiddenSizes;
    this.numInputs = opts.numInputs ?? 2;
    this.outputKind = opts.outputKind ?? "tanh";
    this.activation = ACTIVATIONS[activationKind];
    this.build();
  }

  setActivation(kind: ActivationKind) {
    this.activation = ACTIVATIONS[kind];
  }

  build() {
    const sizes = [this.numInputs, ...this.hiddenSizes, 1];
    this.layers = [];
    for (let l = 1; l < sizes.length; l++) {
      const prevSize = sizes[l - 1];
      const layer: Neuron[] = [];
      for (let n = 0; n < sizes[l]; n++) {
        layer.push(new Neuron(prevSize));
      }
      this.layers.push(layer);
    }
  }

  forward(input: number[]): number {
    if (input.length !== this.numInputs) {
      throw new Error(
        `Network expects ${this.numInputs} inputs, got ${input.length}`
      );
    }
    this.inputs = input.slice();
    let prev: number[] = input.slice();
    const outAct = outputActivation(this.outputKind);
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const isOutput = l === this.layers.length - 1;
      const act = isOutput ? outAct : this.activation;
      const next: number[] = new Array(layer.length);
      for (let n = 0; n < layer.length; n++) {
        const neuron = layer[n];
        let z = neuron.bias;
        for (let i = 0; i < prev.length; i++) {
          z += neuron.weights[i] * prev[i];
        }
        neuron.totalInput = z;
        neuron.output = act.output(z);
        next[n] = neuron.output;
      }
      prev = next;
    }
    return prev[0];
  }

  backward(target: number) {
    for (const layer of this.layers) {
      for (const n of layer) n.outputDer = 0;
    }
    const outNeuron = this.layers[this.layers.length - 1][0];
    outNeuron.outputDer = outNeuron.output - target;

    const outAct = outputActivation(this.outputKind);
    for (let l = this.layers.length - 1; l >= 0; l--) {
      const layer = this.layers[l];
      const isOutput = l === this.layers.length - 1;
      const act = isOutput ? outAct : this.activation;
      const prevValues: number[] =
        l === 0 ? this.inputs.slice() : this.layers[l - 1].map((n) => n.output);

      for (const neuron of layer) {
        const dLdz = neuron.outputDer * act.derivative(neuron.totalInput);
        for (let i = 0; i < neuron.weights.length; i++) {
          neuron.weightGrads[i] += dLdz * prevValues[i];
        }
        neuron.biasGrad += dLdz;
        if (l > 0) {
          const prevLayer = this.layers[l - 1];
          for (let i = 0; i < neuron.weights.length; i++) {
            prevLayer[i].outputDer += dLdz * neuron.weights[i];
          }
        }
      }
    }
  }

  zeroGradients() {
    for (const layer of this.layers) {
      for (const n of layer) {
        n.biasGrad = 0;
        for (let i = 0; i < n.weightGrads.length; i++) n.weightGrads[i] = 0;
      }
    }
  }

  applyGradients(lr: number, batchSize: number) {
    for (const layer of this.layers) {
      for (const n of layer) {
        n.bias -= (lr * n.biasGrad) / batchSize;
        for (let i = 0; i < n.weights.length; i++) {
          n.weights[i] -= (lr * n.weightGrads[i]) / batchSize;
        }
      }
    }
  }

  train(batch: NetSample[], lr: number) {
    this.zeroGradients();
    for (const s of batch) {
      this.forward(s.input);
      this.backward(s.target);
    }
    this.applyGradients(lr, batch.length);
  }
}

/* -------- Loss ------------------------------------------------------ */

export function loss(net: Network, samples: NetSample[]): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) {
    const out = net.forward(s.input);
    const e = out - s.target;
    sum += 0.5 * e * e;
  }
  return sum / samples.length;
}

export function sampleBatch<T>(data: T[], size: number): T[] {
  const batch: T[] = [];
  for (let i = 0; i < size; i++) {
    batch.push(data[Math.floor(Math.random() * data.length)]);
  }
  return batch;
}

/* -------- Classification datasets (2D) ------------------------------- */

const DEFAULT_POINTS = 200;
const CLASSIFICATION_DOMAIN = 6;

function jitter(scale: number = 0.4): number {
  return (Math.random() - 0.5) * scale;
}

export function generateClassificationDataset(
  kind: ClassificationDatasetKind,
  n: number = DEFAULT_POINTS
): ClassificationPoint[] {
  switch (kind) {
    case "clusters":
      return clustersDataset(n);
    case "circles":
      return circlesDataset(n);
    case "spirals":
      return spiralsDataset(n);
    case "xor":
      return xorDataset(n);
  }
}

function clustersDataset(n: number): ClassificationPoint[] {
  const points: ClassificationPoint[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    points.push({ x: 2.5 + jitter(1.0), y: 2.5 + jitter(1.0), label: 1 });
  }
  for (let i = 0; i < half; i++) {
    points.push({ x: -2.5 + jitter(1.0), y: -2.5 + jitter(1.0), label: -1 });
  }
  return points;
}

function circlesDataset(n: number): ClassificationPoint[] {
  const points: ClassificationPoint[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const r = Math.random() * 2.0;
    const t = Math.random() * 2 * Math.PI;
    points.push({ x: r * Math.cos(t) + jitter(), y: r * Math.sin(t) + jitter(), label: 1 });
  }
  for (let i = 0; i < half; i++) {
    const r = 3.5 + Math.random() * 1.5;
    const t = Math.random() * 2 * Math.PI;
    points.push({ x: r * Math.cos(t) + jitter(), y: r * Math.sin(t) + jitter(), label: -1 });
  }
  return points;
}

function spiralsDataset(n: number): ClassificationPoint[] {
  const points: ClassificationPoint[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const t = (i / half) * 2 * Math.PI * 1.75;
    const r = (i / half) * 5;
    points.push({ x: r * Math.sin(t) + jitter(), y: r * Math.cos(t) + jitter(), label: 1 });
    points.push({ x: -r * Math.sin(t) + jitter(), y: -r * Math.cos(t) + jitter(), label: -1 });
  }
  return points;
}

function xorDataset(n: number): ClassificationPoint[] {
  const points: ClassificationPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const sx = x > 0 ? 0.5 : -0.5;
    const sy = y > 0 ? 0.5 : -0.5;
    const label: -1 | 1 = x * y > 0 ? 1 : -1;
    points.push({ x: x + sx + jitter(), y: y + sy + jitter(), label });
  }
  return points;
}

/* -------- Regression datasets (1D) ----------------------------------- */

const REGRESSION_DOMAIN = 2; // x ∈ [-2, 2]
const REGRESSION_POINTS = 70;

export function generateRegressionDataset(
  kind: RegressionDatasetKind,
  n: number = REGRESSION_POINTS
): RegressionPoint[] {
  switch (kind) {
    case "sine":
      return sineDataset(n);
    case "step":
      return stepDataset(n);
    case "sawtooth":
      return sawtoothDataset(n);
    case "bump":
      return bumpDataset(n);
  }
}

function sineDataset(n: number): RegressionPoint[] {
  const points: RegressionPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = -REGRESSION_DOMAIN + (i / (n - 1)) * 2 * REGRESSION_DOMAIN;
    const y = Math.sin(Math.PI * x) + (Math.random() - 0.5) * 0.12;
    points.push({ x, y });
  }
  return points;
}

function stepDataset(n: number): RegressionPoint[] {
  const points: RegressionPoint[] = [];
  for (let i = 0; i < n; i++) {
    // sample slightly off the grid so multiple points sit near the cliff
    const x = -REGRESSION_DOMAIN + (i / (n - 1)) * 2 * REGRESSION_DOMAIN + (Math.random() - 0.5) * 0.05;
    const y = x < 0 ? 0 : 1;
    points.push({ x, y });
  }
  return points;
}

function sawtoothDataset(n: number): RegressionPoint[] {
  const points: RegressionPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = -REGRESSION_DOMAIN + (i / (n - 1)) * 2 * REGRESSION_DOMAIN;
    // Period 1, ranges [0, 1)
    const phase = x + REGRESSION_DOMAIN; // shift so x = -2 → phase 0
    const y = phase - Math.floor(phase);
    points.push({ x, y });
  }
  return points;
}

function bumpDataset(n: number): RegressionPoint[] {
  const points: RegressionPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = -REGRESSION_DOMAIN + (i / (n - 1)) * 2 * REGRESSION_DOMAIN;
    const y = Math.exp(-(x * x) * 2) + (Math.random() - 0.5) * 0.04;
    points.push({ x, y });
  }
  return points;
}

/* -------- Constants ------------------------------------------------- */

export const INPUT_DOMAIN = CLASSIFICATION_DOMAIN; // back-compat
export const CLASSIFICATION_INPUT_DOMAIN = CLASSIFICATION_DOMAIN;
export const REGRESSION_INPUT_DOMAIN = REGRESSION_DOMAIN;
export const REGRESSION_Y_DOMAIN: [number, number] = [-1.5, 1.5];
